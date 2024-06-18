create table "public"."posts" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid not null,
  "destination_id" uuid not null,
  "caption" text,
  "source_data_view" text not null,
  "last_published_at" timestamp with time zone,
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

CREATE OR REPLACE FUNCTION manage_post_template_links(
    arg_post_id UUID,
    added_template_ids UUID[],
    removed_template_ids UUID[]
) RETURNS VOID AS $$
BEGIN
    -- Remove all existing links for the given post_id
    DELETE FROM posts_templates WHERE post_id = arg_post_id;
    
    -- Insert new links for the added_template_ids
    IF array_length(added_template_ids, 1) IS NOT NULL THEN
        INSERT INTO posts_templates (post_id, template_id)
        SELECT arg_post_id, unnest(added_template_ids);
    END IF;
    
    -- Remove specific links for the removed_template_ids
    IF array_length(removed_template_ids, 1) IS NOT NULL THEN
        DELETE FROM posts_templates
        WHERE post_id = arg_post_id AND template_id = ANY(removed_template_ids);
    END IF;
END;
$$ LANGUAGE plpgsql;


