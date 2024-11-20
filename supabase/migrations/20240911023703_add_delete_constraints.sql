-- Add ON DELETE CASCADE constraint to content table for template_id
ALTER TABLE content_schedules
DROP CONSTRAINT IF EXISTS content_schedules_content_id_fkey,
ADD CONSTRAINT content_schedules_content_id_fkey
    FOREIGN KEY (content_id)
    REFERENCES content(id)
    ON DELETE CASCADE;
