export type DailyScheduleSchema = {
  date: string;
  day: string;
  events: ScheduleEvent[];
};

export type ScheduleEvent = {
  staff_members: StaffMember[];
  name: string;
  start_at: string;
  end_at: string;
};

export type StaffMember = {
  name: string;
  profile_photo: string;
};
