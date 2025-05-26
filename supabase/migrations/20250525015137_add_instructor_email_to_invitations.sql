-- Add instructor_email column to invitations table
ALTER TABLE invitations 
ADD COLUMN instructor_email text;

-- Drop the existing primary key first
ALTER TABLE invitations DROP CONSTRAINT invitations_pkey;

-- Now make instructor_id nullable since we might not have it initially
ALTER TABLE invitations 
ALTER COLUMN instructor_id DROP NOT NULL;

-- Add a new primary key using studio_id and a generated ID
-- Since we can't have a composite key with nullable columns
ALTER TABLE invitations 
ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;

-- Add a unique constraint that handles both cases
-- Either we have instructor_id OR instructor_email (but not both null)
ALTER TABLE invitations 
ADD CONSTRAINT invitations_unique_invitation 
UNIQUE (studio_id, instructor_id, instructor_email);

-- Add check constraint to ensure we have either instructor_id OR instructor_email
ALTER TABLE invitations 
ADD CONSTRAINT check_instructor_identification 
CHECK (
  (instructor_id IS NOT NULL AND instructor_email IS NULL) OR 
  (instructor_id IS NULL AND instructor_email IS NOT NULL)
);

-- Create function to link invitations when instructor signs up
CREATE OR REPLACE FUNCTION link_invitations_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an instructor user
  IF NEW.type = 'instructor' AND NEW.email IS NOT NULL THEN
    -- Update any pending invitations with this email to include the instructor_id
    UPDATE invitations 
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

-- Create trigger that fires after user insert
CREATE TRIGGER trigger_link_invitations_on_signup
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION link_invitations_on_signup();

-- Add index for better performance on email lookups
CREATE INDEX idx_invitations_instructor_email ON invitations(instructor_email) 
WHERE instructor_email IS NOT NULL; 