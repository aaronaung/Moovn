import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { SourceDataView, SourceTypes } from "../consts/sources";
import { ScheduleData } from "../libs/sources";
import { endOfDay, endOfWeek, format, startOfDay, startOfWeek } from "date-fns";

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

export const getAllSources = async ({ client }: SupabaseOptions) => {
  return throwOrData(client.from("sources").select("*").order("created_at", { ascending: false }));
};

export const getScheduleSources = async ({ client }: SupabaseOptions) => {
  return throwOrData(
    client
      .from("sources")
      .select("*")
      .neq("type", SourceTypes.GoogleDrive)
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
  if (view === SourceDataView.Weekly) {
    range = {
      from: format(startOfWeek(current), "yyyy-MM-dd"),
      to: format(endOfWeek(current), "yyyy-MM-dd"),
    };
  }

  const resp = await fetch(`/api/sources/${id}/schedules?from=${range.from}&to=${range.to}`);
  return resp.json();
};

export const getScheduleDataForSourceByTimeRange = async ({
  id,
  dateRange,
}: {
  id: string;
  dateRange: { from: Date; to: Date };
}): Promise<ScheduleData> => {
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");

  const resp = await fetch(`/api/sources/${id}/schedules?from=${from}&to=${to}`);
  return resp.json();
};

export const getDataFromScheduleSourcesByTimeRange = async (
  { dateRange }: { dateRange: { from: Date; to: Date } },
  { client }: SupabaseOptions,
): Promise<{ [key: string]: ScheduleData }> => {
  const allSources = await throwOrData(
    client
      .from("sources")
      .select("id")
      .neq("type", SourceTypes.GoogleDrive)
      .order("created_at", { ascending: false }),
  );
  const allSourcesData = await Promise.all(
    allSources.map(
      ({ id }) =>
        new Promise<{ sourceId: string; scheduleData: ScheduleData }>(async (resolve) => {
          resolve({
            sourceId: id,
            scheduleData: await getScheduleDataForSourceByTimeRange({
              id,
              dateRange,
            }),
          });
        }),
    ),
  );
  return allSourcesData.reduce(
    (acc, data) => {
      acc[data.sourceId] = data.scheduleData;
      return acc;
    },
    {} as { [key: string]: ScheduleData },
  );
};

export async function getMindbodySiteData(siteId: string) {
  const response = await fetch(`/api/sources/mindbody/sites/${siteId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch Mindbody site data");
  }
  return response.json();
}

export async function getMindbodyActivationCodeAndLink(siteId: string) {
  const response = await fetch(`/api/sources/mindbody/sites/${siteId}/activation`);
  if (!response.ok) {
    throw new Error("Failed to fetch Mindbody activation code and link");
  }
  return response.json();
}
