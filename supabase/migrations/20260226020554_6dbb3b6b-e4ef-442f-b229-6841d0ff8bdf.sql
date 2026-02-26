
-- Checklist Templates
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checklist_templates" ON public.checklist_templates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active templates" ON public.checklist_templates FOR SELECT USING (is_active = true);

CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Template Sections
CREATE TABLE public.checklist_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template_sections" ON public.checklist_template_sections FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view template_sections" ON public.checklist_template_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM checklist_templates t WHERE t.id = template_id AND t.is_active = true)
);

-- Template Items
CREATE TYPE public.checklist_item_type AS ENUM ('checkbox', 'quantidade', 'texto', 'sim_nao', 'data_hora', 'foto', 'assinatura');

CREATE TABLE public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.checklist_template_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  item_type checklist_item_type NOT NULL DEFAULT 'checkbox',
  default_quantity numeric,
  unit text,
  is_required boolean NOT NULL DEFAULT false,
  requires_attachments boolean NOT NULL DEFAULT false,
  default_observation text,
  default_responsible text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template_items" ON public.checklist_template_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view template_items" ON public.checklist_template_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM checklist_template_sections s
    JOIN checklist_templates t ON t.id = s.template_id
    WHERE s.id = section_id AND t.is_active = true
  )
);

-- Checklist Instance Status
CREATE TYPE public.checklist_status AS ENUM ('rascunho', 'em_andamento', 'concluido', 'aprovado', 'reprovado', 'arquivado');
CREATE TYPE public.checklist_item_status AS ENUM ('pendente', 'em_execucao', 'ok', 'nao_aplicavel', 'problema');
CREATE TYPE public.checklist_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Checklist Instances
CREATE TABLE public.checklist_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  store text,
  location text,
  start_date timestamptz DEFAULT now(),
  due_date timestamptz,
  status checklist_status NOT NULL DEFAULT 'rascunho',
  created_by uuid NOT NULL,
  team text,
  priority checklist_priority NOT NULL DEFAULT 'media',
  progress numeric NOT NULL DEFAULT 0,
  ok_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  problem_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checklist_instances" ON public.checklist_instances FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own instances" ON public.checklist_instances FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create instances" ON public.checklist_instances FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own instances" ON public.checklist_instances FOR UPDATE USING (created_by = auth.uid());

CREATE TRIGGER update_checklist_instances_updated_at BEFORE UPDATE ON public.checklist_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Checklist Response Items
CREATE TABLE public.checklist_response_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.checklist_instances(id) ON DELETE CASCADE,
  template_item_id uuid REFERENCES public.checklist_template_items(id) ON DELETE SET NULL,
  section_name text,
  item_name text NOT NULL,
  item_type checklist_item_type NOT NULL DEFAULT 'checkbox',
  status checklist_item_status NOT NULL DEFAULT 'pendente',
  actual_quantity numeric,
  observation text,
  evidence_urls text[] DEFAULT '{}',
  signed_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  requires_action boolean NOT NULL DEFAULT false,
  is_blocking boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_response_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage response_items" ON public.checklist_response_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own response_items" ON public.checklist_response_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.created_by = auth.uid())
);
CREATE POLICY "Users can update own response_items" ON public.checklist_response_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.created_by = auth.uid())
);
CREATE POLICY "Users can insert own response_items" ON public.checklist_response_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.created_by = auth.uid())
);

-- Audit Log
CREATE TABLE public.checklist_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.checklist_instances(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit_log" ON public.checklist_audit_log FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own audit_log" ON public.checklist_audit_log FOR SELECT USING (
  (instance_id IS NOT NULL AND EXISTS (SELECT 1 FROM checklist_instances i WHERE i.id = instance_id AND i.created_by = auth.uid()))
);
CREATE POLICY "Users can insert audit_log" ON public.checklist_audit_log FOR INSERT WITH CHECK (created_by = auth.uid());
