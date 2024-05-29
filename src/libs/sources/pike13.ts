import { DailyScheduleSchema } from "./common";
import { endOfDay, format, startOfDay } from "date-fns";
import _ from "lodash";

export type Pike13SourceSettings = {
  url: string;
};

export class Pike13Client {
  private clientId: string;
  private businessUrl: string;

  constructor({
    clientId,
    businessUrl,
  }: {
    clientId: string;
    businessUrl: string;
  }) {
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
    const resp = await this.get(
      `/api/v2/front/event_occurrences`,
      `from=${from.toISOString()}&to=${to.toISOString()}`,
    );
    return resp.event_occurrences || [];
  }
  async getRawStaffMembers() {
    const resp = await this.get(`/api/v2/front/staff_members`);
    return resp.staff_members || [];
  }

  async getDailySchedule(date: Date): Promise<DailyScheduleSchema> {
    const $events = this.getRawEventOcurrences(
      startOfDay(date),
      endOfDay(date),
    );
    const $staffMembers = this.getRawStaffMembers();
    const [events, staffMembers] = await Promise.all([$events, $staffMembers]);
    const staffMembersById = _.keyBy(staffMembers, "id");

    return {
      day: format(date, "EEEE"),
      date: date.toISOString(),
      events: events.map((event: any) => ({
        staff_members: event.staff_members.map((s: any) => {
          const staffMember = staffMembersById[s.id];
          return {
            name: staffMember.name,
            profile_photo: staffMember.profile_photo?.["x400"] ?? "",
          };
        }),
        name: event.name,
        start_at: event.start_at,
        end_at: event.end_at,
      })),
    };
  }
}
