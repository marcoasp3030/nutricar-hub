ALTER TABLE public.ad_packages
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS screen_position text DEFAULT 'tela_cheia',
  ADD COLUMN IF NOT EXISTS display_schedule text DEFAULT 'integral',
  ADD COLUMN IF NOT EXISTS content_format text DEFAULT '16:9',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];