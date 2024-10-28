import * as supabase from "@supabase/supabase-js";
import { success, error } from "../utils";
// Import from shared libs instead of local libs
import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { InstagramAPIToken } from "@/src/libs/instagram/types";
import { Database } from "@/types/db";
import { ContentItemMetadata, ContentMetadata } from "@/src/consts/content";

export const handler = async (event: any) => {
  try {
    const { contentId, contentPath } = event;
    console.log("Publishing content", { contentId, contentPath });

    if (!contentId) {
      return error(`contentId missing in body`, 400);
    }
    if (!contentPath) {
      // Content key tells us where to find the content in storage.
      return error(`contentPath missing in body`, 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const r2 = new R2Storage(
      process.env.R2_ACCOUNT_ID!,
      process.env.R2_ACCESS_KEY_ID!,
      process.env.R2_SECRET_ACCESS_KEY!,
    );
    const sbClient = supabase.createClient<Database>(supabaseUrl, supabaseKey);

    const { data: content, error: getContentErr } = await sbClient
      .from("content")
      .select("*, destination:destinations(*), content_items:content_items(*)")
      .eq("id", contentId)
      .single();
    if (getContentErr) {
      throw new Error(getContentErr.message);
    }
    console.log("Content fetched", content);

    switch (content.destination?.type) {
      case "Instagram":
        if (!content.destination?.linked_ig_user_id) {
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
            lastRefreshedAt: new Date(content.destination.token_last_refreshed_at ?? ""),
          },
          async (token: InstagramAPIToken) => {
            await sbClient
              .from("destinations")
              .update({
                long_lived_token: token.accessToken,
                token_last_refreshed_at: token.lastRefreshedAt.toISOString(),
              })
              .eq("id", content.destination?.id ?? "");
          },
        );

        const toPublish = [];
        if (content.content_items.length === 0) {
          console.log(`No content to publish for content id: ${contentId}`);
          return success({ message: "No content to publish" });
        }

        const sortedContentItems = content.content_items.sort(
          (a: any, b: any) => a.position - b.position,
        );
        for (const item of sortedContentItems) {
          const signedUrl = await r2.signUrl(
            getBucketName("scheduled-content"),
            `${contentPath}/${item.id}`,
          );
          toPublish.push({
            url: signedUrl,
            tags: (item.metadata as ContentItemMetadata)?.ig_tags ?? [],
          });
        }

        console.log("Content to publish", toPublish);
        let publishedMediaIds = [];
        switch (content.type) {
          case "Instagram Post":
            if (toPublish.length > 1) {
              const resp = await igClient.publishCarouselPost(
                content.destination.linked_ig_user_id,
                toPublish.map(({ url, tags }) => ({
                  imageUrl: url,
                  userTags: tags,
                })),
                {
                  caption: (content.metadata as ContentMetadata)?.ig_caption,
                },
              );
              if (!resp.id) {
                throw new Error(
                  `Failed to publish carousel post for content ${contentId} - no ID returned: ${JSON.stringify(
                    resp,
                  )}`,
                );
              }
              publishedMediaIds.push(resp.id);
            } else {
              const resp = await igClient.publishPost(content.destination.linked_ig_user_id, {
                imageUrl: toPublish[0].url,
                userTags: toPublish[0].tags,
                caption: (content.metadata as ContentMetadata)?.ig_caption,
              });
              if (!resp.id) {
                throw new Error(
                  `Failed to publish post for content ${contentId} - no ID returned: ${JSON.stringify(
                    resp,
                  )}`,
                );
              }
              publishedMediaIds.push(resp.id);
            }
            break;
          case "Instagram Story":
            for (const media of toPublish) {
              const resp = await igClient.publishStory(content.destination.linked_ig_user_id, {
                imageUrl: media.url,
              });
              if (!resp.id) {
                throw new Error(
                  `Failed to publish story for content ${contentId} - no ID returned: ${JSON.stringify(
                    resp,
                  )}`,
                );
              }
              publishedMediaIds.push(resp.id);
            }
            break;
          default:
            throw new Error(`Unsupported content type: ${content.type}`);
        }

        await Promise.all(
          publishedMediaIds.map(async (id) => {
            const media = await igClient.getInstagramMedia(id);

            const { data, error: insertErr } = await sbClient.from("published_content").insert({
              content_id: contentId,
              owner_id: content.destination?.owner_id ?? "",
              ig_media_id: id,
              ig_media_url: media.media_url,
              ig_permalink: media.permalink,
              published_at: new Date().toISOString(),
            });
            if (insertErr) {
              throw new Error(
                `Failed to insert published content for content ${contentId}: ${insertErr.message}`,
              );
            }
            return data;
          }),
        );
        console.log("Published media ids", publishedMediaIds);
        break;
      default:
        throw new Error(`Destination type ${content.destination?.type ?? ""} not supported`);
    }

    return success({ message: `Content ${content.id} published successfully` });
  } catch (err: any) {
    console.log(err);
    return error(err.message, 500);
  }
};
