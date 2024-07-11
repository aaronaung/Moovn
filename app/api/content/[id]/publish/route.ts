import { DestinationTypes } from "@/src/consts/destinations";
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { supaServerClient } from "@/src/data/clients/server";
import { getContentById } from "@/src/data/content";

import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";
import { renderCaption } from "@/src/libs/content";
import { signUrl } from "@/src/libs/storage";
import { NextRequest } from "next/server";
import { getTemplatesForContent } from "@/src/data/templates";
import { getSourceSchedule } from "@/app/api/sources/[id]/schedules/route";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const templates = await getTemplatesForContent(content.id, {
    client: supaServerClient(),
  });
  if (templates.length === 0) {
    return Response.json(
      { message: "Content does not contain any designs to publish" },
      { status: 400 },
    );
  }

  const scheduleData = await getSourceSchedule(
    content.source_id,
    content.source_data_view as SourceDataView,
  );
  if (!scheduleData) {
    return Response.json(
      { message: `Failed to fetch schedule data for source ${content.source_id}` },
      { status: 500 },
    );
  }

  switch (content.destination.type) {
    case DestinationTypes.INSTAGRAM:
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

      const fbClient = new FacebookGraphAPIClient({
        accessToken: content.destination.long_lived_token,
        lastRefreshedAt: new Date(content.destination.token_last_refreshed_at ?? 0),
      });

      try {
        const signedLatestDesignUrls = await Promise.all(
          templates.map((template) => {
            return signUrl({
              bucket: BUCKETS.stagingAreaForContentPublishing,
              objectPath: `${content.owner_id}/${content.id}/${template.id}.jpeg`,
              client: supaServerClient(),
              expiresIn: 24 * 3600,
            });
          }),
        );
        if (signedLatestDesignUrls.length === 0) {
          return Response.json({ message: "Failed to fetch designs" }, { status: 500 });
        }

        let publishedMedia: Awaited<
          | ReturnType<FacebookGraphAPIClient["publishSingle"]>
          | ReturnType<FacebookGraphAPIClient["publishCarousel"]>
        >;
        const caption = content.caption
          ? renderCaption(content.caption, scheduleData as any)
          : undefined;
        if (signedLatestDesignUrls.length > 1) {
          publishedMedia = await fbClient.publishCarousel(
            content.destination.linked_ig_user_id,
            signedLatestDesignUrls.map((url) => ({
              imageUrl: url,
            })),
            {
              caption,
            },
          );
        } else {
          publishedMedia = await fbClient.publishSingle(content.destination.linked_ig_user_id, {
            imageUrl: signedLatestDesignUrls[0],
            caption,
          });
        }
        console.log("Published media", publishedMedia);
        await supaServerClient().from("published_content").insert({
          destination_id: content.destination.id,
          owner_id: content.owner_id,
          content_id: content.id,
          ig_media_id: publishedMedia.id,
          published_at: new Date().toISOString(),
        });
        return Response.json({ id: content.id });
      } catch (err: any) {
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
