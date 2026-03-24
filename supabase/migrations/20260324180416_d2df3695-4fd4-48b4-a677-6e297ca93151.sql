
CREATE POLICY "Users can delete own instances"
ON public.checklist_instances
FOR DELETE
TO public
USING (created_by = auth.uid());

CREATE POLICY "Admins can delete checklist_instances"
ON public.checklist_instances
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
