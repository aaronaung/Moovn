-- Create enum type for user types
create type user_type as enum ('studio', 'instructor');

-- Add type column to users table (not nullable, default to 'studio')
alter table "public"."users" 
add column "type" user_type not null default 'studio';

-- Add handle column to users table (nullable, unique)
alter table "public"."users" 
add column "handle" text unique;