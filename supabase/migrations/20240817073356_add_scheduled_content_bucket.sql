insert into storage.buckets
  (id, name)
values
  ('scheduled_content', 'scheduled_content')
on conflict (id) do nothing;

create policy "Enable read to owner of the scheduled_content"
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'scheduled_content' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable delete to owner of the scheduled_content"
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'scheduled_content' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable update to owner of the scheduled_content"
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'scheduled_content' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
)
with check(
    bucket_id = 'scheduled_content' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable insert to owner of the scheduled_content"
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'scheduled_content' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);