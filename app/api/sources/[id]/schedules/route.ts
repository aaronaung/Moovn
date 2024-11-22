import { getScheduleDataFromSource } from "@/src/libs/sources";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const flatten = req.nextUrl.searchParams.get("flatten");

  if (!from || !to) {
    return Response.json({ message: "from and to query parameters are required" }, { status: 400 });
  }

  const schedule = await getScheduleDataFromSource(
    params.id,
    from,
    to,
    flatten === "false" ? false : true,
  );
  if (!schedule) {
    return Response.json(
      { message: `Failed to find schedule for source '${params.id}' from ${from} to ${to}` },
      { status: 404 },
    );
  }

  return Response.json(schedule);
}
