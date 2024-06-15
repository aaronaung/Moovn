create table "public"."destinations" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "owner_id" uuid not null,
  "type" text not null,
  "long_lived_token" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

create unique index destinations_pkey on public."destinations" using btree (id);
alter table "public"."destinations" add constraint "destinations_pkey" primary key using index "destinations_pkey";
alter table "public"."destinations" add constraint "destinations_owner_id_foreign" foreign key ("owner_id") references "public"."users" ("id") on delete cascade;

alter table "public"."destinations" enable row level security;
create policy "Enable owner access to destinations"
on "public"."destinations"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
