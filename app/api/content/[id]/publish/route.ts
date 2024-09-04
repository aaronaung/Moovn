import { DestinationTypes } from "@/src/consts/destinations";
import { BUCKETS } from "@/src/consts/storage";
import { supaServerClient } from "@/src/data/clients/server";
import { getContentById } from "@/src/data/content";

import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";
import { signUrl } from "@/src/libs/storage";
import { NextRequest } from "next/server";
import { getTemplatesForContent } from "@/src/data/templates";
import { z } from "zod";
import { ContentType } from "@/src/consts/content";

const PublishContentRequestSchema = z.object({
  instagramTags: z
    .record(z.string(), z.array(z.object({ x: z.number(), y: z.number(), username: z.string() })))
    .optional(), // template id -> [{x, y, username}]
  caption: z.string().optional(),
});
export type PublishContentRequest = z.infer<typeof PublishContentRequestSchema>;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { instagramTags, caption } = PublishContentRequestSchema.parse(await req.json());
  const content = await getContentById(params.id, {
    client: supaServerClient(),
  });

  if (!content) {
    return Response.json({ message: "Content not found" }, { status: 404 });
  }
  if (!content.destination) {
    return Response.json({ message: "Content does not have a destination" }, { status: 400 });
  }

  // These templates are ordered by position in ascending order. This ensures that
  // the carousel contents are in the correct order.
  const templates = await getTemplatesForContent(
    {
      contentId: content.id,
      contentType: content.type,
    },
    {
      client: supaServerClient(),
    },
  );
  if (templates.length === 0) {
    return Response.json(
      { message: "Content does not contain any designs to publish" },
      { status: 400 },
    );
  }

  switch (content.destination.type) {
    case DestinationTypes.Instagram:
      if (!content.destination.linked_ig_user_id) {
        return Response.json(
          { message: "Destination not connected: missing linked IG user ID" },
          { status: 400 },
        );
      }
      if (!content.destination.long_lived_token) {
        return Response.json(
          { message: "Destination not connected: missing access token" },
          { status: 400 },
        );
      }

      const igClient = new InstagramAPIClient(
        {
          accessToken: content.destination.long_lived_token,
          lastRefreshedAt: new Date(content.destination.token_last_refreshed_at ?? 0),
        },
        async (token) => {
          await supaServerClient()
            .from("destinations")
            .update({
              long_lived_token: token.accessToken,
              token_last_refreshed_at: token.lastRefreshedAt.toISOString(),
            })
            .eq("id", content.destination_id);
        },
      );
      try {
        const toPublish = await Promise.all(
          templates.map(async (template) => {
            const signedUrl = await signUrl({
              bucket: BUCKETS.stagingAreaForContentPublishing,
              objectPath: `${content.owner_id}/${content.id}/${template.id}.jpg`,
              client: supaServerClient(),
              expiresIn: 24 * 3600,
            });

            return {
              url: signedUrl,
              ...(instagramTags?.[template.id]
                ? { instagramTags: instagramTags[template.id] }
                : {}),
            };
          }),
        );
        if (toPublish.length === 0) {
          return Response.json({ message: "Failed to fetch designs" }, { status: 500 });
        }

        let publishedMediaIds = [];
        switch (content.type) {
          case ContentType.InstagramPost:
            if (toPublish.length > 1) {
              const resp = await igClient.publishCarouselPost(
                content.destination.linked_ig_user_id,
                toPublish.map(({ url, instagramTags }) => ({
                  imageUrl: url,
                  userTags: instagramTags,
                })),
                {
                  caption,
                },
              );
              if (!resp.id) {
                console.error(`Failed to publish carousel post ${content.id}, resp`);
                return Response.json(
                  { message: "Failed to publish carousel post" },
                  { status: 500 },
                );
              }
              publishedMediaIds.push(resp.id);
            } else {
              const resp = await igClient.publishPost(content.destination.linked_ig_user_id, {
                imageUrl: toPublish[0].url,
                userTags: toPublish[0].instagramTags,
                caption,
              });
              if (!resp.id) {
                console.error(`Failed to publish post ${content.id}, resp`);
                return Response.json({ message: "Failed to publish post" }, { status: 500 });
              }
              publishedMediaIds.push(resp.id);
            }
            break;
          case ContentType.InstagramStory:
            if (toPublish.length > 1) {
              for (const media of toPublish) {
                const resp = await igClient.publishStory(content.destination.linked_ig_user_id, {
                  imageUrl: media.url,
                });
                if (!resp.id) {
                  console.error(`Failed to publish story ${content.id}, resp`);
                  return Response.json({ message: "Failed to publish story" }, { status: 500 });
                }
                publishedMediaIds.push(resp.id);
              }
            } else {
              const resp = await igClient.publishStory(content.destination.linked_ig_user_id, {
                imageUrl: toPublish[0].url,
              });
              if (!resp.id) {
                console.error(`Failed to publish story ${content.id}, resp`);
                return Response.json({ message: "Failed to publish story" }, { status: 500 });
              }
              publishedMediaIds.push(resp.id);
            }
            break;
          default:
            return Response.json(
              { message: `Content type ${content.type} not supported` },
              { status: 400 },
            );
        }

        await Promise.all(
          publishedMediaIds.map((id) =>
            supaServerClient().from("published_content").insert({
              owner_id: content.owner_id,
              content_id: content.id,
              ig_media_id: id,
              published_at: new Date().toISOString(),
            }),
          ),
        );
        return Response.json({ id: content.id });
      } catch (err: any) {
        console.error(err);
        return Response.json(
          { message: `Failed to publish content: ${err.message}` },
          { status: 500 },
        );
      }
    default:
      return Response.json(
        { message: `Destination type ${content.destination.type} not supported` },
        { status: 400 },
      );
  }
}
