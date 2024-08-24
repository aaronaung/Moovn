create table "public"."content" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null,
  "destination_id" uuid not null references "public"."destinations" ("id"), -- if destination doesn't exist user can't publish
  "template_id" uuid not null references "public"."templates" ("id"),
  "ig_caption" text,
  "ig_tags" jsonb,
  "type" text not null,
  "source_id" uuid not null references "public"."sources" ("id"),
  "source_data_view" text not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create unique index if not exists content_pkey on public."content" using btree (id);
alter table "public"."content" add constraint "content_owner_id_foreign" foreign key ("owner_id") references "public"."users" ("id") on delete cascade;

alter table "public"."content" enable row level security;
create policy "Enable owner access to content"
on "public"."content"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

insert into storage.buckets
  (id, name)
values
  ('staging_area_for_content_publishing', 'staging_area_for_content_publishing')
on conflict (id) do nothing;

create policy "Enable read to owner of the staging_area_for_content_publishing"
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'staging_area_for_content_publishing' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable delete to owner of the staging_area_for_content_publishing"
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'staging_area_for_content_publishing' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable update to owner of the staging_area_for_content_publishing"
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'staging_area_for_content_publishing' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
)
with check(
    bucket_id = 'staging_area_for_content_publishing' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable insert to owner of the staging_area_for_content_publishing"
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'staging_area_for_content_publishing' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);

