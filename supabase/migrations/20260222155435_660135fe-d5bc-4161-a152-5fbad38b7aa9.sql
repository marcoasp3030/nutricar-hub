
-- Log de eventos de conectividade das TVs
CREATE TABLE public.tv_connectivity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES public.store_tv_units(id) ON DELETE CASCADE,
  status text NOT NULL, -- 'online' or 'offline'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by unit
CREATE INDEX idx_tv_connectivity_log_unit ON public.tv_connectivity_log(unit_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.tv_connectivity_log ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage tv_connectivity_log"
  ON public.tv_connectivity_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_connectivity_log;
