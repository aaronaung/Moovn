create table "public"."content_items" (
  "id" uuid primary key default gen_random_uuid(),
  "content_id" uuid not null references "public"."content" ("id") on delete cascade,
  "template_item_id" uuid references "public"."template_items" ("id") on delete cascade, -- nullable for non-auto-generated content items
  "type" text not null,
  "position" int not null,
  "hash" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

alter table "public"."content_items" enable row level security;
create policy "Enable owner access to content_items"
on "public"."content_items"
as permissive
for all
to authenticated
using (auth.uid() = (select owner_id from public.content where id = content_id))
with check (auth.uid() = (select owner_id from public.content where id = content_id));

alter table "public"."content" drop column "ig_caption";
alter table "public"."content" drop column "ig_tags";
alter table "public"."content" drop column "data_hash";
alter table "public"."content" add column "metadata" jsonb;

CREATE OR REPLACE FUNCTION update_content_items_position(
    items jsonb
)
RETURNS VOID AS $$
BEGIN
    -- Update the position for each item in the input array
    WITH input_items AS (
        SELECT 
            (item->>'id')::uuid AS id,
            (item->>'position')::int AS new_position
        FROM jsonb_array_elements(items) AS item
    )
    UPDATE public.content_items AS ci
    SET position = input_items.new_position
    FROM input_items
    WHERE ci.id = input_items.id;
END;
$$ LANGUAGE plpgsql;

