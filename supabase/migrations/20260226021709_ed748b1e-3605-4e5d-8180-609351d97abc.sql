
-- Add is_public flag to checklist_instances
ALTER TABLE public.checklist_instances ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Allow public (unauthenticated) access to public checklist instances
CREATE POLICY "Public can view public instances" ON public.checklist_instances FOR SELECT USING (is_public = true);
CREATE POLICY "Public can update public instances" ON public.checklist_instances FOR UPDATE USING (is_public = true);

-- Allow public access to response items of public instances
CREATE POLICY "Public can view public response_items" ON public.checklist_response_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.is_public = true)
);
CREATE POLICY "Public can update public response_items" ON public.checklist_response_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.is_public = true)
);
CREATE POLICY "Public can insert public response_items" ON public.checklist_response_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.is_public = true)
);

-- Allow public insert on audit log for public checklists
CREATE POLICY "Public can insert audit for public instances" ON public.checklist_audit_log FOR INSERT WITH CHECK (
  instance_id IS NOT NULL AND EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.is_public = true)
);
