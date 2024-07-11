create table "public"."published_content" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null references "public"."users" ("id") on delete cascade,
  "content_id" uuid references "public"."content" ("id") on delete set null,
  "ig_media_id" text,
  "published_at" timestamp with time zone default now()
);
create unique index if not exists published_content_pkey on public."published_content" using btree (id);

alter table "public"."published_content" enable row level security;
create policy "Enable owner access to published_content"
on "public"."published_content"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);