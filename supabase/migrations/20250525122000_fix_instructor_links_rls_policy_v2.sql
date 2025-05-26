-- Fix RLS policy for instructors to view their studio links
-- Use auth.email() instead of accessing auth.users table directly

-- Drop the existing policies
DROP POLICY IF EXISTS "Instructors can view their own links" ON studio_instructor_links;
DROP POLICY IF EXISTS "Instructors can update their own links" ON studio_instructor_links;

-- Create a new policy that allows instructors to view links by both ID and email
CREATE POLICY "Instructors can view their own links" ON studio_instructor_links
  FOR SELECT TO authenticated
  USING (
    auth.uid() = instructor_id 
    OR 
    (
      instructor_email IS NOT NULL 
      AND instructor_email = auth.email()
    )
  );

-- Create a new policy that allows instructors to update links by both ID and email
CREATE POLICY "Instructors can update their own links" ON studio_instructor_links
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = instructor_id 
    OR 
    (
      instructor_email IS NOT NULL 
      AND instructor_email = auth.email()
    )
  )
  WITH CHECK (
    auth.uid() = instructor_id 
    OR 
    (
      instructor_email IS NOT NULL 
      AND instructor_email = auth.email()
    )
  ); 