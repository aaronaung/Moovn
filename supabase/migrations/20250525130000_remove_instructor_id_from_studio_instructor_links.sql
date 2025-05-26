-- Remove instructor_id column from studio_instructor_links table
-- This simplifies the system to rely only on instructor_email

-- Drop the auto-linking trigger and function since we no longer need it
DROP TRIGGER IF EXISTS trigger_link_studio_instructor_on_signup ON users;
DROP FUNCTION IF EXISTS link_studio_instructor_on_signup();

-- Drop policies on other tables that depend on instructor_id
DROP POLICY IF EXISTS "Instructors can read linked studio information" ON users;
DROP POLICY IF EXISTS "Instructors can read linked studio sources" ON sources;

-- Drop existing RLS policies that reference instructor_id
DROP POLICY IF EXISTS "Instructors can view their own links" ON studio_instructor_links;
DROP POLICY IF EXISTS "Instructors can update their own links" ON studio_instructor_links;

-- Drop the unique constraint that includes instructor_id
ALTER TABLE studio_instructor_links 
DROP CONSTRAINT IF EXISTS studio_instructor_links_unique_link;

-- Drop the check constraint that required either instructor_id OR instructor_email
ALTER TABLE studio_instructor_links 
DROP CONSTRAINT IF EXISTS check_instructor_identification_method;

-- Drop the foreign key constraint for instructor_id
ALTER TABLE studio_instructor_links 
DROP CONSTRAINT IF EXISTS invitations_instructor_id_fkey;

-- Drop the instructor_id column
ALTER TABLE studio_instructor_links 
DROP COLUMN IF EXISTS instructor_id;

-- Make instructor_email required (NOT NULL)
ALTER TABLE studio_instructor_links 
ALTER COLUMN instructor_email SET NOT NULL;

-- Add new unique constraint without instructor_id
ALTER TABLE studio_instructor_links 
ADD CONSTRAINT studio_instructor_links_unique_link 
UNIQUE (studio_id, instructor_email, source_id, id_in_source);

-- Drop the old index for instructor_id
DROP INDEX IF EXISTS idx_studio_instructor_links_instructor_id;

-- Create new RLS policies for instructors using only email
CREATE POLICY "Instructors can view their own links by email" ON studio_instructor_links
  FOR SELECT TO authenticated
  USING (
    instructor_email IS NOT NULL 
    AND instructor_email = auth.email()
  );

CREATE POLICY "Instructors can update their own links by email" ON studio_instructor_links
  FOR UPDATE TO authenticated
  USING (
    instructor_email IS NOT NULL 
    AND instructor_email = auth.email()
  )
  WITH CHECK (
    instructor_email IS NOT NULL 
    AND instructor_email = auth.email()
  );

-- Recreate the policies for users and sources tables using email instead of instructor_id
CREATE POLICY "Instructors can read linked studio information" ON users
  FOR SELECT TO authenticated
  USING (
    -- Allow reading studio users if the current user is an instructor linked to that studio
    type = 'studio' 
    AND id IN (
      SELECT studio_id 
      FROM studio_instructor_links 
      WHERE instructor_email = auth.email()
    )
  );

CREATE POLICY "Instructors can read linked studio sources" ON sources
  FOR SELECT TO authenticated
  USING (
    -- Allow reading sources if the current user is an instructor linked to the studio that owns the source
    owner_id IN (
      SELECT studio_id 
      FROM studio_instructor_links 
      WHERE instructor_email = auth.email()
    )
  ); 