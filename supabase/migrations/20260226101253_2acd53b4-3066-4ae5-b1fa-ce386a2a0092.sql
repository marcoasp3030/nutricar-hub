
-- Add assigned_to column to checklist_instances
ALTER TABLE public.checklist_instances ADD COLUMN assigned_to uuid DEFAULT NULL;

-- RLS: Assigned users can view their assigned instances
CREATE POLICY "Assigned users can view instances"
ON public.checklist_instances
FOR SELECT
USING (assigned_to = auth.uid());

-- RLS: Assigned users can update their assigned instances
CREATE POLICY "Assigned users can update instances"
ON public.checklist_instances
FOR UPDATE
USING (assigned_to = auth.uid());

-- RLS: Assigned users can view response items of their assigned instances
CREATE POLICY "Assigned users can view response_items"
ON public.checklist_response_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM checklist_instances i
  WHERE i.id = checklist_response_items.instance_id AND i.assigned_to = auth.uid()
));

-- RLS: Assigned users can update response items of their assigned instances
CREATE POLICY "Assigned users can update response_items"
ON public.checklist_response_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM checklist_instances i
  WHERE i.id = checklist_response_items.instance_id AND i.assigned_to = auth.uid()
));

-- RLS: Assigned users can insert response items for their assigned instances
CREATE POLICY "Assigned users can insert response_items"
ON public.checklist_response_items
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM checklist_instances i
  WHERE i.id = checklist_response_items.instance_id AND i.assigned_to = auth.uid()
));

-- RLS: Assigned users can view audit log of their assigned instances
CREATE POLICY "Assigned users can view audit_log"
ON public.checklist_audit_log
FOR SELECT
USING (instance_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM checklist_instances i
  WHERE i.id = checklist_audit_log.instance_id AND i.assigned_to = auth.uid()
));

-- RLS: Assigned users can insert audit log for their assigned instances
CREATE POLICY "Assigned users can insert audit_log"
ON public.checklist_audit_log
FOR INSERT
WITH CHECK (instance_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM checklist_instances i
  WHERE i.id = checklist_audit_log.instance_id AND i.assigned_to = auth.uid()
));
