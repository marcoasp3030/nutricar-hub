import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEventJobs, fetchMyPromoterProfile, fetchMyInvites, fetchMyAssignments, respondToInvite, createJobInvite, upsertPromoterProfile, updateJobAssignment, uploadJobFile, EventJob, JobInvite, JobAssignment, PromoterProfile } from "@/lib/jobsApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea as TextareaUI } from "@/components/ui/textarea";
import { Calendar, MapPin, DollarSign, Check, X, Clock, Camera, Briefcase, User, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const assignmentStatusLabels: Record<string, string> = {
  reservado: "Reservado",
  confirmado: "Confirmado",
  substituicao: "Substituição",
  cancelado: "Cancelado",
};

const PromoterPortalPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState("feed");
  const [selectedJob, setSelectedJob] = useState<EventJob | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});

  const { data: profile } = useQuery({ queryKey: ["my_promoter_profile"], queryFn: fetchMyPromoterProfile });
  const { data: openJobs = [] } = useQuery({ queryKey: ["open_jobs"], queryFn: () => fetchEventJobs({ status: "publicado" }), enabled: profile?.status === "aprovado" });
  const { data: invites = [] } = useQuery({ queryKey: ["my_invites"], queryFn: fetchMyInvites, enabled: !!profile });
  const { data: assignments = [] } = useQuery({ queryKey: ["my_assignments"], queryFn: fetchMyAssignments, enabled: !!profile });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => respondToInvite(id, "aceito"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_invites"] }); toast({ title: "Aceito com sucesso!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => respondToInvite(id, "recusado", reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_invites"] }); toast({ title: "Recusado" }); setRejectDialogId(null); },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!profile) throw new Error("Perfil não encontrado");
      return createJobInvite({ job_id: jobId, promoter_id: profile.id, type: "candidatura" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_invites"] }); toast({ title: "Candidatura enviada!" }); setSelectedJob(null); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const profileMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      return upsertPromoterProfile({ ...data, user_id: user?.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_promoter_profile"] }); toast({ title: "Perfil salvo!" }); setProfileOpen(false); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const checkinMutation = useMutation({
    mutationFn: (id: string) => updateJobAssignment(id, { checkin_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_assignments"] }); toast({ title: "Check-in realizado!" }); },
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: string) => updateJobAssignment(id, { checkout_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_assignments"] }); toast({ title: "Check-out realizado!" }); },
  });

  const pendingInvites = invites.filter(i => i.response === "pendente");
  const confirmedAssignments = assignments.filter(a => a.status === "confirmado" || a.status === "reservado");
  const completedAssignments = assignments.filter(a => (a as any).job?.status === "concluido");

  // If no profile exists, show profile creation
  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-bold mb-2">Complete seu Perfil de Promotora</h2>
          <p className="text-sm text-muted-foreground mb-6">Preencha seus dados para receber oportunidades de trabalho</p>
          <Button onClick={() => { setProfileForm({}); setProfileOpen(true); }}>Criar Perfil</Button>
        </div>
        <ProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          form={profileForm}
          setForm={setProfileForm}
          onSave={() => profileMutation.mutate(profileForm)}
          saving={profileMutation.isPending}
        />
      </div>
    );
  }

  if (profile.status === "pendente") {
    return (
      <div className="text-center py-12">
        <Clock className="h-16 w-16 mx-auto text-yellow-500/50 mb-4" />
        <h2 className="text-xl font-bold mb-2">Perfil em Análise</h2>
        <p className="text-sm text-muted-foreground">Seu cadastro está sendo analisado pelo administrador. Aguarde a aprovação.</p>
      </div>
    );
  }

  if (profile.status === "bloqueado") {
    return (
      <div className="text-center py-12">
        <X className="h-16 w-16 mx-auto text-destructive/50 mb-4" />
        <h2 className="text-xl font-bold mb-2">Perfil Bloqueado</h2>
        <p className="text-sm text-muted-foreground">Seu cadastro foi bloqueado. Entre em contato com o administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portal da Promotora</h1>
          <p className="text-sm text-muted-foreground">Olá, {profile.stage_name || "Promotora"}!</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setProfileForm(profile); setProfileOpen(true); }}>
          <User className="h-4 w-4 mr-1" /> Meu Perfil
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-primary">{pendingInvites.length}</p><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-primary">{confirmedAssignments.length}</p><p className="text-xs text-muted-foreground">Confirmados</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-primary">{profile.total_jobs}</p><p className="text-xs text-muted-foreground">Concluídos</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="feed" className="flex-1">Oportunidades</TabsTrigger>
          <TabsTrigger value="pendentes" className="flex-1">Pendentes {pendingInvites.length > 0 && <Badge className="ml-1 h-5 w-5 p-0 text-xs">{pendingInvites.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="meus" className="flex-1">Meus Eventos</TabsTrigger>
        </TabsList>

        {/* Feed de oportunidades */}
        <TabsContent value="feed" className="mt-4 space-y-3">
          {openJobs.length === 0 ? (
            <div className="text-center py-8"><Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" /><p className="text-muted-foreground text-sm">Nenhuma oportunidade disponível no momento</p></div>
          ) : openJobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} actionLabel="Ver detalhes" />
          ))}
        </TabsContent>

        {/* Convites pendentes */}
        <TabsContent value="pendentes" className="mt-4 space-y-3">
          {pendingInvites.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhum convite pendente</p>
          ) : pendingInvites.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{(inv.job as any)?.title || "Evento"}</h3>
                  <Badge variant="outline">{inv.type === "convite" ? "Convite" : "Candidatura"}</Badge>
                </div>
                {inv.job && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date((inv.job as any).start_date), "dd/MM/yyyy")}</div>
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(inv.job as any).address || "—"}</div>
                    <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R$ {Number((inv.job as any).cache_value).toFixed(2)}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => acceptMutation.mutate(inv.id)}>
                    <Check className="h-4 w-4 mr-1" /> Aceitar
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => setRejectDialogId(inv.id)}>
                    <X className="h-4 w-4 mr-1" /> Recusar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Meus jobs */}
        <TabsContent value="meus" className="mt-4 space-y-3">
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhum evento atribuído</p>
          ) : assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              checkinMutation={checkinMutation}
              checkoutMutation={checkoutMutation}
              qc={qc}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Job detail / apply dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedJob?.title}</DialogTitle></DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> {format(new Date(selectedJob.start_date), "dd/MM/yyyy")} - {format(new Date(selectedJob.end_date), "dd/MM/yyyy")}</div>
                {selectedJob.start_time && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {selectedJob.start_time} - {selectedJob.end_time}</div>}
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {selectedJob.address || "Local não definido"}</div>
                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> R$ {Number(selectedJob.cache_value).toFixed(2)} ({selectedJob.cache_type})</div>
              </div>
              {selectedJob.description && <><Separator /><p className="text-sm">{selectedJob.description}</p></>}
              {selectedJob.requirements && <><p className="text-sm font-medium">Requisitos:</p><p className="text-sm text-muted-foreground">{selectedJob.requirements}</p></>}
              {selectedJob.has_transport && <Badge variant="outline">🚗 Transporte</Badge>}
              {selectedJob.has_meals && <Badge variant="outline">🍽️ Refeição</Badge>}
              {selectedJob.photo_urls?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedJob.photo_urls.map((url, i) => <img key={i} src={url} className="rounded-lg aspect-square object-cover" alt="" />)}
                </div>
              )}
              <Button className="w-full" onClick={() => applyMutation.mutate(selectedJob.id)} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? "Enviando..." : "Candidatar-se"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={() => setRejectDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Motivo da recusa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Informe o motivo (opcional)" />
            <Button className="w-full" variant="destructive" onClick={() => { if (rejectDialogId) rejectMutation.mutate({ id: rejectDialogId, reason: rejectReason }); }}>
              Confirmar Recusa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile dialog */}
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        form={profileForm}
        setForm={setProfileForm}
        onSave={() => profileMutation.mutate(profileForm)}
        saving={profileMutation.isPending}
      />
    </div>
  );
};

