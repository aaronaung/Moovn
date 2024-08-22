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

create table "public"."content_templates" (
  "content_id" uuid not null,
  "template_id" uuid not null,
  "position" integer not null default 0,
  "created_at" timestamp with time zone default now()
);
create unique index if not exists content_templates_pkey on public."content_templates" using btree (content_id, template_id);
alter table "public"."content_templates" add constraint "content_templates_pkey" primary key using index "content_templates_pkey";
alter table "public"."content_templates" add constraint "content_templates_content_id_foreign" foreign key ("content_id") references "public"."content" ("id") on delete cascade;
alter table "public"."content_templates" add constraint "content_templates_template_id_foreign" foreign key ("template_id") references "public"."templates" ("id") on delete cascade;

alter table "public"."content_templates" enable row level security;
create policy "Enable owner access to content_templates"
on "public"."content_templates"
as permissive
for all
to authenticated
using (auth.uid() = (select owner_id from content where id = content_id))
with check (auth.uid() = (select owner_id from content where id = content_id));


/* 
unnest(new_template_ids) converts the array new_template_ids into a set of rows, one for each element in the array.
WITH ORDINALITY adds a column that provides a unique row number for each element in the set of rows produced by unnest. This row number starts at 1 and increments by 1 for each element.
AS t(template_id, idx) gives an alias t to the result set and assigns names to the columns. In this case:
template_id corresponds to the elements of the array.
idx corresponds to the ordinality (the row number).
So, t(template_id, idx) names the columns of the result set, making it clear which values are the template IDs and which are the corresponding indices. This naming allows you to refer to these columns in the SELECT clause for insertion into the content_templates table.
*/
CREATE OR REPLACE FUNCTION set_content_template_links(
    arg_content_id UUID,
    new_template_ids UUID[]
) RETURNS VOID AS $$
BEGIN
    -- Remove all existing links for the given content_id
    DELETE FROM content_templates WHERE content_id = arg_content_id;
    
    -- Insert new links for the new_template_ids with position
    IF array_length(new_template_ids, 1) IS NOT NULL THEN
        INSERT INTO content_templates (content_id, template_id, position)
        SELECT arg_content_id, template_id, idx - 1
        FROM unnest(new_template_ids) WITH ORDINALITY AS t(template_id, idx);
    END IF;
END;
$$ LANGUAGE plpgsql;


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

