import { env } from "@/env.mjs";
import { SourceDataView, SourceTypes } from "@/src/consts/sources";
import { supaServerClient } from "@/src/data/clients/server";
import { getSourceById } from "@/src/data/sources";
import { Pike13Client, Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const view =
    (req.nextUrl.searchParams.get("view") as SourceDataView) ??
    SourceDataView.TODAY;

  const source = await getSourceById(params.id, {
    client: supaServerClient(),
  });
  if (!source) {
    return new Response(`Source with id ${params.id} not found`, {
      status: 404,
    });
  }

  switch (source.type) {
    case SourceTypes.PIKE13:
      const sourceSettings = source.settings as Pike13SourceSettings;
      if (!sourceSettings?.url) {
        return new Response(
          `Can't process request. Source with id ${params.id} is missing settings.`,
          { status: 422 },
        );
      }
      const pike13Client = new Pike13Client({
        clientId: env.PIKE13_CLIENT_ID,
        businessUrl: sourceSettings.url,
      });

      return Response.json(await pike13Client.getScheduleDataForView(view));
    default:
      return new Response(
        `Source with id ${params.id} has type ${source.type} which is not supported.`,
        {
          status: 422,
        },
      );
  }
}
