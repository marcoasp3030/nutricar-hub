import { supabase } from "@/integrations/supabase/client";

// ── Types ──
export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  sections?: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  color: string;
  items?: TemplateItem[];
}

export interface TemplateItem {
  id: string;
  section_id: string;
  name: string;
  item_type: ChecklistItemType;
  default_quantity: number | null;
  unit: string | null;
  is_required: boolean;
  requires_attachments: boolean;
  default_observation: string | null;
  default_responsible: string | null;
  sort_order: number;
}

export type ChecklistItemType = 'checkbox' | 'quantidade' | 'texto' | 'sim_nao' | 'data_hora' | 'foto' | 'assinatura';
export type ChecklistStatus = 'rascunho' | 'em_andamento' | 'concluido' | 'aprovado' | 'reprovado' | 'arquivado';
export type ChecklistItemStatus = 'pendente' | 'em_execucao' | 'ok' | 'nao_aplicavel' | 'problema';
export type ChecklistPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface ChecklistInstance {
  id: string;
  template_id: string | null;
  name: string;
  store: string | null;
  location: string | null;
  start_date: string | null;
  due_date: string | null;
  status: ChecklistStatus;
  created_by: string;
  team: string | null;
  priority: ChecklistPriority;
  progress: number;
  ok_count: number;
  pending_count: number;
  problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistResponseItem {
  id: string;
  instance_id: string;
  template_item_id: string | null;
  section_name: string | null;
  item_name: string;
  item_type: ChecklistItemType;
  status: ChecklistItemStatus;
  actual_quantity: number | null;
  observation: string | null;
  evidence_urls: string[];
  signed_by: string | null;
  updated_at: string;
  updated_by: string | null;
  requires_action: boolean;
  is_blocking: boolean;
  is_required: boolean;
  sort_order: number;
}

// ── Templates ──
export async function fetchTemplates() {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ChecklistTemplate[];
}

export async function fetchTemplateWithDetails(id: string) {
  const { data: template, error: tErr } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (tErr) throw tErr;

  const { data: sections, error: sErr } = await supabase
    .from('checklist_template_sections')
    .select('*')
    .eq('template_id', id)
    .order('sort_order');
  if (sErr) throw sErr;

  const sectionIds = sections?.map(s => s.id) || [];
  let items: any[] = [];
  if (sectionIds.length > 0) {
    const { data: itemsData, error: iErr } = await supabase
      .from('checklist_template_items')
      .select('*')
      .in('section_id', sectionIds)
      .order('sort_order');
    if (iErr) throw iErr;
    items = itemsData || [];
  }

  const sectionsWithItems = (sections || []).map(s => ({
    ...s,
    items: items.filter(i => i.section_id === s.id),
  }));

  return { ...template, sections: sectionsWithItems } as ChecklistTemplate;
}

export async function createTemplate(data: { name: string; description?: string; tags?: string[] }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: template, error } = await supabase
    .from('checklist_templates')
    .insert({ ...data, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return template as ChecklistTemplate;
}

export async function updateTemplate(id: string, data: Partial<ChecklistTemplate>) {
  const { error } = await supabase
    .from('checklist_templates')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('checklist_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Sections ──
export async function createSection(data: { template_id: string; name: string; sort_order: number; color?: string }) {
  const { data: section, error } = await supabase
    .from('checklist_template_sections')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return section as TemplateSection;
}

export async function updateSection(id: string, data: Partial<TemplateSection>) {
  const { error } = await supabase
    .from('checklist_template_sections')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSection(id: string) {
  const { error } = await supabase
    .from('checklist_template_sections')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Items ──
export async function createItem(data: Partial<TemplateItem> & { section_id: string; name: string }) {
  const { data: item, error } = await supabase
    .from('checklist_template_items')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return item as TemplateItem;
}

export async function updateItem(id: string, data: Partial<TemplateItem>) {
  const { error } = await supabase
    .from('checklist_template_items')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase
    .from('checklist_template_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Instances ──
export async function fetchInstances(filters?: { status?: string; store?: string }) {
  let query = supabase
    .from('checklist_instances')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.status) query = query.eq('status', filters.status as any);
  if (filters?.store) query = query.eq('store', filters.store);

  const { data, error } = await query;
  if (error) throw error;
  return data as ChecklistInstance[];
}

export async function fetchInstance(id: string) {
  const { data, error } = await supabase
    .from('checklist_instances')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ChecklistInstance;
}

export async function createInstanceFromTemplate(templateId: string, meta: { name: string; store?: string; location?: string; due_date?: string; priority?: ChecklistPriority }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const template = await fetchTemplateWithDetails(templateId);

  const insertData: any = { ...meta, template_id: templateId, created_by: user.id, status: 'rascunho' };
  const { data: instance, error: iErr } = await supabase
    .from('checklist_instances')
    .insert(insertData)
    .select()
    .single();
  if (iErr) throw iErr;

  // Create response items from template
  const responseItems = (template.sections || []).flatMap(section =>
    (section.items || []).map(item => ({
      instance_id: instance.id,
      template_item_id: item.id,
      section_name: section.name,
      item_name: item.name,
      item_type: item.item_type,
      status: 'pendente' as ChecklistItemStatus,
      actual_quantity: item.default_quantity,
      observation: item.default_observation,
      is_required: item.is_required,
      is_blocking: false,
      sort_order: section.sort_order * 1000 + item.sort_order,
    }))
  );

  if (responseItems.length > 0) {
    const { error: rErr } = await supabase
      .from('checklist_response_items')
      .insert(responseItems as any);
    if (rErr) throw rErr;

    // Update counters
    await supabase.from('checklist_instances').update({ pending_count: responseItems.length }).eq('id', instance.id);
  }

  // Audit log
  await supabase.from('checklist_audit_log').insert({
    instance_id: instance.id,
    template_id: templateId,
    action: 'created',
    details: { from_template: template.name },
    created_by: user.id,
  });

  return instance as ChecklistInstance;
}

export async function createBlankInstance(meta: { name: string; store?: string; location?: string; due_date?: string; priority?: ChecklistPriority }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insertData: any = { ...meta, created_by: user.id, status: 'rascunho' };
  const { data: instance, error } = await supabase
    .from('checklist_instances')
    .insert(insertData)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('checklist_audit_log').insert({
    instance_id: instance.id,
    action: 'created',
    details: { blank: true },
    created_by: user.id,
  });

  return instance as ChecklistInstance;
}

export async function updateInstance(id: string, data: Partial<ChecklistInstance>) {
  const { error } = await supabase
    .from('checklist_instances')
    .update(data as any)
    .eq('id', id);
  if (error) throw error;
}

export async function fetchResponseItems(instanceId: string) {
  const { data, error } = await supabase
    .from('checklist_response_items')
    .select('*')
    .eq('instance_id', instanceId)
    .order('sort_order');
  if (error) throw error;
  return data as ChecklistResponseItem[];
}

export async function updateResponseItem(id: string, data: Partial<ChecklistResponseItem>) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('checklist_response_items')
    .update({ ...data, updated_by: user?.id, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function recalculateProgress(instanceId: string) {
  const items = await fetchResponseItems(instanceId);
  const total = items.length;
  if (total === 0) return;
  const ok = items.filter(i => i.status === 'ok').length;
  const problem = items.filter(i => i.status === 'problema').length;
  const pending = items.filter(i => i.status === 'pendente' || i.status === 'em_execucao').length;
  const progress = Math.round((ok / total) * 100);

  await updateInstance(instanceId, { progress, ok_count: ok, pending_count: pending, problem_count: problem } as any);
}

export async function fetchAuditLog(instanceId: string) {
  const { data, error } = await supabase
    .from('checklist_audit_log')
    .select('*')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
