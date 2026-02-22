
-- API Keys table for TV app authentication
CREATE TABLE public.tv_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label TEXT NOT NULL DEFAULT 'Chave padrão',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.tv_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tv_api_keys"
ON public.tv_api_keys FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Commands table for sending instructions to TVs
CREATE TABLE public.tv_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.store_tv_units(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.tv_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tv_commands"
ON public.tv_commands FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Logs table for TV metrics and error reports
CREATE TABLE public.tv_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.store_tv_units(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  event TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tv_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tv_logs"
ON public.tv_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast command polling
CREATE INDEX idx_tv_commands_pending ON public.tv_commands (unit_id, status) WHERE status = 'pending';

-- Index for fast log querying
CREATE INDEX idx_tv_logs_unit ON public.tv_logs (unit_id, created_at DESC);

-- Index for API key lookup
CREATE INDEX idx_tv_api_keys_active ON public.tv_api_keys (api_key) WHERE is_active = true;
