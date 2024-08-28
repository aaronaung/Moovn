import { env } from "@/env.mjs";
import { NextRequest } from "next/server";
import { z } from "zod";

const DeleteScheduleRequestSchema = z.object({
  scheduleName: z.string(),
});

export type DeleteScheduleRequest = z.infer<typeof DeleteScheduleRequestSchema>;

export async function POST(req: NextRequest) {
  const { scheduleName } = DeleteScheduleRequestSchema.parse(await req.json());

  try {
    const resp = await fetch(`${env.CONTENT_SCHEDULING_API_HOST}/delete-schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.CONTENT_SCHEDULING_API_KEY,
      },
      body: JSON.stringify({ name: scheduleName }),
    });
    if (resp.ok) {
      return new Response("Schedules deleted successfully", { status: 200 });
    }
    const json = await resp.json();
    console.error(json);
    return Response.json(json, { status: resp.status });
  } catch (err) {
    console.error(err);
    return new Response("Failed to delete schedule", { status: 500 });
  }
}
