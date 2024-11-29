-- Drop existing foreign key constraints
ALTER TABLE content
DROP CONSTRAINT IF EXISTS content_template_id_fkey,
DROP CONSTRAINT IF EXISTS content_destination_id_fkey;

-- Modify columns to be nullable
ALTER TABLE content
ALTER COLUMN template_id DROP NOT NULL,
ALTER COLUMN destination_id DROP NOT NULL;

-- Re-add foreign key constraints with ON DELETE SET NULL
ALTER TABLE content
ADD CONSTRAINT content_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE SET NULL;

ALTER TABLE content
ADD CONSTRAINT content_destination_id_fkey
    FOREIGN KEY (destination_id)
    REFERENCES destinations(id)
    ON DELETE SET NULL;

ALTER TABLE content ADD COLUMN title TEXT;

-- Create function and trigger to handle destination deletion
CREATE OR REPLACE FUNCTION handle_destination_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete content rows that have pending schedules and match the deleted destination
    DELETE FROM content 
    WHERE id IN (
        SELECT c.id
        FROM content c
        INNER JOIN content_schedules cs ON cs.content_id = c.id
        WHERE c.destination_id = OLD.id
        AND cs.status = 'Pending'
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS destination_deletion_trigger ON destinations;
CREATE TRIGGER destination_deletion_trigger
    BEFORE DELETE ON destinations
    FOR EACH ROW
    EXECUTE FUNCTION handle_destination_deletion();
