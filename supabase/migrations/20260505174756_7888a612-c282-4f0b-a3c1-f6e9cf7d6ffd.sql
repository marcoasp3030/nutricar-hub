ALTER TABLE public.ad_packages
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS billing_label text;

ALTER TABLE public.ad_package_templates
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS billing_label text;

ALTER TABLE public.ad_contracts
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1;