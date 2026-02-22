
CREATE TABLE public.store_tvs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL,
  tv_quantity INTEGER NOT NULL DEFAULT 1,
  tv_format TEXT NOT NULL DEFAULT 'horizontal',
  tv_model TEXT,
  tv_inches INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_tvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_tvs"
  ON public.store_tvs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_store_tvs_updated_at
  BEFORE UPDATE ON public.store_tvs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
