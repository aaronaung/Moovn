import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";
import { SourceDataView } from "../consts/sources";
import { ScheduleData } from "../libs/sources/common";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

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
  let range = {
    from: format(startOfDay(current), "yyyy-MM-dd"),
    to: format(endOfDay(current), "yyyy-MM-dd"),
  };
  switch (view) {
    case SourceDataView.Daily:
      range = {
        from: format(startOfDay(addDays(current, 1)), "yyyy-MM-dd"),
        to: format(endOfDay(addDays(current, 1)), "yyyy-MM-dd"),
      };
      break;
    case SourceDataView.Weekly:
      range = {
        from: format(startOfWeek(current), "yyyy-MM-dd"),
        to: format(endOfWeek(current), "yyyy-MM-dd"),
      };
      break;
    case SourceDataView.Monthly:
      range = {
        from: format(startOfMonth(current), "yyyy-MM-dd"),
        to: format(endOfMonth(current), "yyyy-MM-dd"),
      };
      break;
    default:
      break;
  }
  console.log("range", range);

  const resp = await fetch(`/api/sources/${id}/schedules?from=${range.from}&to=${range.to}`);
  return resp.json();
};
