create table "public"."content_schedules" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null references "public"."users" ("id") on delete cascade,
  "name"  text not null unique,
  "schedule_expression" text not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
)