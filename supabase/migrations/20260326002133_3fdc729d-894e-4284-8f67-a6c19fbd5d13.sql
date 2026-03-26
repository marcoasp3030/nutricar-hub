
CREATE TABLE public.ad_package_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  display_frequency TEXT NOT NULL DEFAULT '30s a cada 5 min',
  media_type TEXT DEFAULT 'video',
  screen_position TEXT DEFAULT 'tela_cheia',
  display_schedule TEXT DEFAULT 'integral',
  content_format TEXT DEFAULT '16:9',
  tags TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_package_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad_package_templates"
  ON public.ad_package_templates FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
