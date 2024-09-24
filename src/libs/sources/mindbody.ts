import { env } from "@/env.mjs";
import { ScheduleData, SourceClient } from ".";
import { compareAsc, parseISO, startOfDay } from "date-fns";
import _ from "lodash";
import { formatInTimeZone } from "date-fns-tz";

export type MindbodySourceSettings = {
  siteId: string;
};

// https://developers.mindbodyonline.com/ui/documentation/public-api
export class MindbodyClient implements SourceClient {
  private apiKey: string;

  constructor(private siteId: string) {
    this.apiKey = env.MINDBODY_API_KEY;
  }

  private async getSites() {
    const resp = await fetch(`https://api.mindbodyonline.com/public/v6/site/sites`, {
      headers: {
        "API-Key": this.apiKey,
      },
    });
    return (await resp.json()).Sites;
  }

  private async getRawEventOcurrences(from: string, to: string) {
    const urlParams = new URLSearchParams();
    urlParams.set("startDateTime", from);
    urlParams.set("endDateTime", to);

    const resp = await fetch(
      `https://api.mindbodyonline.com/public/v6/class/classes?${urlParams.toString()}`,
      {
        headers: {
          "API-Key": this.apiKey,
          siteId: this.siteId,
        },
      },
    );
    return (await resp.json()).Classes;
  }

  private groupEventsByDay(events: any[], timeZone: string) {
    if ((events ?? []).length === 0) {
      return [];
    }
    // Convert the start_at to the same date format using date-fns
    events.sort((a, b) => compareAsc(parseISO(a.StartDateTime), parseISO(b.StartDateTime)));
    const formattedEvents = events.map((event) => ({
      ...event,
      date: startOfDay(
        formatInTimeZone(event.StartDateTime, timeZone, "yyyy-MM-dd'T'HH:mm:ss"),
      ).toISOString(),
    }));

    // Group the events by the formatted date
    const groupedEvents = _.groupBy(formattedEvents, "date");

    return Object.values(groupedEvents);
  }

  async getScheduleData(from: string, to: string): Promise<ScheduleData> {
    // TODO: We can call this only once and store the result in database.
    const sites = await this.getSites();
    const site = sites.find((site: any) => site.Id == this.siteId);

    const events = await this.getRawEventOcurrences(from, to);
    const groupedEvents = this.groupEventsByDay(events, site?.TimeZone ?? "America/Los_Angeles");
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
