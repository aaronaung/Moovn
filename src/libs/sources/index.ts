import { MindbodySourceSettings, Pike13SourceSettings, SourceTypes } from "@/src/consts/sources";
import { supaServerClient } from "@/src/data/clients/server";
import { getSourceById } from "@/src/data/sources";
import { Pike13Client } from "./pike13";
import { flattenSchedule } from "./utils";
import { MindbodyClient } from "./mindbody";

console.log("HEREEEEE");

export interface SourceClient {
  getScheduleData(from: string, to: string): Promise<ScheduleData>;
}

export type ScheduleData = {
  [key: string]: any;
};

export const getScheduleDataFromSource = async (sourceId: string, from: string, to: string) => {
  const source = await getSourceById(sourceId, {
    client: supaServerClient(),
  });
  if (!source) {
    return null;
  }

  let sourceSettings;
  switch (source.type) {
    case SourceTypes.Pike13:
      sourceSettings = source.settings as Pike13SourceSettings;
      if (!sourceSettings?.url) {
        return null;
      }
      const pike13Client = new Pike13Client(sourceSettings.url);
      return flattenSchedule(await pike13Client.getScheduleData(from, to));
    case SourceTypes.Mindbody:
      sourceSettings = source.settings as MindbodySourceSettings;
      if (!sourceSettings?.siteId) {
        return null;
      }
      const mindbodyClient = new MindbodyClient(sourceSettings.siteId);
      return flattenSchedule(await mindbodyClient.getScheduleData(from, to));
    default:
      return {};
  }
};
