
-- Rate limiting table for TV API
CREATE TABLE public.tv_api_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES tv_api_keys(id) ON DELETE CASCADE,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.tv_api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tv_api_rate_limits"
ON public.tv_api_rate_limits FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_tv_api_rate_limits_key_window ON public.tv_api_rate_limits (api_key_id, window_start);

-- Auto-cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.tv_api_rate_limits
  WHERE window_start < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_rate_limits
AFTER INSERT ON public.tv_api_rate_limits
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_rate_limits();
