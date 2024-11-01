create table source_syncs (
    id uuid primary key default gen_random_uuid(),
    source_id uuid not null references sources(id),
    status text not null,
    duration_ms bigint default 0,
    errors jsonb, 
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create index source_syncs_source_id_idx on source_syncs (source_id);

-- Add trigger to content table
CREATE TRIGGER update_source_syncs_updated_at
BEFORE UPDATE ON public.source_syncs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

alter table "public"."source_syncs" enable row level security;
create policy "Enable owner access to source_syncs"
on "public"."source_syncs"
as permissive
for all
to authenticated
using (auth.uid() = (select owner_id from sources where id = source_id))
with check (auth.uid() = (select owner_id from sources where id = source_id));
