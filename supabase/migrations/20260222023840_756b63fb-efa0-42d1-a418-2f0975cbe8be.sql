
CREATE TABLE public.store_tv_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_tvs(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'TV 1',
  tv_format TEXT NOT NULL DEFAULT 'horizontal',
  tv_model TEXT,
  tv_inches INTEGER,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_tv_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_tv_units"
  ON public.store_tv_units FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_store_tv_units_updated_at
  BEFORE UPDATE ON public.store_tv_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
