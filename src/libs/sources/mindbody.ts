import { env } from "@/env.mjs";
import { ScheduleData, SourceClient } from ".";
import { compareAsc, parseISO, startOfDay } from "date-fns";
import _ from "lodash";
import { formatInTimeZone } from "date-fns-tz";

export type MindbodySourceSettings = {
  siteId: string;
};

export class MindbodyClient implements SourceClient {
  private apiKey: string;

  constructor(private siteId: string) {
    this.apiKey = env.MINDBODY_API_KEY;
  }

  private async getRawEventOcurrences(from: string, to: string) {
    const urlParams = new URLSearchParams();
    urlParams.set("startDateTime", formatInTimeZone(from, "UTC", "yyyy-MM-dd'T'HH:mm:ss"));
    urlParams.set("endDateTime", formatInTimeZone(to, "UTC", "yyyy-MM-dd'T'HH:mm:ss"));
    console.log("mindbody schedule search params", urlParams.toString());

    const resp = await fetch(
      `https://api.mindbodyonline.com/public/v6/class/classes?${urlParams.toString()}`,
      {
        headers: {
          "API-Key": this.apiKey,
          siteId: this.siteId,
        },
      },
    );
    return resp.json();
  }

  private groupEventsByDay(events: any[]) {
    if ((events ?? []).length === 0) {
      return [];
    }
    // Convert the start_at to the same date format using date-fns
    events.sort((a, b) => compareAsc(parseISO(a.StartDateTime), parseISO(b.StartDateTime)));
    const formattedEvents = events.map((event) => ({
      ...event,
      date: startOfDay(new Date(event.StartDateTime)).toISOString(),
    }));

    // Group the events by the formatted date
    const groupedEvents = _.groupBy(formattedEvents, "date");

    return Object.values(groupedEvents);
  }

  async getScheduleData(from: string, to: string): Promise<ScheduleData> {
    const resp = await this.getRawEventOcurrences(from, to);
    const groupedEvents = this.groupEventsByDay(resp.Classes);
    return {
      day: groupedEvents.map((eventsByDay: any) => ({
        date: eventsByDay[0].date,
        event: eventsByDay.map((event: any) => ({
          name: event.ClassDescription?.Name ?? "Untitled",
          start: new Date(event.StartDateTime).toISOString(),
          end: new Date(event.EndDateTime).toISOString(),
          staff: [
            {
              name: event.Staff?.Name,
              photo:
                event.Staff?.ImageUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(event.Staff?.Name)}`,
              instagramHandle: "aarondidi",
            },
          ],
        })),
      })),
    };
  }
}
