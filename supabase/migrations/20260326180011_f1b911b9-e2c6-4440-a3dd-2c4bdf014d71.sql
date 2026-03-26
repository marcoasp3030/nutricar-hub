
-- Table for custom field definitions
CREATE TABLE public.ad_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT '{}'::text[],
  applies_to text NOT NULL DEFAULT 'both',
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad_field_definitions"
  ON public.ad_field_definitions FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view active field definitions"
  ON public.ad_field_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add custom_fields JSONB to ad_packages and ad_package_templates
ALTER TABLE public.ad_packages ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ad_package_templates ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;
