alter table "public"."content_schedules" add column "ig_caption" text;
alter table "public"."content_schedules" add column "ig_tags" jsonb;
alter table "public"."content_schedules" add column "destination_id" uuid not null references "public"."destinations" ("id");

create index "content_schedules_name_index" on "public"."content_schedules" ("name");

