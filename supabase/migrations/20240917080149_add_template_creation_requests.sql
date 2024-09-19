create table "public"."template_creation_requests" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null references "public"."users" ("id") on delete cascade,
  "template_id" uuid not null references "public"."templates" ("id") on delete cascade,
  "status" text not null,
  "description" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

alter table "public"."template_creation_requests" enable row level security;
create policy "Enable owner access to template_creation_requests"
on "public"."template_creation_requests"
as permissive
for all
to authenticated
using (auth.uid() = owner_id) -- For now, in the future this should be to the owner AND admins
with check (auth.uid() = owner_id); -- For now, in the future this should be to the owner AND admins

