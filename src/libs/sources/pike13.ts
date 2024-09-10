import { env } from "@/env.mjs";
import { ScheduleData, SourceClient } from ".";
import { compareAsc, parseISO, startOfDay } from "date-fns";
import _ from "lodash";

export type Pike13SourceSettings = {
  url: string;
};

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
    console.log("pike13 urlParams", urlParams.toString());
    const resp = await this.get(`/api/v2/front/event_occurrences`, urlParams.toString());
    return resp.event_occurrences || [];
  }
  async getRawStaffMembers() {
    const resp = await this.get(`/api/v2/front/staff_members`);
    return resp.staff_members || [];
  }

  private groupEventsByDay(events: any[]) {
    if (events.length === 0) {
      return [];
    }
    // Convert the start_at to the same date format using date-fns
    events.sort((a, b) => compareAsc(parseISO(a.start_at), parseISO(b.start_at)));
    const formattedEvents = events.map((event) => ({
      ...event,
      date: startOfDay(new Date(event.start_at)).toISOString(),
    }));

    // Group the events by the formatted date
    const groupedEvents = _.groupBy(formattedEvents, "date");

    return Object.values(groupedEvents);
  }

  async getScheduleData(from: string, to: string): Promise<ScheduleData> {
    const $events = this.getRawEventOcurrences(from, to);
    const $staffMembers = this.getRawStaffMembers();
    const [events, staffMembers] = await Promise.all([$events, $staffMembers]);
    const staffMembersById = _.keyBy(staffMembers, "id");
    const groupedEvents = this.groupEventsByDay(events);

    // We try to keep the keys short and singular for ease of reference when creating layers in templates.
    let headshotIndex = 1;
    return {
      day: groupedEvents.map((eventsByDay) => {
        return {
          date: eventsByDay[0].date,
          event: (eventsByDay || []).map((event: any) => {
            const headshotUrl = `https://assets.moovn.co/headshots/${headshotIndex}.png`;
            headshotIndex++;
            if (headshotIndex > 10) {
              headshotIndex = 1;
            }
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
              start: event.start_at,
              end: event.end_at,
            };
          }),
        };
      }),
    };
  }
}
