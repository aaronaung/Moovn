import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { PublishContentRequest } from "@/app/api/content/[id]/publish/route";
import { ScheduleContentRequest } from "@/app/api/content/schedule/route";

export const saveContent = async (
  content: Partial<Tables<"content">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("content")
      .upsert(content as Tables<"content">)
      .select("id")
      .limit(1)
      .single(),
  );
};

export const deleteContent = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("content").delete().eq("id", id).single());
};

export const getContentsForAuthUser = async ({ client }: SupabaseOptions) => {
  return throwOrData(
    client
      .from("content")
      .select("*, destination:destinations(*), template:templates(*)")
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

export const saveContentSchedule = async (
  schedule: Partial<Tables<"content_schedules">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("content_schedules")
      .upsert(schedule as Tables<"content_schedules">, {
        onConflict: "name",
      })
      .select("id")
      .limit(1)
      .single(),
  );
};

export const scheduleContent = async (req: ScheduleContentRequest) => {
  const resp = await fetch(`/api/content/schedule`, {
    method: "POST",
    body: JSON.stringify(req),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (resp.ok) {
    return resp.text();
  }
  throw new Error(await resp.text());
};

export const getContentSchedules = async ({ client }: SupabaseOptions) => {
  return throwOrData(client.from("content_schedules").select("*, content:content(*)"));
};
