
ALTER TABLE public.ad_payments 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'pix',
ADD COLUMN IF NOT EXISTS receipt_url text;
