
-- Add slide_data column for storing slide configuration
ALTER TABLE public.playlist_items ADD COLUMN slide_data JSONB;

-- Update check constraint to allow 'slide' media type
ALTER TABLE public.playlist_items DROP CONSTRAINT playlist_items_media_type_check;
ALTER TABLE public.playlist_items ADD CONSTRAINT playlist_items_media_type_check 
  CHECK (media_type IN ('image', 'video', 'audio', 'slide'));
