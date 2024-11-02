create table "public"."content_schedules" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null references "public"."users" ("id") on delete cascade,
  "content_id" uuid not null references "public"."content" ("id") on delete set null, -- 1 to 1 relationship with content
  "name"  text not null unique,
  "schedule_expression" text not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create index "content_schedules_name_index" on "public"."content_schedules" ("name");


alter table "public"."content_schedules" enable row level security;
create policy "Enable owner access to content_schedules"
on "public"."content_schedules"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);