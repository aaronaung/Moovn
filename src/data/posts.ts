import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";

export const savePost = async (
  {
    post,
    templateIds,
  }: {
    post: Partial<Tables<"posts">>;
    templateIds?: {
      added: string[];
      removed: string[];
    };
  },
  { client }: SupabaseOptions,
) => {
  const saved = await throwOrData<Tables<"posts">>(
    client
      .from("posts")
      .upsert(post as Tables<"posts">)
      .select("id")
      .limit(1)
      .single(),
  );

  if (templateIds) {
    try {
      await client.rpc("manage_post_template_links", {
        arg_post_id: saved.id,
        added_template_ids: templateIds.added || [],
        removed_template_ids: templateIds.removed || [],
      });
    } catch (err) {
      console.error(err);
    }
  }
};

export const deletePost = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("posts").delete().eq("id", id).single());
};

export const getPostsForAuthUser = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client.from("posts").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
  );
};

export const getPostsByDestinationId = async (destinationId: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("posts").select("*, destination:destinations(*)").eq("destination_id", destinationId));
};

export const getPostById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("posts").select("*, destination:destinations(*)").eq("id", id).maybeSingle());
};

export const publishPost = async (id: string) => {
  return (
    await fetch(`/api/posts/${id}/publish`, {
      method: "POST",
    })
  ).json();
};
