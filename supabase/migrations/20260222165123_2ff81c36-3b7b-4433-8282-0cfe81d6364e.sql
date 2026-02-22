
-- OTA releases table
CREATE TABLE public.tv_ota_releases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL UNIQUE,
  version_code integer NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'stable',
  release_notes text,
  file_url text,
  file_size_bytes bigint,
  checksum_sha256 text,
  is_active boolean NOT NULL DEFAULT true,
  is_mandatory boolean NOT NULL DEFAULT false,
  min_version_code integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tv_ota_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tv_ota_releases"
ON public.tv_ota_releases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active releases"
ON public.tv_ota_releases FOR SELECT
USING (is_active = true);

CREATE INDEX idx_tv_ota_releases_channel_version ON public.tv_ota_releases (channel, version_code DESC);

CREATE TRIGGER update_tv_ota_releases_updated_at
BEFORE UPDATE ON public.tv_ota_releases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for OTA files
INSERT INTO storage.buckets (id, name, public) VALUES ('tv-ota', 'tv-ota', true);

CREATE POLICY "Admins can upload OTA files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tv-ota' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete OTA files"
ON storage.objects FOR DELETE
USING (bucket_id = 'tv-ota' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can download OTA files"
ON storage.objects FOR SELECT
USING (bucket_id = 'tv-ota');
