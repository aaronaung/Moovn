import { DestinationTypes } from "@/src/consts/destinations";
import { BUCKETS } from "@/src/consts/storage";
import { supaServerClient } from "@/src/data/clients/server";
import { getPostById } from "@/src/data/posts";
import { getTemplatesForPost } from "@/src/data/templates";
import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";
import { signUrl } from "@/src/libs/storage";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const post = await getPostById(params.id, {
    client: supaServerClient(),
  });

  if (!post) {
    return Response.json({ message: "Post not found" }, { status: 404 });
  }
  if (!post.destination) {
    return Response.json({ message: "Post does not have a destination" }, { status: 400 });
  }

  // These templates are ordered by position in ascending order. This ensures that
  // the carousel posts are in the correct order.
  const templates = await getTemplatesForPost(post.id, {
    client: supaServerClient(),
  });
  if (templates.length === 0) {
    return Response.json({ message: "Post does not contain any designs to publish" }, { status: 400 });
  }

  switch (post.destination.type) {
    case DestinationTypes.INSTAGRAM:
      if (!post.destination.linked_ig_user_id) {
        return Response.json({ message: "Destination not connected: missing linked IG user ID" }, { status: 400 });
      }
      if (!post.destination.long_lived_token) {
        return Response.json({ message: "Destination not connected: missing access token" }, { status: 400 });
      }

      const fbClient = new FacebookGraphAPIClient({
        accessToken: post.destination.long_lived_token,
        lastRefreshedAt: new Date(post.destination.token_last_refreshed_at ?? 0),
      });

      try {
        const signedLatestDesignUrls = await Promise.all(
          templates.map((template) => {
            return signUrl({
              bucket: BUCKETS.posts,
              objectPath: `${post.owner_id}/${template.id}.jpeg`,
              client: supaServerClient(),
              expiresIn: 24 * 3600,
            });
          }),
        );
        if (signedLatestDesignUrls.length === 0) {
          return Response.json({ message: "Failed to fetch designs" }, { status: 500 });
        }

        let publishedMedia: Awaited<
          ReturnType<FacebookGraphAPIClient["postSingle"]> | ReturnType<FacebookGraphAPIClient["postCarousel"]>
        >;
        if (signedLatestDesignUrls.length > 1) {
          publishedMedia = await fbClient.postCarousel(
            post.destination.linked_ig_user_id,
            signedLatestDesignUrls.map((url) => ({
              imageUrl: url,
            })),
            {
              caption: post.caption ?? undefined,
            },
          );
        } else {
          publishedMedia = await fbClient.postSingle(post.destination.linked_ig_user_id, {
            imageUrl: signedLatestDesignUrls[0],
            caption: post.caption ?? undefined,
          });
        }
        console.log("Published media", publishedMedia);
        await supaServerClient()
          .from("posts")
          .update({ last_published_at: new Date().toISOString(), published_ig_media_id: publishedMedia.id })
          .eq("id", post.id);
        return Response.json({ id: post.id });
      } catch (err: any) {
        return Response.json({ message: `Failed to publish post: ${err.message}` }, { status: 500 });
      }
    default:
      return Response.json({ message: `Destination type ${post.destination.type} not supported` }, { status: 400 });
  }
}
