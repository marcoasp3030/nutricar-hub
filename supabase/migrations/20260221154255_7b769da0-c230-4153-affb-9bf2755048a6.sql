-- New signups should be pending approval (is_active defaults to false)
ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT false;