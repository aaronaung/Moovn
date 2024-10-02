import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { ScheduleContentRequest } from "@/app/api/content/schedule/route";
import { deleteObject, listObjects } from "./r2";
import _ from "lodash";

export const saveContent = async (
  content: Partial<Tables<"content">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("content")
      .upsert(_.omit(content, "destination", "template", "published_content") as Tables<"content">)
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
      .select(
        "*, destination:destinations(*), template:templates(*), published_content:published_content(*)",
      )
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
      .select("*, destination:destinations(*),")
      .eq("destination_id", destinationId),
  );
};

export const getContentById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(
    client.from("content").select("*, destination:destinations(*)").eq("id", id).maybeSingle(),
  );
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

export const deleteContentSchedule = async (
  {
    ownerId,
    contentId,
    scheduleName,
  }: { ownerId: string; contentId: string; scheduleName: string },
  { client }: SupabaseOptions,
) => {
  await throwOrData(client.from("content_schedules").delete().eq("name", scheduleName));
  await throwOrData(client.from("content").delete().eq("id", contentId));

  const prefix = `${ownerId}/${contentId}`;
  const objects = await listObjects("scheduled-content", prefix);
  if (objects.length > 0) {
    await Promise.all(objects.map((obj) => deleteObject("scheduled-content", obj.Key || "")));
  }
  await deleteObject("scheduled-content", prefix);
  await fetch(`/api/content/delete-schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduleName }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};
