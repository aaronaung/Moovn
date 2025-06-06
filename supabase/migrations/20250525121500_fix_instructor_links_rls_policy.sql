-- Fix RLS policy for instructors to view their studio links
-- Allow access by both instructor_id and instructor_email

-- Drop the existing policy
DROP POLICY IF EXISTS "Instructors can view their own links" ON studio_instructor_links;

-- Create a new policy that allows instructors to view links by both ID and email
CREATE POLICY "Instructors can view their own links" ON studio_instructor_links
  FOR SELECT TO authenticated
  USING (
    auth.uid() = instructor_id 
    OR 
    (
      instructor_email IS NOT NULL 
      AND instructor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Also update the UPDATE policy to handle email-based access
DROP POLICY IF EXISTS "Instructors can update their own links" ON studio_instructor_links;

CREATE POLICY "Instructors can update their own links" ON studio_instructor_links
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = instructor_id 
    OR 
    (
      instructor_email IS NOT NULL 
      AND instructor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = instructor_id 
    OR 
    (
      instructor_email IS NOT NULL 
      AND instructor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  ); 