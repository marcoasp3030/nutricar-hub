import { supabase } from "@/integrations/supabase/client";
import { createInstanceFromTemplate } from "@/lib/checklistApi";

// ============ TYPES ============

export interface EventType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  default_requirements: Record<string, boolean>;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoterProfile {
  id: string;
  user_id: string;
  stage_name: string | null;
  city: string | null;
  state: string | null;
  service_radius_km: number | null;
  bio: string | null;
  portfolio_urls: string[];
  doc_urls: string[];
  status: 'pendente' | 'aprovado' | 'bloqueado';
  avg_rating: number;
  total_jobs: number;
  created_at: string;
  updated_at: string;
}

export interface EventJob {
  id: string;
  title: string;
  event_type_id: string | null;
  description: string | null;
  requirements: string | null;
  uniform_notes: string | null;
  address: string | null;
  store_unit: string | null;
  map_link: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  promoter_slots: number;
  cache_value: number;
  cache_type: 'por_hora' | 'por_dia' | 'fechado';
  travel_allowance: number;
  has_transport: boolean;
  has_meals: boolean;
  photo_urls: string[];
  attachment_urls: string[];
  visibility: 'aberto' | 'convidadas' | 'atribuido_direto';
  status: 'rascunho' | 'publicado' | 'em_negociacao' | 'confirmado' | 'em_execucao' | 'concluido' | 'cancelado';
  response_deadline_hours: number;
  checklist_template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  event_type?: EventType;
}

export interface JobInvite {
  id: string;
  job_id: string;
  promoter_id: string;
  type: 'convite' | 'candidatura';
  response: 'pendente' | 'aceito' | 'recusado' | 'expirado' | 'cancelado';
  rejection_reason: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expires_at: string | null;
  created_at: string;
  // joined
  promoter?: PromoterProfile;
  job?: EventJob;
}

export interface JobAssignment {
  id: string;
  job_id: string;
  promoter_id: string;
  status: 'reservado' | 'confirmado' | 'substituicao' | 'cancelado';
  checkin_at: string | null;
  checkin_photo_url: string | null;
  checkout_at: string | null;
  checkout_photo_url: string | null;
  evidence_urls: string[];
  execution_notes: string | null;
  admin_rating: number | null;
  admin_comment: string | null;
  promoter_rating: number | null;
  promoter_comment: string | null;
  created_at: string;
  updated_at: string;
  // joined
  promoter?: PromoterProfile;
  job?: EventJob;
}

export interface JobPayment {
  id: string;
  assignment_id: string;
  amount: number;
  status: 'pendente' | 'aprovado' | 'pago' | 'contestado';
  method: 'pix' | 'transferencia' | 'outro' | null;
  receipt_url: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  assignment?: JobAssignment;
}

// ============ EVENT TYPES ============

export const fetchEventTypes = async () => {
  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []) as EventType[];
};

export const upsertEventType = async (et: Partial<EventType>) => {
  const { data, error } = await supabase
    .from('event_types')
    .upsert(et as any)
    .select()
    .single();
  if (error) throw error;
  return data as EventType;
};

// ============ PROMOTER PROFILES ============

