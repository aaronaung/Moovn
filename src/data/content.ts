import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";
import { PublishContentRequest } from "@/app/api/content/[id]/publish/route";

export const saveContent = async (
  {
    content,
    templateIds,
  }: {
    content: Partial<Tables<"content">>;
    templateIds?: string[];
  },
  { client }: SupabaseOptions,
) => {
  const saved = await throwOrData<Tables<"content">>(
    client
      .from("content")
      .upsert(content as Tables<"content">)
      .select("id")
      .limit(1)
      .single(),
  );

  if (templateIds) {
    try {
      await client.rpc("set_content_template_links", {
        arg_content_id: saved.id,
        new_template_ids: templateIds,
      });
    } catch (err) {
      console.error(err);
    }
  }
};

export const deleteContent = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("content").delete().eq("id", id).single());
};

export const getContentForAuthUser = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client
      .from("content")
      .select("*, destination:destinations(*)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const getContentByDestinationId = async (
  destinationId: string,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("content")
      .select("*, destination:destinations(*)")
      .eq("destination_id", destinationId),
  );
};

export const getContentById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(
    client.from("content").select("*, destination:destinations(*)").eq("id", id).maybeSingle(),
  );
};

export const publishContent = async ({ id, body }: { id: string; body: PublishContentRequest }) => {
  return (
    await fetch(`/api/content/${id}/publish`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    })
  ).json();
};

export const scheduleContent = async (
  schedules: { contentKey: string; scheduleExpression: string }[],
) => {
  const resp = await fetch(`/api/content/schedule`, {
    method: "POST",
    body: JSON.stringify(schedules),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (resp.ok) {
    return resp.text();
  }
  throw new Error(await resp.text());
};
