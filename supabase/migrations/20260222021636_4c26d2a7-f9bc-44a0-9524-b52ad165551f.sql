
ALTER TABLE public.store_tvs
ADD COLUMN playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL;
