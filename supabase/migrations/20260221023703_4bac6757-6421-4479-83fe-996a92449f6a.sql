-- Add orientation column to playlists
ALTER TABLE public.playlists ADD COLUMN orientation text NOT NULL DEFAULT 'horizontal';
