alter table "public"."content_schedules" enable row level security;
create policy "Enable owner access to content_schedules"
on "public"."content_schedules"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);