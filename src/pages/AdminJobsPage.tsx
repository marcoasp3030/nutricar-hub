import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEventJobs, fetchEventTypes, upsertEventJob, updateJobStatus, deleteEventJob, fetchPromoterProfiles, createJobInvite, fetchJobInvites, fetchJobAssignments, createJobAssignment, createJobPayment, updateJobAssignment, logJobAudit, uploadJobFile, EventJob, EventType, PromoterProfile, JobAssignment } from "@/lib/jobsApi";
import { fetchTemplates, ChecklistTemplate } from "@/lib/checklistApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Calendar, CalendarDays, MapPin, DollarSign, Users, Eye, UserPlus, CheckCircle, Send, Briefcase, Star, Image, ClipboardList, Trash2, Edit, MoreVertical, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  em_negociacao: "Em Negociação",
  confirmado: "Confirmado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  rascunho: "secondary",
  publicado: "default",
  em_negociacao: "outline",
  confirmado: "default",
  em_execucao: "default",
  concluido: "secondary",
  cancelado: "destructive",
};

const AdminJobsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<EventJob | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [deleteConfirm, setDeleteConfirm] = useState<EventJob | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["event_jobs", tab],
    queryFn: () => fetchEventJobs(tab !== "all" ? { status: tab } : undefined),
  });

  const { data: eventTypes = [] } = useQuery({ queryKey: ["event_types"], queryFn: fetchEventTypes });
  const { data: promoters = [] } = useQuery({ queryKey: ["promoter_profiles_approved"], queryFn: () => fetchPromoterProfiles({ status: "aprovado" }) });
  const { data: checklistTemplates = [] } = useQuery({ queryKey: ["checklist_templates"], queryFn: fetchTemplates });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      return upsertEventJob({ ...data, created_by: user?.id });
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["event_jobs"] });
      toast({ title: "Evento salvo!" });
      setFormOpen(false);
      logJobAudit(job.id, form.id ? "job_updated" : "job_created");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventJob['status'] }) => updateJobStatus(id, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event_jobs"] });
      const msg = vars.status === 'confirmado' ? "Status atualizado! Checklist criado automaticamente (se template vinculado)." : "Status atualizado!";
      toast({ title: msg });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ jobId, promoterId }: { jobId: string; promoterId: string }) =>
      createJobInvite({ job_id: jobId, promoter_id: promoterId, type: "convite" }),
    onSuccess: () => {
      toast({ title: "Convite enviado!" });
      logJobAudit(detailJob!.id, "invite_sent");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ jobId, promoterId }: { jobId: string; promoterId: string }) =>
      createJobAssignment({ job_id: jobId, promoter_id: promoterId }),
    onSuccess: () => {
      toast({ title: "Promotora atribuída!" });
      logJobAudit(detailJob!.id, "assignment_created");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ assignmentId, amount }: { assignmentId: string; amount: number }) =>
      createJobPayment({ assignment_id: assignmentId, amount }),
    onSuccess: () => toast({ title: "Pagamento criado!" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEventJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event_jobs"] });
      toast({ title: "Evento excluído!" });
      setDeleteConfirm(null);
      setDetailJob(null);
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const duplicateJob = (job: EventJob) => {
    const { id, created_at, updated_at, event_type, ...rest } = job as any;
    setForm({
      ...rest,
      title: `${rest.title} (cópia)`,
      status: "rascunho",
      start_date: rest.start_date?.split("T")[0],
      end_date: rest.end_date?.split("T")[0],
    });
    setFormOpen(true);
  };

  const openNewJob = () => {
    setForm({
      title: "", event_type_id: "", description: "", requirements: "", uniform_notes: "",
      address: "", store_unit: "", map_link: "",
      start_date: "", end_date: "", start_time: "", end_time: "",
      promoter_slots: 1, cache_value: 0, cache_type: "fechado",
      travel_allowance: 0, has_transport: false, has_meals: false,
      visibility: "aberto", status: "rascunho", response_deadline_hours: 24,
      photo_urls: [], attachment_urls: [],
    });
    setFormOpen(true);
  };

  const openEditJob = (job: EventJob) => {
    setForm({ ...job, start_date: job.start_date?.split("T")[0], end_date: job.end_date?.split("T")[0] });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.title?.trim()) return toast({ title: "Título obrigatório", variant: "destructive" });
    if (!form.start_date || !form.end_date) return toast({ title: "Datas obrigatórias", variant: "destructive" });
    const payload = { ...form };
    if (!payload.event_type_id) delete payload.event_type_id;
    delete payload.event_type;
    saveMutation.mutate(payload);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadJobFile(f, "job-photos")));
      setForm((prev: any) => ({ ...prev, photo_urls: [...(prev.photo_urls || []), ...urls] }));
      toast({ title: `${files.length} foto(s) enviada(s)` });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    }
  };

  const filteredJobs = jobs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground">Publique e gerencie oportunidades para promotoras</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/jobs/calendario")}>
            <CalendarDays className="h-4 w-4 mr-2" /> Calendário
          </Button>
          <Button onClick={openNewJob}><Plus className="h-4 w-4 mr-2" /> Novo Evento</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {Object.entries(statusLabels).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate cursor-pointer" onClick={() => setDetailJob(job)}>{job.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={statusColors[job.status] as any}>{statusLabels[job.status]}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailJob(job)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditJob(job)}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateJob(job)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {job.status === "rascunho" && (
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ id: job.id, status: "publicado" })}>
                            <Send className="h-4 w-4 mr-2" /> Publicar
                          </DropdownMenuItem>
                        )}
                        {job.status !== "cancelado" && (
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ id: job.id, status: "cancelado" })} className="text-orange-600">
                            Cancelar Evento
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfirm(job)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {job.event_type && <Badge variant="outline" className="text-xs w-fit">{(job.event_type as any).name}</Badge>}
              </CardHeader>
              <CardContent className="space-y-2 cursor-pointer" onClick={() => setDetailJob(job)}>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {job.start_date ? format(new Date(job.start_date), "dd/MM/yyyy") : "—"}
                  {job.start_time && ` ${job.start_time}`}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {job.address || job.store_unit || "Local não definido"}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <DollarSign className="h-4 w-4" />
                    R$ {Number(job.cache_value).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {job.promoter_slots} vaga(s)
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar" : "Novo"} Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título</Label>
                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Inauguração Loja Centro" />
              </div>
              <div>
                <Label>Tipo de Evento</Label>
                <Select value={form.event_type_id || ""} onValueChange={(v) => setForm({ ...form, event_type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((et) => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Checklist Template</Label>
                <Select value={form.checklist_template_id || "none"} onValueChange={(v) => setForm({ ...form, checklist_template_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {checklistTemplates.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Checklist será criado automaticamente ao confirmar o evento</p>
              </div>
              <div>
                <Label>Visibilidade</Label>
                <Select value={form.visibility || "aberto"} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberto">Aberto (todas)</SelectItem>
                    <SelectItem value="convidadas">Convidadas</SelectItem>
                    <SelectItem value="atribuido_direto">Atribuição direta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Requisitos</Label>
              <Textarea value={form.requirements || ""} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            </div>
            <div>
              <Label>Uniforme / Observações</Label>
              <Input value={form.uniform_notes || ""} onChange={(e) => setForm({ ...form, uniform_notes: e.target.value })} />
            </div>

            <Separator />
            <h3 className="font-semibold text-sm">Local e Horário</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Endereço</Label>
                <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>Loja/Unidade</Label>
                <Input value={form.store_unit || ""} onChange={(e) => setForm({ ...form, store_unit: e.target.value })} />
              </div>
              <div>
                <Label>Data início</Label>
                <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Data fim</Label>
                <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div>
                <Label>Horário início</Label>
                <Input type="time" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>Horário fim</Label>
                <Input type="time" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>

            <Separator />
            <h3 className="font-semibold text-sm">Cachê e Benefícios</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor do cachê (R$)</Label>
                <Input type="number" value={form.cache_value || 0} onChange={(e) => setForm({ ...form, cache_value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Tipo de cachê</Label>
                <Select value={form.cache_type || "fechado"} onValueChange={(v) => setForm({ ...form, cache_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="por_hora">Por hora</SelectItem>
                    <SelectItem value="por_dia">Por dia</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vagas (promotoras)</Label>
                <Input type="number" min={1} value={form.promoter_slots || 1} onChange={(e) => setForm({ ...form, promoter_slots: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Ajuda de custo (R$)</Label>
                <Input type="number" value={form.travel_allowance || 0} onChange={(e) => setForm({ ...form, travel_allowance: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.has_transport || false} onCheckedChange={(v) => setForm({ ...form, has_transport: v })} />
                <Label>Transporte incluso</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.has_meals || false} onCheckedChange={(v) => setForm({ ...form, has_meals: v })} />
                <Label>Refeição inclusa</Label>
              </div>
            </div>

            <Separator />
            <h3 className="font-semibold text-sm">Fotos do briefing</h3>
            <Input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
            {form.photo_urls?.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {form.photo_urls.map((url: string, i: number) => (
                  <img key={i} src={url} className="rounded-lg aspect-square object-cover" alt="briefing" />
                ))}
              </div>
            )}

            <div>
              <Label>Prazo para resposta (horas)</Label>
              <Input type="number" value={form.response_deadline_hours || 24} onChange={(e) => setForm({ ...form, response_deadline_hours: Number(e.target.value) })} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
                {saveMutation.isPending ? "Salvando..." : "Salvar como Rascunho"}
              </Button>
              {!form.id && (
                <Button variant="default" onClick={() => { setForm({ ...form, status: "publicado" }); setTimeout(handleSave, 100); }}>
                  <Send className="h-4 w-4 mr-1" /> Publicar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog open={!!detailJob} onOpenChange={() => setDetailJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailJob?.title}
              <Badge variant={statusColors[detailJob?.status || "rascunho"] as any}>{statusLabels[detailJob?.status || "rascunho"]}</Badge>
            </DialogTitle>
          </DialogHeader>
          {detailJob && (
            <JobDetailContent
              job={detailJob}
              promoters={promoters}
              statusMutation={statusMutation}
              inviteMutation={inviteMutation}
              assignMutation={assignMutation}
              onEdit={openEditJob}
              onClose={() => setDetailJob(null)}
              qc={qc}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Job Detail with assignments, evidences, and admin rating
const JobDetailContent = ({ job, promoters, statusMutation, inviteMutation, assignMutation, onEdit, onClose, qc }: any) => {
  const [adminRating, setAdminRating] = useState(0);
  const [adminComment, setAdminComment] = useState("");
  const [ratingAssignmentId, setRatingAssignmentId] = useState<string | null>(null);

  const { data: jobAssignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ["job_assignments", job.id],
    queryFn: () => fetchJobAssignments(job.id),
  });

  const ratingMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment: string }) =>
      updateJobAssignment(id, { admin_rating: rating, admin_comment: comment } as any),
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Avaliação salva!" });
      setRatingAssignmentId(null);
      setAdminRating(0);
      setAdminComment("");
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Local:</span> {job.address || "—"}</div>
        <div><span className="text-muted-foreground">Datas:</span> {format(new Date(job.start_date), "dd/MM/yyyy")} - {format(new Date(job.end_date), "dd/MM/yyyy")}</div>
        <div><span className="text-muted-foreground">Cachê:</span> R$ {Number(job.cache_value).toFixed(2)}</div>
        <div><span className="text-muted-foreground">Vagas:</span> {job.promoter_slots}</div>
      </div>

      {job.description && <p className="text-sm">{job.description}</p>}

      <Separator />
      <h3 className="font-semibold text-sm">Ações</h3>
      <div className="flex flex-wrap gap-2">
        {job.status === "rascunho" && (
          <Button size="sm" onClick={() => { statusMutation.mutate({ id: job.id, status: "publicado" }); onClose(); }}>
            <Send className="h-3 w-3 mr-1" /> Publicar
          </Button>
        )}
        {job.status === "publicado" && (
          <Button size="sm" onClick={() => { statusMutation.mutate({ id: job.id, status: "confirmado" }); onClose(); }}>
            <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
          </Button>
        )}
        {job.status === "confirmado" && (
          <Button size="sm" onClick={() => { statusMutation.mutate({ id: job.id, status: "em_execucao" }); onClose(); }}>
            Iniciar Execução
          </Button>
        )}
        {job.status === "em_execucao" && (
          <Button size="sm" onClick={() => { statusMutation.mutate({ id: job.id, status: "concluido" }); onClose(); }}>
            Concluir
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(job)}>Editar</Button>
        {job.status !== "cancelado" && (
          <Button size="sm" variant="destructive" onClick={() => { statusMutation.mutate({ id: job.id, status: "cancelado" }); onClose(); }}>Cancelar</Button>
        )}
      </div>

      {/* Assignments & Evidences */}
      {jobAssignments.length > 0 && (
        <>
          <Separator />
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Promotoras Atribuídas ({jobAssignments.length})
          </h3>
          <div className="space-y-3">
            {jobAssignments.map((a: JobAssignment) => (
              <Card key={a.id} className="border">
                <CardContent className="pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{(a.promoter as any)?.stage_name || "Promotora"}</span>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>

                  {/* Check-in/out info */}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {a.checkin_at && <span>Check-in: {format(new Date(a.checkin_at), "dd/MM HH:mm")}</span>}
                    {a.checkout_at && <span>Check-out: {format(new Date(a.checkout_at), "dd/MM HH:mm")}</span>}
                  </div>

                  {/* Evidence photos */}
                  {a.evidence_urls && a.evidence_urls.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Image className="h-3 w-3" /> Evidências ({a.evidence_urls.length})</p>
                      <div className="grid grid-cols-4 gap-1">
                        {a.evidence_urls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} className="rounded aspect-square object-cover hover:opacity-80 transition-opacity" alt={`evidência ${i + 1}`} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {a.execution_notes && <p className="text-xs text-muted-foreground bg-muted rounded p-2">📝 {a.execution_notes}</p>}

                  {/* Promoter rating (read-only for admin) */}
                  {a.promoter_rating && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Avaliação da promotora:</span>
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < (a.promoter_rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />)}</div>
                      {a.promoter_comment && <span className="italic">"{a.promoter_comment}"</span>}
                    </div>
                  )}

                  {/* Admin rating */}
                  {a.admin_rating ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Sua avaliação:</span>
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < (a.admin_rating || 0) ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />)}</div>
                      {a.admin_comment && <span className="italic">"{a.admin_comment}"</span>}
                    </div>
                  ) : (job.status === "concluido" || job.status === "em_execucao") && (
                    ratingAssignmentId === a.id ? (
                      <div className="space-y-2 bg-muted rounded-lg p-3">
                        <p className="text-xs font-medium">Avaliar promotora</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} onClick={() => setAdminRating(n)} className="focus:outline-none">
                              <Star className={`h-5 w-5 transition-colors ${n <= adminRating ? "text-primary fill-primary" : "text-muted-foreground/30 hover:text-primary/50"}`} />
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          placeholder="Comentário (opcional)"
                          className="text-xs min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={adminRating === 0 || ratingMutation.isPending} onClick={() => ratingMutation.mutate({ id: a.id, rating: adminRating, comment: adminComment })}>
                            {ratingMutation.isPending ? "Salvando..." : "Salvar Avaliação"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRatingAssignmentId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setRatingAssignmentId(a.id); setAdminRating(0); setAdminComment(""); }}>
                        <Star className="h-3 w-3 mr-1" /> Avaliar
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Separator />
      <h3 className="font-semibold text-sm">Convidar Promotoras</h3>
      <div className="space-y-2">
        {promoters.map((p: PromoterProfile) => (
          <div key={p.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
            <div>
              <span className="text-sm font-medium">{p.stage_name || "Sem nome"}</span>
              <span className="text-xs text-muted-foreground ml-2">{p.city}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => inviteMutation.mutate({ jobId: job.id, promoterId: p.id })}>
                <Send className="h-3 w-3 mr-1" /> Convidar
              </Button>
              <Button size="sm" onClick={() => assignMutation.mutate({ jobId: job.id, promoterId: p.id })}>
                <UserPlus className="h-3 w-3 mr-1" /> Atribuir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminJobsPage;
