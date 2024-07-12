import { SourceDataView, SourceTypes } from "@/src/consts/sources";
import { supaServerClient } from "@/src/data/clients/server";
import { getSourceById } from "@/src/data/sources";
import { Pike13Client, Pike13SourceSettings } from "./pike13";
import { env } from "@/env.mjs";
import { transformScheduleV2 } from "./utils";

export type ScheduleData = {
  [key: string]: any;
};

export const getSourceSchedule = async (sourceId: string, view: SourceDataView) => {
  const source = await getSourceById(sourceId, {
    client: supaServerClient(),
  });
  if (!source) {
    return null;
  }

  switch (source.type) {
    case SourceTypes.PIKE13:
      const sourceSettings = source.settings as Pike13SourceSettings;
      if (!sourceSettings?.url) {
        return null;
      }
      const pike13Client = new Pike13Client({
        clientId: env.PIKE13_CLIENT_ID,
        businessUrl: sourceSettings.url,
      });

      return transformScheduleV2(await pike13Client.getScheduleDataForView(view));
    default:
      return null;
  }
};
