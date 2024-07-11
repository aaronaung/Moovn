import { env } from "@/env.mjs";
import { SourceDataView, SourceTypes } from "@/src/consts/sources";
import { supaServerClient } from "@/src/data/clients/server";
import { getSourceById } from "@/src/data/sources";
import { Pike13Client, Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { transformScheduleV2 } from "@/src/libs/sources/utils";
import { NextRequest } from "next/server";

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const view = (req.nextUrl.searchParams.get("view") as SourceDataView) ?? SourceDataView.TODAY;

  const schedule = await getSourceSchedule(params.id, view);
  if (!schedule) {
    return Response.json(
      { message: `Failed to find schedule for source '${params.id}' and view '${view}'` },
      { status: 404 },
    );
  }

  return Response.json(schedule);
}
