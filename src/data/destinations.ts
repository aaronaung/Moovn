import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";
import { InstagramAPIToken } from "../libs/instagram/types";
import { ContentPublishStatus } from "../consts/destinations";

export const saveDestination = async (
  destination: Partial<Tables<"destinations">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("destinations")
      .upsert(destination as Tables<"destinations">)
      .single(),
  );
};

export const deleteDestination = async (id: string, { client }: SupabaseOptions) => {
  const pendingSchedules = await getContentSchedulesForDestination(
    { destinationId: id, status: ContentPublishStatus.Pending },
    { client },
  );

  // This deletes the schedule in AWS EventBridge.
  const scheduleDeletions = pendingSchedules.map((schedule) =>
    fetch(`/api/content/delete-schedule`, {
      method: "POST",
      body: JSON.stringify({ scheduleName: schedule.name }),
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
  await Promise.all(scheduleDeletions);

  // We have a trigger that deletes the pending content & content schedule db records when the destination is deleted
  return throwOrData(client.from("destinations").delete().eq("id", id).single());
};

export const getAllDestinations = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client
      .from("destinations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const getDestinationById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("destinations").select("*").eq("id", id).maybeSingle());
};

export const igTokenUpdater = (destinationId: string, { client }: SupabaseOptions) => {
  return async (token: InstagramAPIToken) => {
    await client
      .from("destinations")
      .update({
        long_lived_token: token.long_lived_access_token,
        token_last_refreshed_at: token.last_refreshed_at.toISOString(),
      })
      .eq("id", destinationId);
  };
};

export const getContentSchedulesForDestination = async (
  { destinationId, status }: { destinationId: string; status?: ContentPublishStatus },
  { client }: SupabaseOptions,
) => {
  let query = client
    .from("content_schedules")
    .select(
      `
      *,
      content!inner(
        *,
        destination:destinations!inner(*)
      )
    `,
    )
    .eq("content.destination_id", destinationId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  return throwOrData(query);
};
