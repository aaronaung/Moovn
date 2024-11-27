import * as supabase from "@supabase/supabase-js";
import { success, error } from "../utils";
// Import from shared libs instead of local libs
import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { getBucketName } from "@/src/libs/r2/r2-buckets";
import { CreateMediaContainerInput, InstagramAPIToken } from "@/src/libs/instagram/types";
import { Database } from "@/types/db";
import { ContentItemMetadata, ContentItemType, ContentMetadata } from "@/src/consts/content";
import { log } from "@/src/libs/logger";
import { InstagramTag } from "@/src/libs/designs/photopea/utils";
import { IgPublishResult, ContentPublishStatus } from "@/src/consts/destinations";

type PublishableIgMedia = {
  url: string;
  mimeType: string;
  tags: InstagramTag[];
};

export const handler = async (event: any) => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sbClient = supabase.createClient<Database>(supabaseUrl, supabaseKey);

  try {
    const { contentId, contentPath } = event;
    log.info("Starting content publish", { contentId, contentPath });

    if (!contentId) {
      return error(`contentId missing in body`, 400);
    }
    if (!contentPath) {
      // Content key tells us where to find the content in storage.
      return error(`contentPath missing in body`, 400);
    }

    const r2 = new R2Storage(
      process.env.R2_ACCOUNT_ID!,
      process.env.R2_ACCESS_KEY_ID!,
      process.env.R2_SECRET_ACCESS_KEY!,
    );

    const { data: content, error: getContentErr } = await sbClient
      .from("content")
      .select("*, destination:destinations(*), content_items:content_items(*)")
      .eq("id", contentId)
      .single();
    if (getContentErr) {
      throw new Error(getContentErr.message);
    }
    log.info("Content fetched successfully", {
      content,
    });

    switch (content.destination?.type) {
      case "Instagram":
        if (!content.destination?.linked_ig_user_id) {
          throw new Error("Instagram account not connected - missing user ID");
        }
        if (!content.destination.long_lived_token) {
          throw new Error("Instagram account not connected - missing access token");
        }

        const igClient = new InstagramAPIClient(
          {
            long_lived_access_token: content.destination.long_lived_token,
            last_refreshed_at: new Date(content.destination.token_last_refreshed_at ?? ""),
          },
          async (token: InstagramAPIToken) => {
            await sbClient
              .from("destinations")
              .update({
                long_lived_token: token.long_lived_access_token,
                token_last_refreshed_at: token.last_refreshed_at.toISOString(),
              })
              .eq("id", content.destination?.id ?? "");
          },
        );

        const toPublish = [];
        if (content.content_items.length === 0) {
          throw new Error("No content items found to publish");
        }
        const sortedContentItems = content.content_items.sort(
          (a: any, b: any) => a.position - b.position,
        );
        for (const item of sortedContentItems) {
          const itemMetadata = item.metadata as ContentItemMetadata;
          const signedUrl = await r2.signUrl(
            getBucketName("scheduled-content"),
            `${contentPath}/${item.id}`,
          );
          if (
            item.type === ContentItemType.DriveFile &&
            !itemMetadata.mime_type?.startsWith("image") &&
            !itemMetadata.mime_type?.startsWith("video")
          ) {
            continue;
          }
          toPublish.push({
            url: signedUrl,
            mimeType: itemMetadata.mime_type ?? "image/jpeg", // Default to jpeg if mime type is not set
            tags: itemMetadata.ig_tags ?? [],
          });
        }

        log.info("Content to publish", { toPublish });
        let publishedMediaIds = [];
        const caption = (content.metadata as ContentMetadata)?.ig_caption;
        const igUserId = content.destination.linked_ig_user_id;
        switch (content.type) {
          case "Instagram Post":
            if (toPublish.length > 1) {
              const resp = await igClient.publishCarouselPost(
                igUserId,
                toPublish.map((media) => ({
                  ...toCreateMediaContainerInput(media),
                  is_carousel_item: true,
                })),
                {
                  caption,
                },
              );
              publishedMediaIds.push(resp.id);
            } else {
              const resp = await igClient.publishPost(igUserId, {
                ...toCreateMediaContainerInput(toPublish[0]),
                caption,
              });
              publishedMediaIds.push(resp.id);
            }
            break;
          case "Instagram Story":
            for (const media of toPublish) {
              const resp = await igClient.publishStory(
                igUserId,
                toCreateMediaContainerInput(media),
              );
              publishedMediaIds.push(resp.id);
            }
            break;
          default:
            throw new Error(`Unsupported content type: ${content.type}`);
        }

        await Promise.all(
          publishedMediaIds.map(async (id) => {
            const media = await igClient.getInstagramMedia(id);
            const publishResult: IgPublishResult = {
              ig_media_id: id,
              ig_media_url: media.media_url,
              ig_permalink: media.permalink,
            };
            const { data, error: insertErr } = await sbClient
              .from("content_schedules")
              .update({
                status: ContentPublishStatus.Published,
                published_at: new Date().toISOString(),
                result: publishResult,
              })
              .eq("content_id", content.id);
            if (insertErr) {
              throw new Error(
                `Failed to update content schedule after publishing: ${insertErr.message}`,
              );
            }
            return data;
          }),
        );
        log.info("Published media ids", { publishedMediaIds });
        break;
      default:
        throw new Error(`Destination type ${content.destination?.type ?? ""} not supported`);
    }

    return success(`Content ${content.id} published successfully`);
  } catch (err: any) {
    log.error("Error publishing content", {
      error: err,
    });

    // Update content schedule with failure status and error details
    const errorResult = {
      error: {
        message: err.message,
      },
    };

    try {
      await sbClient
        .from("content_schedules")
        .update({
          status: ContentPublishStatus.Failed,
          result: errorResult,
        })
        .eq("content_id", event.contentId);
    } catch (updateErr: any) {
      log.error("Failed to update content schedule with error status", {
        error: updateErr,
      });
    }

    return error(err.message, 500);
  }
};

const toCreateMediaContainerInput = (media: PublishableIgMedia): CreateMediaContainerInput => {
  if (media.mimeType.startsWith("image")) {
    return { image_url: media.url, user_tags: media.tags };
  }
  return { video_url: media.url, user_tags: media.tags, media_type: "REELS" };
};
