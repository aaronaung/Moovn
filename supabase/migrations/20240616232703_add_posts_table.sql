create table "public"."posts" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null,
  "destination_id" uuid not null,
  "caption" text,
  "source_data_view" text not null,
  "last_published_at" timestamp with time zone,
  "published_ig_media_id" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create unique index if not exists posts_pkey on public."posts" using btree (id);
alter table "public"."posts" add constraint "posts_destination_id_foreign" foreign key ("destination_id") references "public"."destinations" ("id") on delete cascade;
alter table "public"."posts" add constraint "posts_owner_id_foreign" foreign key ("owner_id") references "public"."users" ("id") on delete cascade;

alter table "public"."posts" enable row level security;
create policy "Enable owner access to posts"
on "public"."posts"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create table "public"."posts_templates" (
  "post_id" uuid not null,
  "template_id" uuid not null,
  "position" integer not null default 0,
  "created_at" timestamp with time zone default now()
);
create unique index if not exists posts_templates_pkey on public."posts_templates" using btree (post_id, template_id);
alter table "public"."posts_templates" add constraint "posts_templates_pkey" primary key using index "posts_templates_pkey";
alter table "public"."posts_templates" add constraint "posts_templates_post_id_foreign" foreign key ("post_id") references "public"."posts" ("id") on delete cascade;
alter table "public"."posts_templates" add constraint "posts_templates_template_id_foreign" foreign key ("template_id") references "public"."templates" ("id") on delete cascade;

alter table "public"."posts_templates" enable row level security;
create policy "Enable owner access to posts_templates"
on "public"."posts_templates"
as permissive
for all
to authenticated
using (auth.uid() = (select owner_id from posts where id = post_id))
with check (auth.uid() = (select owner_id from posts where id = post_id));


/* 
unnest(new_template_ids) converts the array new_template_ids into a set of rows, one for each element in the array.
WITH ORDINALITY adds a column that provides a unique row number for each element in the set of rows produced by unnest. This row number starts at 1 and increments by 1 for each element.
AS t(template_id, idx) gives an alias t to the result set and assigns names to the columns. In this case:
template_id corresponds to the elements of the array.
idx corresponds to the ordinality (the row number).
So, t(template_id, idx) names the columns of the result set, making it clear which values are the template IDs and which are the corresponding indices. This naming allows you to refer to these columns in the SELECT clause for insertion into the posts_templates table.
*/
CREATE OR REPLACE FUNCTION set_template_links(
    arg_post_id UUID,
    new_template_ids UUID[]
) RETURNS VOID AS $$
BEGIN
    -- Remove all existing links for the given post_id
    DELETE FROM posts_templates WHERE post_id = arg_post_id;
    
    -- Insert new links for the new_template_ids with position
    IF array_length(new_template_ids, 1) IS NOT NULL THEN
        INSERT INTO posts_templates (post_id, template_id, position)
        SELECT arg_post_id, template_id, idx - 1
        FROM unnest(new_template_ids) WITH ORDINALITY AS t(template_id, idx);
    END IF;
END;
$$ LANGUAGE plpgsql;


insert into storage.buckets
  (id, name)
values
  ('posts', 'posts')
on conflict (id) do nothing;

create policy "Enable read to owner of the posts"
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'posts' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable delete to owner of the posts"
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'posts' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable update to owner of the posts"
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'posts' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
)
with check(
    bucket_id = 'posts' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable insert to owner of the posts"
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'posts' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);

