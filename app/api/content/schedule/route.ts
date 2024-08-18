import { env } from "@/env.mjs";
import { NextRequest } from "next/server";
import { z } from "zod";

const ScheduleContentRequestSchema = z
  .array(
    z.object({
      contentKey: z.string(),
      scheduleExpression: z.string(),
    }),
  )
  .nonempty("Schedule content request must contain at least one schedule");

export type ScheduleContentRequest = z.infer<typeof ScheduleContentRequestSchema>;

export async function POST(req: NextRequest) {
  const schedules = ScheduleContentRequestSchema.parse(await req.json());

  try {
    const resp = await fetch(`${env.CONTENT_SCHEDULING_API_HOST}/schedule-publish-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.CONTENT_SCHEDULING_API_KEY,
      },
      body: JSON.stringify(schedules),
    });
    if (resp.ok) {
      return new Response("Schedules created/updated successfully", { status: 200 });
    }
    const json = await resp.json();
    console.error(json);
    return Response.json(json, { status: resp.status });
  } catch (err) {
    console.error(err);
    return new Response("Failed to create/update schedules", { status: 500 });
  }
}
