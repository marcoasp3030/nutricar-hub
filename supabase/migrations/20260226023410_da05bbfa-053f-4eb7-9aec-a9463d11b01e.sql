
-- 1) Event Types
CREATE TABLE public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_requirements JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage event_types" ON public.event_types FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active event_types" ON public.event_types FOR SELECT USING (is_active = true);
CREATE TRIGGER update_event_types_updated_at BEFORE UPDATE ON public.event_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Promoter Profiles
CREATE TYPE public.promoter_status AS ENUM ('pendente', 'aprovado', 'bloqueado');

CREATE TABLE public.promoter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stage_name TEXT,
  city TEXT,
  state TEXT,
  service_radius_km INTEGER,
  bio TEXT,
  portfolio_urls TEXT[] DEFAULT '{}',
  doc_urls TEXT[] DEFAULT '{}',
  status promoter_status NOT NULL DEFAULT 'pendente',
  avg_rating NUMERIC DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promoter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage promoter_profiles" ON public.promoter_profiles FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own promoter_profile" ON public.promoter_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own promoter_profile" ON public.promoter_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own promoter_profile" ON public.promoter_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Approved promoters visible to authenticated" ON public.promoter_profiles FOR SELECT TO authenticated USING (status = 'aprovado');
CREATE TRIGGER update_promoter_profiles_updated_at BEFORE UPDATE ON public.promoter_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Event Jobs (sem policy de visibilidade por agora)
CREATE TYPE public.job_visibility AS ENUM ('aberto', 'convidadas', 'atribuido_direto');
CREATE TYPE public.job_status AS ENUM ('rascunho', 'publicado', 'em_negociacao', 'confirmado', 'em_execucao', 'concluido', 'cancelado');
CREATE TYPE public.cache_type AS ENUM ('por_hora', 'por_dia', 'fechado');

CREATE TABLE public.event_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type_id UUID REFERENCES public.event_types(id),
  description TEXT,
  requirements TEXT,
  uniform_notes TEXT,
  address TEXT,
  store_unit TEXT,
  map_link TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  start_time TEXT,
  end_time TEXT,
  promoter_slots INTEGER NOT NULL DEFAULT 1,
  cache_value NUMERIC NOT NULL DEFAULT 0,
  cache_type cache_type NOT NULL DEFAULT 'fechado',
  travel_allowance NUMERIC DEFAULT 0,
  has_transport BOOLEAN DEFAULT false,
  has_meals BOOLEAN DEFAULT false,
  photo_urls TEXT[] DEFAULT '{}',
  attachment_urls TEXT[] DEFAULT '{}',
  visibility job_visibility NOT NULL DEFAULT 'aberto',
  status job_status NOT NULL DEFAULT 'rascunho',
  response_deadline_hours INTEGER DEFAULT 24,
  checklist_template_id UUID REFERENCES public.checklist_templates(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage event_jobs" ON public.event_jobs FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_event_jobs_updated_at BEFORE UPDATE ON public.event_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Job Invites
CREATE TYPE public.invite_type AS ENUM ('convite', 'candidatura');
CREATE TYPE public.invite_response AS ENUM ('pendente', 'aceito', 'recusado', 'expirado', 'cancelado');

CREATE TABLE public.job_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.event_jobs(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  type invite_type NOT NULL DEFAULT 'candidatura',
  response invite_response NOT NULL DEFAULT 'pendente',
  rejection_reason TEXT,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, promoter_id)
);
ALTER TABLE public.job_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage job_invites" ON public.job_invites FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Promoters can view own invites" ON public.job_invites FOR SELECT TO authenticated USING (promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Promoters can insert candidatura" ON public.job_invites FOR INSERT TO authenticated WITH CHECK (
  type = 'candidatura' AND promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid() AND status = 'aprovado')
);
CREATE POLICY "Promoters can update own invites" ON public.job_invites FOR UPDATE TO authenticated USING (promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()));

-- Now add the event_jobs visibility policy (job_invites exists now)
CREATE POLICY "Promoters can view published jobs" ON public.event_jobs FOR SELECT TO authenticated USING (
  status != 'rascunho' AND (
    visibility = 'aberto'
    OR EXISTS (SELECT 1 FROM public.job_invites ji WHERE ji.job_id = event_jobs.id AND ji.promoter_id IN (SELECT pp.id FROM public.promoter_profiles pp WHERE pp.user_id = auth.uid()))
  )
);

-- 5) Job Assignments
CREATE TYPE public.assignment_status AS ENUM ('reservado', 'confirmado', 'substituicao', 'cancelado');

CREATE TABLE public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.event_jobs(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.promoter_profiles(id) ON DELETE CASCADE,
  status assignment_status NOT NULL DEFAULT 'reservado',
  checkin_at TIMESTAMPTZ,
  checkin_photo_url TEXT,
  checkout_at TIMESTAMPTZ,
  checkout_photo_url TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  execution_notes TEXT,
  admin_rating INTEGER CHECK (admin_rating BETWEEN 1 AND 5),
  admin_comment TEXT,
  promoter_rating INTEGER CHECK (promoter_rating BETWEEN 1 AND 5),
  promoter_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, promoter_id)
);
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage job_assignments" ON public.job_assignments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Promoters can view own assignments" ON public.job_assignments FOR SELECT TO authenticated USING (promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Promoters can update own assignments" ON public.job_assignments FOR UPDATE TO authenticated USING (promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()));
CREATE TRIGGER update_job_assignments_updated_at BEFORE UPDATE ON public.job_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Job Payments
CREATE TYPE public.payment_status AS ENUM ('pendente', 'aprovado', 'pago', 'contestado');
CREATE TYPE public.payment_method AS ENUM ('pix', 'transferencia', 'outro');

CREATE TABLE public.job_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.job_assignments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pendente',
  method payment_method,
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage job_payments" ON public.job_payments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Promoters can view own payments" ON public.job_payments FOR SELECT TO authenticated USING (
  assignment_id IN (SELECT id FROM public.job_assignments WHERE promoter_id IN (SELECT id FROM public.promoter_profiles WHERE user_id = auth.uid()))
);
CREATE TRIGGER update_job_payments_updated_at BEFORE UPDATE ON public.job_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Job Audit Log
CREATE TABLE public.job_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.event_jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage job_audit_log" ON public.job_audit_log FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert audit" ON public.job_audit_log FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Storage bucket for job files
INSERT INTO storage.buckets (id, name, public) VALUES ('jobs', 'jobs', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Authenticated can upload job files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'jobs');
CREATE POLICY "Anyone can view job files" ON storage.objects FOR SELECT USING (bucket_id = 'jobs');
CREATE POLICY "Admins can delete job files" ON storage.objects FOR DELETE USING (bucket_id = 'jobs' AND has_role(auth.uid(), 'admin'));
