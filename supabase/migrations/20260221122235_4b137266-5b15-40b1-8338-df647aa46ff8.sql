ALTER TABLE public.playlists ADD COLUMN media_fit text NOT NULL DEFAULT 'contain';
ALTER TABLE public.playlists ADD COLUMN bg_color text NOT NULL DEFAULT '#000000';