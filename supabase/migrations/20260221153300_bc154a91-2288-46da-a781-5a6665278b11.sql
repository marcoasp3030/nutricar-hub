
-- Fix SECURITY DEFINER view by setting security_invoker
ALTER VIEW public.public_playlists SET (security_invoker = on);
