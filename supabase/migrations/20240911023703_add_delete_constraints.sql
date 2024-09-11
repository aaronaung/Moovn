-- Add ON DELETE CASCADE constraint to content table for template_id
ALTER TABLE content
DROP CONSTRAINT IF EXISTS content_template_id_fkey,
ADD CONSTRAINT content_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE CASCADE;

ALTER TABLE content
DROP CONSTRAINT IF EXISTS content_destination_id_fkey,
ADD CONSTRAINT content_destination_id_fkey
    FOREIGN KEY (destination_id)
    REFERENCES destinations(id)
    ON DELETE CASCADE;

ALTER TABLE content
DROP CONSTRAINT IF EXISTS content_source_id_fkey,
ADD CONSTRAINT content_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES sources(id)
    ON DELETE CASCADE;

ALTER TABLE content_schedules
DROP CONSTRAINT IF EXISTS content_schedules_content_id_fkey,
ADD CONSTRAINT content_schedules_content_id_fkey
    FOREIGN KEY (content_id)
    REFERENCES content(id)
    ON DELETE CASCADE;
