create table "public"."businesses" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "handle" text not null,
    "title" text not null,
    "description" text,
    "owner_id" uuid not null,
    "phone" text,
    "email" text not null,
    "inactive" boolean default false,
    "instagram_handle" text,
    "facebook_link" text,
    "tiktok_handle" text,
    "address" text,
    "city" text,
    "state" text,
    "zip" text,
    "country_code" text,
    "logo_url" text,
    "cover_photo_url" text,
    "stripe_account_id" text unique,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "stripe_default_payment_method_id" text,
    "verified" boolean default false
);
alter table "public"."businesses" enable row level security;

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
alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id);

CREATE UNIQUE INDEX businesses_handle_unique ON public.businesses USING btree (handle);

CREATE UNIQUE INDEX users_pkey ON public."users" USING btree (id);

alter table "public"."businesses" add constraint "businesses_pkey" PRIMARY KEY using index "businesses_pkey";
alter table "public"."businesses" add constraint "businesses_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES "users"(id) ON DELETE CASCADE not valid;
alter table "public"."businesses" validate constraint "businesses_owner_id_fkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

create policy "Enable read access for all users"
on "public"."businesses"
as permissive
for select
to public
using (true);

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