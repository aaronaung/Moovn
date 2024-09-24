import { env } from "@/env.mjs";
import { ScheduleData, SourceClient } from ".";
import { compareAsc, parseISO, startOfDay } from "date-fns";
import _ from "lodash";
import { toDate, toZonedTime } from "date-fns-tz";

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
    const formattedEvents = events.map((event) => {
      console.log({
        startDateTime: event.StartDateTime,
        timeZone,
        parseIso: parseISO(event.StartDateTime),
        zonedTime: toZonedTime(parseISO(event.StartDateTime), timeZone),
        date: startOfDay(toZonedTime(parseISO(event.StartDateTime), timeZone)).toISOString(), // Convert to timezone, get start of day, then convert back to ISO string
      });
      return {
        ...event,
        date: startOfDay(toZonedTime(parseISO(event.StartDateTime), timeZone)).toISOString(), // Convert to timezone, get start of day, then convert back to ISO string
      };
    });

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
    const siteTimeZone = site?.TimeZone ?? "America/Los_Angeles";
    return {
      day: groupedEvents.map((eventsByDay: any) => ({
        date: eventsByDay[0].date,
        event: eventsByDay.map((event: any) => ({
          name: event.ClassDescription?.Name ?? "Untitled",
          start: toDate(event.StartDateTime, { timeZone: siteTimeZone }).toISOString(),
          end: toDate(event.EndDateTime, { timeZone: siteTimeZone }).toISOString(),
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

  async getActivationCodeAndLink() {
    const resp = await fetch(`https://api.mindbodyonline.com/public/v6/site/activationcode`, {
      headers: {
        "API-Key": this.apiKey,
        siteId: this.siteId,
      },
    });
    const result = await resp.json();

    if (result.Error) {
      throw new Error(result.Error.Message);
    }
    return {
      code: result.ActivationCode,
      link: result.ActivationLink,
    };
  }

  async getSiteData() {
    const sites = await this.getSites();
    const site = sites.find((site: any) => site.Id == this.siteId);
    if (!site) {
      return null;
    }

    return {
      id: site.Id,
      name: site.Name,
      timeZone: site.TimeZone,
      description: site.Description,
      logoUrl: site.LogoUrl,
    };
  }
}
