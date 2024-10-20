import { env } from "@/env.mjs";
import { ScheduleData, SourceClient } from ".";
import { compareAsc, parseISO } from "date-fns";
import _ from "lodash";
import { formatInTimeZone } from "date-fns-tz";

export class Pike13Client implements SourceClient {
  private clientId: string;
  private businessUrl: string;

  constructor(businessUrl: string) {
    this.clientId = env.PIKE13_CLIENT_ID;
    this.businessUrl = businessUrl;
  }

  private async get(path: string, queryString?: string) {
    let url = `${this.businessUrl}${path}?client_id=${this.clientId}`;
    if (queryString) {
      url += `&${queryString}`;
    }
    const resp = await fetch(url);
    return resp.json();
  }

  private async getRawEventOcurrences(from: string, to: string) {
    const urlParams = new URLSearchParams();
    if (from === to) {
      urlParams.set("from", from);
    } else {
      urlParams.set("from", `${from}T00:00:00`);
      urlParams.set("to", `${to}T23:59:59`);
    }

    const resp = await this.get(`/api/v2/front/event_occurrences`, urlParams.toString());
    return resp.event_occurrences || [];
  }

  async getRawStaffMembers() {
    const resp = await this.get(`/api/v2/front/staff_members`);
    return resp.staff_members || [];
  }

  private groupEventsByDay(events: any[], siteTimezone: string) {
    if (events.length === 0) {
      return [];
    }
    // Convert the start_at to the same date format using date-fns
    events.sort((a, b) => compareAsc(parseISO(a.start_at), parseISO(b.start_at)));
    const formattedEvents = events.map((event) => {
      // event.start_at is in the format of "2024-07-20T00:00:00Z". It already has timezone info.
      // We can't use date-fns startOfDay, because it will use the server's timezone which can be different from the event's timezone.
      const inTimeZone = formatInTimeZone(event.start_at, siteTimezone, "yyyy-MM-dd'T'HH:mm:ss");
      const date = inTimeZone.split("T")[0];

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
    const $events = this.getRawEventOcurrences(from, to);
    const $staffMembers = this.getRawStaffMembers();
    const [events, staffMembers] = await Promise.all([$events, $staffMembers]);
    const staffMembersById = _.keyBy(staffMembers, "id");

    const groupedEvents = this.groupEventsByDay(events, events[0].timezone);

    // NOTE: ALL DATE TIMES ARE LOCAL TO THE SITE'S TIMEZONE.
    // We try to keep the keys short and singular for ease of reference when creating layers in templates.
    return {
      day: groupedEvents.map((eventsByDay) => {
        return {
          date: eventsByDay[0].date,
          siteTimeZone: eventsByDay[0].timezone,
          event: (eventsByDay || []).map((event: any, index: number) => {
            const headshotUrl = `https://assets.moovn.co/headshots/${index + 1}.png`;
            return {
              staff: (event.staff_members || [])
                .filter((s: any) => Boolean(staffMembersById[s.id]))
                .map((s: any) => {
                  const staffMember = staffMembersById[s.id];

                  return {
                    name: staffMember?.name,
                    photo: headshotUrl,
                    instagramHandle: "aarondidi", // staffMember.name.replace(/[^0-9a-z]/gi, "").toLowerCase(), // todo: grab instagram handle from pike13
                  };
                }),
              name: event.name,
              start: formatInTimeZone(
                event.start_at,
                eventsByDay[0].timezone,
                "yyyy-MM-dd'T'HH:mm:ss",
              ), // Site's local time
              end: formatInTimeZone(event.end_at, eventsByDay[0].timezone, "yyyy-MM-dd'T'HH:mm:ss"), // Site's local time
            };
          }),
        };
      }),
    };
  }
}
