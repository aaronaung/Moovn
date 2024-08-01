import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";
import { SourceDataView } from "../consts/sources";
import { ScheduleData } from "../libs/sources/common";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export const saveSource = async (
  source: Partial<Tables<"sources">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("sources")
      .upsert(source as Tables<"sources">)
      .single(),
  );
};

export const deleteSource = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("sources").delete().eq("id", id).single());
};

export const getSourcesForAuthUser = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client
      .from("sources")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const getSourceById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("sources").select("*").eq("id", id).maybeSingle());
};

export const getScheduleDataForSource = async ({
  id,
  view,
}: {
  id: string;
  view: SourceDataView;
}): Promise<ScheduleData> => {
  const current = new Date();
  let range = { from: current, to: current };
  switch (view) {
    case SourceDataView.Daily:
      range = {
        from: startOfDay(current),
        to: endOfDay(current),
      };
      break;
    case SourceDataView.Weekly:
      range = {
        from: startOfWeek(current),
        to: endOfWeek(current),
      };
      break;
    case SourceDataView.Monthly:
      range = {
        from: startOfMonth(current),
        to: endOfMonth(current),
      };
      break;
    default:
      break;
  }

  const resp = await fetch(
    `/api/sources/${id}/schedules?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
  );
  return resp.json();
};
