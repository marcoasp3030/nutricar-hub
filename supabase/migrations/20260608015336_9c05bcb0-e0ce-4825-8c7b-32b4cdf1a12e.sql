CREATE TABLE public.tv_playback_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.store_tv_units(id) ON DELETE CASCADE,
    playlist_item_id UUID REFERENCES public.playlist_items(id) ON DELETE SET NULL,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
    media_url TEXT,
    file_name TEXT,
    played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    duration_played_seconds INTEGER DEFAULT 0
);

GRANT SELECT, INSERT ON public.tv_playback_logs TO authenticated;
GRANT ALL ON public.tv_playback_logs TO service_role;

ALTER TABLE public.tv_playback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow playback log insertion for authenticated and service_role" 
ON public.tv_playback_logs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow playback log viewing for authenticated" 
ON public.tv_playback_logs FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create a view for easier statistics
CREATE OR REPLACE VIEW public.tv_playback_stats AS
SELECT 
    playlist_item_id,
    file_name,
    media_url,
    playlist_id,
    COUNT(*) as play_count,
    SUM(duration_played_seconds) as total_duration_seconds,
    MIN(played_at) as first_played_at,
    MAX(played_at) as last_played_at
FROM 
    public.tv_playback_logs
GROUP BY 
    playlist_item_id, file_name, media_url, playlist_id;

GRANT SELECT ON public.tv_playback_stats TO authenticated;
GRANT SELECT ON public.tv_playback_stats TO service_role;