export const fetchPromoterProfiles = async (filters?: { status?: string }) => {
  let q = supabase.from('promoter_profiles').select('*').order('created_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status as any);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as PromoterProfile[];
};

export const fetchMyPromoterProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('promoter_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data as PromoterProfile | null;
};

export const upsertPromoterProfile = async (profile: Partial<PromoterProfile>) => {
  const { data, error } = await supabase
    .from('promoter_profiles')
    .upsert(profile as any)
    .select()
    .single();
  if (error) throw error;
  return data as PromoterProfile;
};

export const updatePromoterStatus = async (id: string, status: PromoterProfile['status']) => {
  const { error } = await supabase
    .from('promoter_profiles')
    .update({ status } as any)
    .eq('id', id as any);
  if (error) throw error;
};

// ============ EVENT JOBS ============

export const fetchEventJobs = async (filters?: { status?: string }) => {
  let q = supabase.from('event_jobs').select('*, event_type:event_types(*)').order('created_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status as any);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as EventJob[];
};

export const fetchEventJob = async (id: string) => {
  const { data, error } = await supabase
    .from('event_jobs')
    .select('*, event_type:event_types(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as EventJob;
};

export const upsertEventJob = async (job: Partial<EventJob>) => {
  const { data, error } = await supabase
    .from('event_jobs')
    .upsert(job as any)
    .select()
    .single();
  if (error) throw error;
  return data as EventJob;
};

export const deleteEventJob = async (id: string) => {
  // Delete related records first
  const { data: assignments } = await supabase.from('job_assignments').select('id').eq('job_id', id);
  if (assignments?.length) {
    const assignmentIds = assignments.map((a: any) => a.id);
    await supabase.from('job_payments').delete().in('assignment_id', assignmentIds as any);
    await supabase.from('job_assignments').delete().eq('job_id', id as any);
  }
  await supabase.from('job_invites').delete().eq('job_id', id as any);
  await supabase.from('job_audit_log').delete().eq('job_id', id as any);
  const { error } = await supabase.from('event_jobs').delete().eq('id', id as any);
  if (error) throw error;
};

export const updateJobStatus = async (id: string, status: EventJob['status']) => {
  const { error } = await supabase
    .from('event_jobs')
    .update({ status } as any)
    .eq('id', id as any);
  if (error) throw error;

  // Auto-create checklist when job is confirmed
  if (status === 'confirmado') {
    await createChecklistForJob(id);
  }
};

/** Creates a ChecklistInstance from the job's checklist_template_id (if set) */
export const createChecklistForJob = async (jobId: string): Promise<string | null> => {
  const job = await fetchEventJob(jobId);
  if (!job.checklist_template_id) return null;

  try {
    const instance = await createInstanceFromTemplate(job.checklist_template_id, {
      name: `Checklist – ${job.title}`,
      store: job.store_unit || undefined,
      location: job.address || undefined,
      due_date: job.end_date,
      priority: 'media',
    });

    // Update instance to em_andamento
    await supabase.from('checklist_instances').update({ status: 'em_andamento' } as any).eq('id', instance.id);

    await logJobAudit(jobId, 'checklist_created', { checklist_instance_id: instance.id });
    return instance.id;
  } catch (e) {
    console.error('Error creating checklist for job:', e);
    return null;
  }
};

// ============ JOB INVITES ============

export const fetchJobInvites = async (jobId: string) => {
  const { data, error } = await supabase
    .from('job_invites')
    .select('*, promoter:promoter_profiles(*)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as JobInvite[];
};

export const fetchMyInvites = async () => {
  const profile = await fetchMyPromoterProfile();
  if (!profile) return [];
  const { data, error } = await supabase
    .from('job_invites')
    .select('*, job:event_jobs(*, event_type:event_types(*))')
    .eq('promoter_id', profile.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as JobInvite[];
};

export const createJobInvite = async (invite: { job_id: string; promoter_id: string; type: 'convite' | 'candidatura'; expires_at?: string }) => {
  const { data, error } = await supabase
    .from('job_invites')
    .insert(invite as any)
    .select()
    .single();
  if (error) throw error;
  return data as JobInvite;
};

export const respondToInvite = async (id: string, response: 'aceito' | 'recusado', reason?: string) => {
  const update: any = {
    response,
    ...(response === 'aceito' ? { accepted_at: new Date().toISOString() } : { rejected_at: new Date().toISOString(), rejection_reason: reason }),
  };
  const { error } = await supabase.from('job_invites').update(update).eq('id', id);
  if (error) throw error;
};

// ============ JOB ASSIGNMENTS ============

export const fetchJobAssignments = async (jobId: string) => {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*, promoter:promoter_profiles(*)')
    .eq('job_id', jobId)
    .order('created_at');
  if (error) throw error;
  return (data || []) as JobAssignment[];
};

export const fetchMyAssignments = async () => {
  const profile = await fetchMyPromoterProfile();
  if (!profile) return [];
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*, job:event_jobs(*, event_type:event_types(*))')
    .eq('promoter_id', profile.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as JobAssignment[];
};

export const createJobAssignment = async (assignment: { job_id: string; promoter_id: string }) => {
  const { data, error } = await supabase
    .from('job_assignments')
    .insert(assignment as any)
    .select()
    .single();
  if (error) throw error;
  return data as JobAssignment;
};

export const updateJobAssignment = async (id: string, update: Partial<JobAssignment>) => {
  const { error } = await supabase
    .from('job_assignments')
    .update(update as any)
    .eq('id', id);
  if (error) throw error;
};

export const deleteJobAssignment = async (id: string) => {
  // Delete related payments first to avoid FK issues
  await supabase.from('job_payments').delete().eq('assignment_id', id as any);
  const { error } = await supabase.from('job_assignments').delete().eq('id', id as any);
  if (error) throw error;
};

// ============ JOB PAYMENTS ============

export const fetchJobPayments = async (jobId?: string) => {
  let q = supabase.from('job_payments').select('*, assignment:job_assignments(*, promoter:promoter_profiles(*), job:event_jobs(*))').order('created_at', { ascending: false });
  if (jobId) {
    q = q.in('assignment_id', 
      supabase.from('job_assignments').select('id').eq('job_id', jobId).then(r => (r.data || []).map((a: any) => a.id)) as any
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as JobPayment[];
};

export const createJobPayment = async (payment: { assignment_id: string; amount: number }) => {
  const { data, error } = await supabase
    .from('job_payments')
    .insert(payment as any)
    .select()
    .single();
  if (error) throw error;
  return data as JobPayment;
};

export const updateJobPayment = async (id: string, update: Partial<JobPayment>) => {
  const { error } = await supabase
    .from('job_payments')
    .update(update as any)
    .eq('id', id);
  if (error) throw error;
};

// ============ AUDIT ============

export const logJobAudit = async (job_id: string, action: string, details?: Record<string, any>) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('job_audit_log').insert({
    job_id,
    action,
    details: details || {},
    created_by: user?.id,
  } as any);
};

// ============ FILE UPLOAD ============

export const uploadJobFile = async (file: File, folder: string) => {
  const path = `${folder}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('jobs').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('jobs').getPublicUrl(path);
  return data.publicUrl;
};
