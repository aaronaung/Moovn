-- Rename invitations table to studio_instructor_links
ALTER TABLE invitations RENAME TO studio_instructor_links;

-- Rename the enum type to be more generic
ALTER TYPE invitation_status RENAME TO link_status;

-- Add new columns for source integration
ALTER TABLE studio_instructor_links 
ADD COLUMN source_id uuid REFERENCES sources(id) ON DELETE CASCADE,
ADD COLUMN id_in_source text;

-- Drop the old unique constraint
ALTER TABLE studio_instructor_links 
DROP CONSTRAINT invitations_unique_invitation;

-- Add new unique constraint that includes all the fields
ALTER TABLE studio_instructor_links 
ADD CONSTRAINT studio_instructor_links_unique_link 
UNIQUE (studio_id, instructor_id, instructor_email, source_id, id_in_source);

-- Create the signup linking function (since it doesn't exist yet)
CREATE OR REPLACE FUNCTION link_studio_instructor_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an instructor user
  IF NEW.type = 'instructor' AND NEW.email IS NOT NULL THEN
    -- Update any pending links with this email to include the instructor_id
    UPDATE studio_instructor_links 
    SET 
      instructor_id = NEW.id,
      instructor_email = NULL,
      updated_at = now()
    WHERE 
      instructor_email = NEW.email 
      AND instructor_id IS NULL 
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for signup linking
CREATE TRIGGER trigger_link_studio_instructor_on_signup
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION link_studio_instructor_on_signup();

-- Update trigger name for updated_at (it was renamed automatically with table)
DROP TRIGGER update_invitations_updated_at ON studio_instructor_links;
CREATE TRIGGER update_studio_instructor_links_updated_at
  BEFORE UPDATE ON studio_instructor_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update index names to match new table name
DROP INDEX idx_invitations_studio_id;
DROP INDEX idx_invitations_instructor_id;
DROP INDEX idx_invitations_status;
DROP INDEX idx_invitations_instructor_email;

CREATE INDEX idx_studio_instructor_links_studio_id ON studio_instructor_links(studio_id);
CREATE INDEX idx_studio_instructor_links_instructor_id ON studio_instructor_links(instructor_id);
CREATE INDEX idx_studio_instructor_links_status ON studio_instructor_links(status);
CREATE INDEX idx_studio_instructor_links_instructor_email ON studio_instructor_links(instructor_email) 
WHERE instructor_email IS NOT NULL;
CREATE INDEX idx_studio_instructor_links_source_id ON studio_instructor_links(source_id);

-- Update constraint names
ALTER TABLE studio_instructor_links 
RENAME CONSTRAINT check_different_users TO check_different_studio_instructor;

ALTER TABLE studio_instructor_links 
RENAME CONSTRAINT check_instructor_identification TO check_instructor_identification_method; 