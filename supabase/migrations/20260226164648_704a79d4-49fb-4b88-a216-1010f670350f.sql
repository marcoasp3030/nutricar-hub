
-- Function to recalculate avg_rating and total_jobs on promoter_profiles
CREATE OR REPLACE FUNCTION public.update_promoter_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _promoter_id uuid;
BEGIN
  _promoter_id := COALESCE(NEW.promoter_id, OLD.promoter_id);
  
  UPDATE public.promoter_profiles
  SET 
    avg_rating = COALESCE((
      SELECT AVG(admin_rating)::numeric 
      FROM public.job_assignments 
      WHERE promoter_id = _promoter_id 
        AND admin_rating IS NOT NULL 
        AND admin_rating > 0
        AND status != 'cancelado'
    ), 0),
    total_jobs = (
      SELECT COUNT(*) 
      FROM public.job_assignments 
      WHERE promoter_id = _promoter_id 
        AND status IN ('confirmado', 'reservado')
    ),
    updated_at = now()
  WHERE id = _promoter_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on job_assignments insert/update/delete
CREATE TRIGGER trg_update_promoter_stats
AFTER INSERT OR UPDATE OR DELETE ON public.job_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_promoter_stats();
