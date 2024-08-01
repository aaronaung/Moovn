import { getScheduleDataFromSource } from "@/src/libs/sources/common";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return Response.json({ message: "from and to query parameters are required" }, { status: 400 });
  }

  const schedule = await getScheduleDataFromSource(params.id, new Date(from), new Date(to));
  if (!schedule) {
    return Response.json(
      { message: `Failed to find schedule for source '${params.id}' from ${from} to ${to}` },
      { status: 404 },
    );
  }

  return Response.json(schedule);
}
