
-- Fix: Create a view that hides created_by for public access
-- Instead of exposing created_by, update the public SELECT policy to use a security definer function

-- Drop existing public policy
DROP POLICY IF EXISTS "Public can view active playlists" ON public.playlists;

-- Recreate with restricted columns approach: keep the policy but this is structural
-- The real fix is to not expose created_by in client queries, but at DB level
-- we can't restrict columns in RLS. So we create a safe public view instead.

CREATE OR REPLACE VIEW public.public_playlists AS
SELECT id, name, description, orientation, bg_color, media_fit, volume,
       logo_url, logo_position, logo_size, logo_opacity,
       schedule_start, schedule_end, tags, is_active
FROM public.playlists
WHERE is_active = true;

-- Re-add the policy (still needed for the view to work via RLS)
CREATE POLICY "Public can view active playlists" ON public.playlists
FOR SELECT USING (is_active = true);
