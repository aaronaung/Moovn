create table "public"."users" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "email" text,
  "first_name" text,
  "last_name" text,
  "avatar_url" text,
  "email_verified_at" timestamp with time zone
);
create unique index users_pkey on public."users" using btree (id);
alter table "public"."users" add constraint "users_pkey" primary key using index "users_pkey";

alter table "public"."users" enable row level security;
create policy "Enable owner access to users"
on "public"."users"
as permissive
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

--------------------------------------------
create table "public"."sources" (
  "id" uuid not null default gen_random_uuid(),
  "owner_id" uuid not null,
  "type" text not null,
  "settings" jsonb not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create unique index sources_pkey on public."sources" using btree (id);
alter table "public"."sources" add constraint "sources_pkey" primary key using index "sources_pkey";
alter table "public"."sources" add constraint "sources_owner_id_foreign" foreign key ("owner_id") references "public"."users" ("id") on delete cascade;

alter table "public"."sources" enable row level security;
create policy "Enable owner access to sources"
on "public"."sources"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

--------------------------------------------
create table "public"."templates" (
  "id" uuid not null default gen_random_uuid(),
  "owner_id" uuid not null,
  "source_id" uuid not null,
  "name" text not null,
  "source_data_view" text not null, -- Daily, Weekly, Monthly
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create unique index templates_pkey on public."templates" using btree (id);
alter table "public"."templates" add constraint "templates_pkey" primary key using index "templates_pkey";
alter table "public"."templates" add constraint "templates_source_id_foreign" foreign key ("source_id") references "public"."sources" ("id");
alter table "public"."templates" add constraint "templates_owner_id_foreign" foreign key ("owner_id") references "public"."users" ("id") on delete cascade;

alter table "public"."templates" enable row level security;
create policy "Enable owner access to templates"
on "public"."templates"
as permissive
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

--------------------------------------------
create table "public"."design_jobs" (
  "id" text not null,  -- This is a hash value used to identify a design: md5Hash(template_id, schedule_data)
  "template_id" uuid not null,
  "raw_result" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create unique index design_jobs_pkey on public."design_jobs" using btree (id);
alter table "public"."design_jobs" add constraint "design_jobs_pkey" primary key using index "design_jobs_pkey";
alter table "public"."design_jobs" add constraint "design_jobs_template_id_foreign" foreign key ("template_id") references "public"."templates" ("id") on delete cascade;

alter table "public"."design_jobs" enable row level security;
create policy "Enable owner access to design jobs"
on "public"."design_jobs"
as permissive
for all
to authenticated
using (auth.uid() = (select owner_id from templates where id = template_id))
with check (auth.uid() = (select owner_id from templates where id = template_id));
/**
* This trigger automatically creates a user entry when a new user signs up via Supabase Auth.
*/ 
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, first_name, last_name, email) 
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name', new.email);
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--------------------------------------------
insert into storage.buckets
  (id, name)
values
  ('templates', 'templates')
on conflict (id) do nothing;

create policy "Enable select to owner of the templates"
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'templates' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable delete to owner of the templates"
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'templates' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable update to owner of the templates"
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'templates' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
)
with check (
    bucket_id = 'templates' and 
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable insert to owner of the templates"
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'templates' and 
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);

--------------------------------------------
insert into storage.buckets
  (id, name)
values
  ('designs', 'designs')
on conflict (id) do nothing;

create policy "Enable read to owner of the designs"
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'designs' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable delete to owner of the designs"
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'designs' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable update to owner of the designs"
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'designs' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
)
with check(
    bucket_id = 'designs' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);
create policy "Enable insert to owner of the designs"
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'designs' and
    auth.uid() = (select id from users where id = (storage.foldername(name))[1]::uuid) 
);


