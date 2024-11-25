import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";
import R2Storage from "@/src/libs/r2/r2-storage";
import { InstagramAPIToken } from "@/src/libs/instagram/types";
import { Database } from "@/types/db";
import { env } from "@/env.mjs";

type PublishRequest = {
  assets: Array<{
    bucketName: string;
    path: string;
    assetType: "image" | "video";
  }>;
  caption?: string;
  type: "Post" | "Story";
};

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sbClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const destinationId = params.id;
    const body: PublishRequest = await request.json();
    const { assets, caption, type } = body;

    if (!assets?.length) {
      return NextResponse.json({ error: "assets missing in body" }, { status: 400 });
    }

    const { data: destination, error: getDestErr } = await sbClient
      .from("destinations")
      .select("*")
      .eq("id", destinationId)
      .single();

    if (getDestErr) {
      throw new Error(getDestErr.message);
    }

    if (destination.type !== "Instagram") {
      throw new Error(`Destination type ${destination.type} not supported`);
    }

    if (!destination.linked_ig_user_id) {
      throw new Error("Instagram account not connected - missing user ID");
    }
    if (!destination.long_lived_token) {
      throw new Error("Instagram account not connected - missing access token");
    }

    const r2 = new R2Storage(env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY);

    const igClient = new InstagramAPIClient(
      {
        long_lived_access_token: destination.long_lived_token,
        last_refreshed_at: new Date(destination.token_last_refreshed_at ?? ""),
      },
      async (token: InstagramAPIToken) => {
        await sbClient
          .from("destinations")
          .update({
            long_lived_token: token.long_lived_access_token,
            token_last_refreshed_at: token.last_refreshed_at.toISOString(),
          })
          .eq("id", destination.id);
      },
    );

    const signedUrls = await Promise.all(
      assets.map((asset) => r2.signUrl(asset.bucketName, asset.path)),
    );

    const igUserId = destination.linked_ig_user_id;
    let publishedMediaId: string;

    if (type === "Post") {
      if (signedUrls.length > 1) {
        const resp = await igClient.publishCarouselPost(
          igUserId,
          signedUrls.map((url, i) => ({
            ...(assets[i].assetType === "image"
              ? { image_url: url }
              : { video_url: url, media_type: "REELS" }),
          })),
          { caption },
        );
        publishedMediaId = resp.id;
      } else {
        const resp = await igClient.publishPost(igUserId, {
          ...(assets[0].assetType === "image"
            ? { image_url: signedUrls[0] }
            : { video_url: signedUrls[0], media_type: "REELS" }),
          caption,
        });
        publishedMediaId = resp.id;
      }
    } else {
      // Story
      const resp = await igClient.publishStory(igUserId, {
        ...(assets[0].assetType === "image"
          ? { image_url: signedUrls[0] }
          : { video_url: signedUrls[0], media_type: "REELS" }),
      });
      publishedMediaId = resp.id;
    }

    const media = await igClient.getInstagramMedia(publishedMediaId);

    return NextResponse.json({
      mediaId: publishedMediaId,
      mediaUrl: media.media_url,
      permalink: media.permalink,
    });
  } catch (err: any) {
    console.error("Error publishing to Instagram:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
