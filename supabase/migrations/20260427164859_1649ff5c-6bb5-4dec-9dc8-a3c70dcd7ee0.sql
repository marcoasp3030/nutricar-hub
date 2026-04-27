DROP POLICY IF EXISTS "Promoters can view published jobs" ON public.event_jobs;

CREATE POLICY "Promoters can view published jobs"
ON public.event_jobs
FOR SELECT
TO authenticated
USING (
  (status <> 'rascunho'::job_status)
  AND (
    visibility = 'aberto'::job_visibility
    OR EXISTS (
      SELECT 1 FROM public.job_invites ji
      WHERE ji.job_id = event_jobs.id
        AND ji.promoter_id IN (
          SELECT pp.id FROM public.promoter_profiles pp
          WHERE pp.user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.job_assignments ja
      WHERE ja.job_id = event_jobs.id
        AND ja.promoter_id IN (
          SELECT pp.id FROM public.promoter_profiles pp
          WHERE pp.user_id = auth.uid()
        )
    )
  )
);