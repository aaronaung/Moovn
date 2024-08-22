import * as supabase from "@supabase/supabase-js";
import { success, error } from "../utils";
import { FacebookGraphAPIClient } from "../libs/fb-client";
import { isNumber } from "lodash";

export const handler = async (event: any) => {
  try {
    const { contentId, contentPath } = JSON.parse(event.body);
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
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET!;
    const fbAppId = process.env.FACEBOOK_APP_ID!;

    const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

    const { data: content, error: getContentErr } = await sbClient
      .from("content")
      .select("*, destination:destinations(*)")
      .eq("id", contentId)
      .single();
    if (getContentErr) {
      throw new Error(getContentErr.message);
    }
    console.log("Content fetched", content);

    switch (content.destination.type) {
      case "Instagram":
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

        const fbClient = new FacebookGraphAPIClient(
          {
            accessToken: content.destination.long_lived_token,
            lastRefreshedAt: content.destination.token_last_refreshed_at,
          },
          fbAppId,
          fbAppSecret,
        );

        const toPublish = [];
        const hasIgTags = content.ig_tags && content.ig_tags.length > 0;
        const { data: files, error: storageListErr } = await sbClient.storage
          .from("scheduled_content")
          .list(contentPath);
        if (storageListErr) {
          throw new Error(storageListErr.message);
        }
        if (files.length === 0) {
          // It's not a directory.
          const { data, error: signUrlErr } = await sbClient.storage
            .from("scheduled_content")
            .createSignedUrl(contentPath, 24 * 3600);
          if (signUrlErr) {
            throw new Error(signUrlErr.message);
          }
          toPublish.push({
            url: data.signedUrl,
            ...(hasIgTags ? { tags: content.ig_tags[0] } : {}),
          });
        } else {
          for (const f of files) {
            // file name is the index for tags.
            const { data, error: signUrlErr } = await sbClient.storage
              .from("scheduled_content")
              .createSignedUrl(`${contentPath}/${f.name}`, 24 * 3600);
            if (signUrlErr) {
              throw new Error(signUrlErr.message);
            }
            toPublish.push({
              url: data.signedUrl,
              ...(hasIgTags && isNumber(f.name) ? { tags: content.ig_tags[parseInt(f.name)] } : {}),
            });
          }
        }

        if (toPublish.length === 0) {
          console.log(`No content to publish for content id: ${contentId}`);
          return success({ message: "No content to publish" });
        }
        console.log("Content to publish", toPublish);
        let publishedMediaIds = [];
        switch (content.type) {
          case "Instagram Post":
            if (toPublish.length > 1) {
              const resp = await fbClient.publishCarouselPost(
                content.destination.linked_ig_user_id,
                toPublish.map(({ url, tags }) => ({
                  imageUrl: url,
                  userTags: tags,
                })),
                {
                  caption: content.ig_caption,
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
              const resp = await fbClient.publishPost(content.destination.linked_ig_user_id, {
                imageUrl: toPublish[0].url,
                userTags: toPublish[0].tags,
                caption: content.ig_caption,
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
              const resp = await fbClient.publishStory(content.destination.linked_ig_user_id, {
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
          publishedMediaIds.map((id) =>
            sbClient.from("published_content").insert({
              owner_id: content.destination.owner_id,
              ig_media_id: id,
              published_at: new Date().toISOString(),
            }),
          ),
        );
        console.log("Published media ids", publishedMediaIds);
        break;
      default:
        throw new Error(`Destination type ${content.destination.type} not supported`);
    }

    return success({ message: `Content ${content.id} published successfully` });
  } catch (err: any) {
    return error(err.message, 500);
  }
};
