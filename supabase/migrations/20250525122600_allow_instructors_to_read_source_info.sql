-- Allow instructors to read source information for studios they are linked to

CREATE POLICY "Instructors can read linked studio sources" ON sources
  FOR SELECT TO authenticated
  USING (
    -- Allow reading sources if the current user is an instructor linked to the studio that owns the source
    owner_id IN (
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