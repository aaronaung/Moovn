create table "public"."template_items" (
  "id" uuid primary key default gen_random_uuid(),
  "template_id" uuid not null references "public"."templates" ("id") on delete cascade,
  "position" int not null,
  "type" text not null,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
alter table "public"."template_items" enable row level security;
create policy "Enable owner access to template_items"
on "public"."template_items"
as permissive
for all
to authenticated
using (auth.uid() = (select owner_id from public.templates where id = template_id))
with check (auth.uid() = (select owner_id from public.templates where id = template_id));

CREATE OR REPLACE FUNCTION update_template_items_position(
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
    UPDATE public.template_items AS ti
    SET position = input_items.new_position
    FROM input_items
    WHERE ti.id = input_items.id;
END;
$$ LANGUAGE plpgsql;


