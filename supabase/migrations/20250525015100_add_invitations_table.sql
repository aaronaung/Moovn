-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'denied');

-- Create invitations table
CREATE TABLE invitations (
  studio_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Composite primary key
  PRIMARY KEY (studio_id, instructor_id)
);

-- Add RLS (Row Level Security)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Add update trigger for updated_at
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX idx_invitations_studio_id ON invitations(studio_id);
CREATE INDEX idx_invitations_instructor_id ON invitations(instructor_id);
CREATE INDEX idx_invitations_status ON invitations(status);

-- Ensure studio and instructor are different users
ALTER TABLE invitations 
ADD CONSTRAINT check_different_users 
CHECK (studio_id != instructor_id); 