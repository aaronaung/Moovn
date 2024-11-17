import { env } from "@/env.mjs";
import { ScheduleData, SourceClient } from ".";
import { compareAsc, parseISO } from "date-fns";
import _ from "lodash";

// https://developers.mindbodyonline.com/ui/documentation/public-api
export class MindbodyClient implements SourceClient {
  private apiKey: string;

  constructor(private siteId: string) {
    this.apiKey = env.MINDBODY_API_KEY;
  }

  async getSites() {
    const resp = await fetch(`https://api.mindbodyonline.com/public/v6/site/sites`, {
      headers: {
        "API-Key": this.apiKey,
      },
    });
    return (await resp.json()).Sites || [];
  }

  async getRawEventOcurrences(from: string, to: string) {
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

  private groupEventsByDay(events: any[], siteTimezone: string) {
    if ((events ?? []).length === 0) {
      return [];
    }
    // Convert the start_at to the same date format using date-fns
    events.sort((a, b) => compareAsc(parseISO(a.StartDateTime), parseISO(b.StartDateTime)));
    const formattedEvents = events.map((event) => {
      // event.StartDateTime is in the format of "2024-07-20T00:00:00" local to the site's timezone.
      const date = event.StartDateTime.split("T")[0];

      return {
        ...event,
        date,
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

    // NOTE: ALL DATE TIMES ARE LOCAL TO THE SITE'S TIMEZONE.
    return {
      day: groupedEvents.map((eventsByDay: any) => ({
        date: eventsByDay[0].date,
        siteTimeZone: site?.TimeZone ?? "N/A",
        event: eventsByDay.map((event: any) => ({
          name: event.ClassDescription?.Name ?? "Untitled",
          start: event.StartDateTime, // Site's local time
          end: event.EndDateTime, // Site's local time
          staff: [
            {
              id: event.Staff?.Id,
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
