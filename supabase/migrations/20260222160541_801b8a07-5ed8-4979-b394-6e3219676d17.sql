-- Add registration_status to profiles to distinguish pending, rejected, approved
ALTER TABLE public.profiles 
ADD COLUMN registration_status text NOT NULL DEFAULT 'pending';

-- Set existing active users to 'approved'
UPDATE public.profiles SET registration_status = 'approved' WHERE is_active = true;
