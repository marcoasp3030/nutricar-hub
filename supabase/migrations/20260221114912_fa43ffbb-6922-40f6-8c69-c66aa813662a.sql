
-- Add logo overlay fields to playlists table
ALTER TABLE public.playlists
  ADD COLUMN logo_url TEXT DEFAULT '',
  ADD COLUMN logo_position TEXT DEFAULT 'top-right',
  ADD COLUMN logo_size INTEGER DEFAULT 80,
  ADD COLUMN logo_opacity INTEGER DEFAULT 100;
