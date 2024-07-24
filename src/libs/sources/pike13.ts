import { SourceDataView } from "@/src/consts/sources";
import { ScheduleData } from "./common";
import {
  compareAsc,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import _ from "lodash";

export type Pike13SourceSettings = {
  url: string;
};

export class Pike13Client {
  private clientId: string;
  private businessUrl: string;

  constructor({ clientId, businessUrl }: { clientId: string; businessUrl: string }) {
    this.clientId = clientId;
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

  async getRawEventOcurrences(from: Date, to: Date) {
    const urlParams = new URLSearchParams();
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    if (fromStr === toStr) {
      urlParams.set("from", fromStr);
    } else {
      urlParams.set("from", fromStr);
      urlParams.set("to", toStr);
    }
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

  private async getScheduleData(from: Date, to: Date): Promise<ScheduleData> {
    const $events = this.getRawEventOcurrences(from, to);
    const $staffMembers = this.getRawStaffMembers();
    const [events, staffMembers] = await Promise.all([$events, $staffMembers]);
    const staffMembersById = _.keyBy(staffMembers, "id");
    const groupedEvents = this.groupEventsByDay(events);

    // We try to keep the keys short and singular for ease of reference when creating layers in templates.
    return {
      day: groupedEvents.map((eventsByDay) => {
        return {
          date: eventsByDay[0].date,
          event: (eventsByDay || []).map((event: any) => ({
            staff: (event.staff_members || []).map((s: any) => {
              const staffMember = staffMembersById[s.id];
              return {
                name: staffMember.name,
                photo:
                  staffMember.profile_photo?.["x400"] ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.name)}`,
                instagramHandle: staffMember.name.replace(/[^0-9a-z]/gi, "").toLowerCase(), // todo: grab instagram handle from pike13
              };
            }),
            name: event.name,
            start: event.start_at,
            end: event.end_at,
          })),
        };
      }),
    };
  }

  async getScheduleDataForView(view?: SourceDataView | null): Promise<ScheduleData> {
    const currDateTime = new Date();
    switch (view) {
      case SourceDataView.DAILY:
        return this.getScheduleData(startOfDay(currDateTime), endOfDay(currDateTime));
      case SourceDataView.WEEKLY:
        return this.getScheduleData(startOfWeek(currDateTime), endOfWeek(currDateTime));
      case SourceDataView.MONTHLY:
        return this.getScheduleData(startOfMonth(currDateTime), endOfMonth(currDateTime));
      default:
        return { schedules: [] };
    }
  }
}
