-- Drop existing foreign key constraints for content table
ALTER TABLE content 
DROP CONSTRAINT IF EXISTS content_destination_id_fkey,
DROP CONSTRAINT IF EXISTS content_source_id_fkey,
DROP CONSTRAINT IF EXISTS content_template_id_fkey;

-- Add ON DELETE SET NULL constraints for content table
ALTER TABLE content
ADD CONSTRAINT content_destination_id_fkey 
    FOREIGN KEY (destination_id) 
    REFERENCES destinations(id) 
    ON DELETE SET NULL,
ADD CONSTRAINT content_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES sources(id)
    ON DELETE SET NULL,
ADD CONSTRAINT content_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE SET NULL;

-- Drop existing foreign key constraints for content_items table
ALTER TABLE content_items
DROP CONSTRAINT IF EXISTS content_items_content_id_fkey,
DROP CONSTRAINT IF EXISTS content_items_template_item_id_fkey;

-- Add ON DELETE SET NULL constraints for content_items table
ALTER TABLE content_items
ADD CONSTRAINT content_items_content_id_fkey
    FOREIGN KEY (content_id)
    REFERENCES content(id)
    ON DELETE CASCADE, -- If content is deleted, delete the content item.
ADD CONSTRAINT content_items_template_item_id_fkey
    FOREIGN KEY (template_item_id)
    REFERENCES template_items(id)
    ON DELETE SET NULL;
