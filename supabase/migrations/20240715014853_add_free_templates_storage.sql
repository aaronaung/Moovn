insert into storage.buckets
  (id, name)
values
  ('free_design_templates', 'free_design_templates')
on conflict (id) do nothing;

create policy "Enable all authenticated users access to the free_design_templates"
on storage.objects
as permissive
for all
to authenticated
using (bucket_id = 'free_design_templates')
with check (bucket_id = 'free_design_templates');