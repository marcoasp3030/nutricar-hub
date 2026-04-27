ALTER TABLE public.promoter_profiles ADD COLUMN IF NOT EXISTS is_leader boolean NOT NULL DEFAULT false;
ALTER TABLE public.event_jobs ADD COLUMN IF NOT EXISTS leader_bonus numeric NOT NULL DEFAULT 0;