-- Add RLS policies for studio_instructor_links table

-- Policy for studios to insert their own links
CREATE POLICY "Studios can create their own instructor links" ON studio_instructor_links
  FOR INSERT WITH CHECK (auth.uid() = studio_id);

-- Policy for studios to view their own links
CREATE POLICY "Studios can view their own instructor links" ON studio_instructor_links
  FOR SELECT USING (auth.uid() = studio_id);

-- Policy for studios to update their own links
CREATE POLICY "Studios can update their own instructor links" ON studio_instructor_links
  FOR UPDATE USING (auth.uid() = studio_id) WITH CHECK (auth.uid() = studio_id);

-- Policy for studios to delete their own links
CREATE POLICY "Studios can delete their own instructor links" ON studio_instructor_links
  FOR DELETE USING (auth.uid() = studio_id);

-- Policy for instructors to view links where they are the instructor
CREATE POLICY "Instructors can view their own links" ON studio_instructor_links
  FOR SELECT USING (auth.uid() = instructor_id);

-- Policy for instructors to update their own links (e.g., accept/deny invitations)
CREATE POLICY "Instructors can update their own links" ON studio_instructor_links
  FOR UPDATE USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id); 