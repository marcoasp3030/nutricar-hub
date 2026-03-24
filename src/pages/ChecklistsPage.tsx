import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchInstances, fetchTemplates, createInstanceFromTemplate, createBlankInstance, deleteInstance, type ChecklistInstance, type ChecklistTemplate, type ChecklistPriority } from "@/lib/checklistApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, ClipboardList, AlertTriangle, CheckCircle2, Clock, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_andamento: "bg-primary/20 text-primary",
  concluido: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-destructive/20 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  arquivado: "Arquivado",
};

const priorityLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const priorityColors: Record<string, string> = {
  baixa: "text-muted-foreground",
  media: "text-primary",
  alta: "text-orange-600",
  urgente: "text-destructive",
};

export default function ChecklistsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["checklist-instances"],
    queryFn: () => fetchInstances(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: () => fetchTemplates(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-instances"] });
      toast({ title: "Checklist excluído" });
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = instances.filter(i => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.store?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Checklists</h1>
          <p className="text-sm text-muted-foreground">Gerencie e execute seus checklists</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Checklist
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou loja..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Clock className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum checklist encontrado</p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>Criar primeiro checklist</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(inst => (
            <Card key={inst.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/checklists/${inst.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{inst.name}</CardTitle>
                  <Badge variant="secondary" className={statusColors[inst.status]}>{statusLabels[inst.status]}</Badge>
                </div>
                {inst.store && <p className="text-xs text-muted-foreground">{inst.store}{inst.location ? ` · ${inst.location}` : ""}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={inst.progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{inst.progress}% concluído</span>
                  <span className={priorityColors[inst.priority]}>{priorityLabels[inst.priority]}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{inst.ok_count}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{inst.pending_count}</span>
                  {inst.problem_count > 0 && (
                    <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />{inst.problem_count}</span>
                  )}
                </div>
                {inst.due_date && (
                  <p className="text-xs text-muted-foreground">Prazo: {new Date(inst.due_date).toLocaleDateString("pt-BR")}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateChecklistDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        templates={templates}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ["checklist-instances"] });
          navigate(`/checklists/${id}`);
        }}
      />
    </div>
  );
}

function CreateChecklistDialog({ open, onOpenChange, templates, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: ChecklistTemplate[];
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [location, setLocation] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [priority, setPriority] = useState<ChecklistPriority>("media");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let instance;
      const meta = { name, store: store || undefined, location: location || undefined, priority };
      if (templateId !== "blank") {
        instance = await createInstanceFromTemplate(templateId, meta);
      } else {
        instance = await createBlankInstance(meta);
      }
      toast({ title: "Checklist criado!" });
      onOpenChange(false);
      setName(""); setStore(""); setLocation(""); setTemplateId("blank"); setPriority("media");
      onCreated(instance.id);
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Checklist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Inauguração Loja Centro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loja/Unidade</Label>
              <Input value={store} onChange={e => setStore(e.target.value)} placeholder="Loja Centro" />
            </div>
            <div>
              <Label>Local</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Piso 1" />
            </div>
          </div>
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Em branco</SelectItem>
                {templates.filter(t => t.is_active).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={v => setPriority(v as ChecklistPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>{loading ? "Criando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
