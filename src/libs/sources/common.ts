export type ScheduleData = {
  // We have to use `schedules` as the key, so in PSD templates, users can
  // template multiple schedules using folder names like schedules#0, schedules#1, etc.
  // The template processor accesses the schedules data using the `schedules` key.
  schedules: DailyScheduleSchema[];
};

export type DailyScheduleSchema = {
  date: string;
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
