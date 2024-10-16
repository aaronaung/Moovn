-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to content table
CREATE TRIGGER update_content_updated_at
BEFORE UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to content_items table
CREATE TRIGGER update_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to template_items table
CREATE TRIGGER update_template_items_updated_at
BEFORE UPDATE ON public.template_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to template_item_design_requests table
CREATE TRIGGER update_template_item_design_requests_updated_at
BEFORE UPDATE ON public.template_item_design_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to content_schedules table
CREATE TRIGGER update_content_schedules_updated_at
BEFORE UPDATE ON public.content_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to destinations table
CREATE TRIGGER update_destinations_updated_at
BEFORE UPDATE ON public.destinations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Add trigger to sources table
CREATE TRIGGER update_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to templates table
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

