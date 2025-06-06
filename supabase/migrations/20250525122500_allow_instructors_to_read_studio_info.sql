-- Allow instructors to read studio user information for studios they are linked to

CREATE POLICY "Instructors can read linked studio information" ON users
  FOR SELECT TO authenticated
  USING (
    -- Allow reading studio users if the current user is an instructor linked to that studio
    type = 'studio' 
    AND id IN (
      SELECT studio_id 
      FROM studio_instructor_links 
      WHERE (
        instructor_id = auth.uid() 
        OR 
        (
          instructor_email IS NOT NULL 
          AND instructor_email = auth.email()
        )
      )
    )
  ); 