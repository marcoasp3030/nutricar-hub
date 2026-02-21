
-- Storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- Allow authenticated users to upload media
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow public read access to media
CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow admins to delete media
CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- Playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_start TIME,
  schedule_end TIME,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage playlists"
ON public.playlists FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active playlists"
ON public.playlists FOR SELECT
USING (is_active = true);

-- Playlist items (media entries within a playlist)
CREATE TABLE public.playlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  media_url TEXT NOT NULL,
  file_name TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 5,
  transition TEXT NOT NULL DEFAULT 'fade' CHECK (transition IN ('fade', 'slide', 'zoom', 'none')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage playlist items"
ON public.playlist_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view playlist items"
ON public.playlist_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.playlists p 
  WHERE p.id = playlist_id AND p.is_active = true
));

-- Trigger for updated_at on playlists
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
