import { SourceDataView } from "@/src/consts/sources";
import { getSourceSchedule } from "@/src/libs/sources/common";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const view = (req.nextUrl.searchParams.get("view") as SourceDataView) ?? SourceDataView.DAILY;

  const schedule = await getSourceSchedule(params.id, view);
  if (!schedule) {
    return Response.json(
      { message: `Failed to find schedule for source '${params.id}' and view '${view}'` },
      { status: 404 },
    );
  }

  return Response.json(schedule);
}
