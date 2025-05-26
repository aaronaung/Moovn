import { MindbodySourceSettings, Pike13SourceSettings, SourceTypes } from "@/src/consts/sources";
import { supaServerClient } from "@/src/data/clients/server";
import { getSourceById } from "@/src/data/sources";
import { Pike13Client } from "./pike13";
import { flattenSchedule } from "./utils";
import { MindbodyClient } from "./mindbody";

export interface SourceClient {
  getScheduleData(from: string, to: string): Promise<ScheduleData>;
}

export type ScheduleData =
  | {
      day: {
        date: string;
        siteTimeZone: string;
        event: {
          name: string;
          start: string;
          end: string;
          staff: {
            id: string;
            name: string;
            photo: string;
          }[];
        }[];
      }[];
    }
  | { [key: string]: any };

export const getScheduleDataFromSource = async (
  sourceId: string,
  from: string,
  to: string,
  flatten: boolean,
): Promise<ScheduleData | null> => {
  const source = await getSourceById(sourceId, {
    client: supaServerClient(),
  });
  if (!source) {
    return null;
  }

  let sourceSettings;
  let scheduleData: ScheduleData;
  switch (source.type) {
    case SourceTypes.Pike13:
      sourceSettings = source.settings as Pike13SourceSettings;
      if (!sourceSettings?.url) {
        return null;
      }

      const pike13Client = new Pike13Client(sourceSettings.url);
      scheduleData = await pike13Client.getScheduleData(from, to);
      if (flatten) {
        return flattenSchedule(scheduleData);
      }
      return scheduleData;
    case SourceTypes.Mindbody:
      sourceSettings = source.settings as MindbodySourceSettings;
      if (!sourceSettings?.site_id) {
        return null;
      }
      const mindbodyClient = new MindbodyClient(sourceSettings.site_id);
      scheduleData = await mindbodyClient.getScheduleData(from, to);
      if (flatten) {
        return flattenSchedule(scheduleData);
      }
      return scheduleData;
    default:
      return {};
  }
};