// Assignment card with evidence upload and promoter rating
const AssignmentCard = ({ assignment: a, checkinMutation, checkoutMutation, qc }: any) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState(a.execution_notes || "");
  const [uploading, setUploading] = useState(false);

  const evidenceMutation = useMutation({
    mutationFn: async (files: FileList) => {
      setUploading(true);
      try {
        const urls = await Promise.all(Array.from(files).map(f => uploadJobFile(f, "evidences")));
        const updated = [...(a.evidence_urls || []), ...urls];
        await updateJobAssignment(a.id, { evidence_urls: updated } as any);
        return updated;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_assignments"] }); toast({ title: "Evidências enviadas!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const notesMutation = useMutation({
    mutationFn: () => updateJobAssignment(a.id, { execution_notes: notes } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_assignments"] }); toast({ title: "Observações salvas!" }); },
  });

  const ratingMutation = useMutation({
    mutationFn: () => updateJobAssignment(a.id, { promoter_rating: rating, promoter_comment: comment } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my_assignments"] }); toast({ title: "Avaliação enviada!" }); setShowRating(false); },
  });

  const jobData = a.job as any;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{jobData?.title || "Evento"}</h3>
          <Badge>{assignmentStatusLabels[a.status]}</Badge>
        </div>
        {jobData && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(jobData.start_date), "dd/MM/yyyy")}</div>
            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {jobData.address || "—"}</div>
          </div>
        )}

        {/* Check-in/out */}
        <div className="flex gap-2">
          {!a.checkin_at && (a.status === "confirmado" || a.status === "reservado") && (
            <Button size="sm" variant="outline" onClick={() => checkinMutation.mutate(a.id)}>
              <Camera className="h-3 w-3 mr-1" /> Check-in
            </Button>
          )}
          {a.checkin_at && !a.checkout_at && (
            <Button size="sm" variant="outline" onClick={() => checkoutMutation.mutate(a.id)}>
              <Camera className="h-3 w-3 mr-1" /> Check-out
            </Button>
          )}
        </div>
        {a.checkin_at && <p className="text-xs text-muted-foreground">Check-in: {format(new Date(a.checkin_at), "dd/MM HH:mm")}</p>}
        {a.checkout_at && <p className="text-xs text-muted-foreground">Check-out: {format(new Date(a.checkout_at), "dd/MM HH:mm")}</p>}

        {/* Evidence photos */}
        {a.evidence_urls && a.evidence_urls.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">📸 Evidências ({a.evidence_urls.length})</p>
            <div className="grid grid-cols-4 gap-1">
              {a.evidence_urls.map((url: string, i: number) => (
                <img key={i} src={url} className="rounded aspect-square object-cover" alt={`evidência ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        {/* Upload evidences button */}
        {a.checkout_at && (
          <div className="space-y-2">
            {!showEvidence ? (
              <Button size="sm" variant="outline" className="w-full" onClick={() => setShowEvidence(true)}>
                <Camera className="h-3 w-3 mr-1" /> Enviar Evidências / Fotos
              </Button>
            ) : (
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium">Enviar fotos do evento</p>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => e.target.files && evidenceMutation.mutate(e.target.files)}
                />
                {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
                <div className="space-y-1">
                  <Label className="text-xs">Observações da execução</Label>
                  <TextareaUI
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Descreva como foi o evento..."
                    className="text-xs min-h-[60px]"
                  />
                  <Button size="sm" variant="outline" onClick={() => notesMutation.mutate()} disabled={notesMutation.isPending}>
                    Salvar Observações
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin rating (read-only) */}
        {a.admin_rating && (
          <div className="flex items-center gap-2 text-xs bg-muted rounded-lg p-2">
            <span className="text-muted-foreground">Avaliação do admin:</span>
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < (a.admin_rating || 0) ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />)}</div>
            {a.admin_comment && <span className="italic text-muted-foreground">"{a.admin_comment}"</span>}
          </div>
        )}

        {/* Promoter rating */}
        {a.checkout_at && !a.promoter_rating && (
          !showRating ? (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowRating(true)}>
              <Star className="h-3 w-3 mr-1" /> Avaliar este Evento
            </Button>
          ) : (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium">Como foi trabalhar neste evento?</p>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="focus:outline-none">
                    <Star className={`h-6 w-6 transition-colors ${n <= rating ? "text-primary fill-primary" : "text-muted-foreground/30 hover:text-primary/50"}`} />
                  </button>
                ))}
              </div>
              <TextareaUI
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário (opcional)"
                className="text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={rating === 0 || ratingMutation.isPending} onClick={() => ratingMutation.mutate()}>
                  {ratingMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRating(false)}>Cancelar</Button>
              </div>
            </div>
          )
        )}

        {a.promoter_rating && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sua avaliação:</span>
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < (a.promoter_rating || 0) ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sub-components

const JobCard = ({ job, onClick, actionLabel }: { job: EventJob; onClick: () => void; actionLabel: string }) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <CardContent className="pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{job.title}</h3>
        {job.event_type && <Badge variant="outline" className="text-xs">{(job.event_type as any).name}</Badge>}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(job.start_date), "dd/MM")}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.address || job.store_unit || "—"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-primary flex items-center gap-1"><DollarSign className="h-4 w-4" /> R$ {Number(job.cache_value).toFixed(2)}</span>
        <div className="flex gap-1">
          {job.has_transport && <Badge variant="secondary" className="text-xs">🚗</Badge>}
          {job.has_meals && <Badge variant="secondary" className="text-xs">🍽️</Badge>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ProfileDialog = ({ open, onOpenChange, form, setForm, onSave, saving }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Perfil de Promotora</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Nome artístico</Label><Input value={form.stage_name || ""} onChange={(e) => setForm({ ...form, stage_name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Cidade</Label><Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Estado</Label><Input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} /></div>
        </div>
        <div><Label>Bio</Label><Textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Fale um pouco sobre você e sua experiência" /></div>
        <div><Label>Raio de atendimento (km)</Label><Input type="number" value={form.service_radius_km || ""} onChange={(e) => setForm({ ...form, service_radius_km: Number(e.target.value) || null })} /></div>
        <Button onClick={onSave} disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar Perfil"}</Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PromoterPortalPage;
