
-- Add tags column to playlists
ALTER TABLE public.playlists ADD COLUMN tags TEXT[] DEFAULT '{}';
