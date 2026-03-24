import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchInstances, fetchTemplates, createInstanceFromTemplate, updateInstance, deleteInstance, deleteTemplate,
  type ChecklistInstance, type ChecklistTemplate, type ChecklistPriority,
} from "@/lib/checklistApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Search, ClipboardList, AlertTriangle, CheckCircle2, Clock, Copy, Link2, ExternalLink,
  Eye, Trash2, Play, FileText, Edit, UserPlus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", em_andamento: "Em Andamento", concluido: "Concluído",
  aprovado: "Aprovado", reprovado: "Reprovado", arquivado: "Arquivado",
};

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_andamento: "bg-primary/20 text-primary",
  concluido: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-destructive/20 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
};

const priorityLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};

export default function AdminChecklistsManagerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [assignDialog, setAssignDialog] = useState<ChecklistInstance | null>(null);
  const [editDialog, setEditDialog] = useState<ChecklistInstance | null>(null);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["checklist-instances-admin"],
    queryFn: () => fetchInstances(),
  });

  // Fetch all users for assignment
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.data || []).filter((u: any) => u.is_active);
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: fetchTemplates,
  });

  // Extract unique stores for filter
  const uniqueStores = [...new Set(instances.map(i => i.store).filter(Boolean))] as string[];

  const filtered = instances.filter(i => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
    if (storeFilter !== "all" && (i.store || "") !== storeFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.store?.toLowerCase().includes(search.toLowerCase()) && !i.location?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getChecklistUrl = (inst: ChecklistInstance) => {
    const base = window.location.origin;
    return inst.is_public ? `${base}/checklist-publico/${inst.id}` : `${base}/checklists/${inst.id}`;
  };

  const copyLink = (inst: ChecklistInstance) => {
    navigator.clipboard.writeText(getChecklistUrl(inst));
    toast({ title: "Link copiado!" });
  };

  const togglePublic = async (inst: ChecklistInstance) => {
    try {
      await updateInstance(inst.id, { is_public: !inst.is_public } as any);
      queryClient.invalidateQueries({ queryKey: ["checklist-instances-admin"] });
      toast({ title: inst.is_public ? "Checklist agora é privado" : "Checklist agora é público" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (inst: ChecklistInstance) => {
    if (!confirm(`Tem certeza que deseja excluir "${inst.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteInstance(inst.id);
      queryClient.invalidateQueries({ queryKey: ["checklist-instances-admin"] });
      toast({ title: "Checklist excluído" });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateInstance = async (id: string, updates: Partial<ChecklistInstance>) => {
    try {
      await updateInstance(id, updates as any);
      queryClient.invalidateQueries({ queryKey: ["checklist-instances-admin"] });
      toast({ title: "Checklist atualizado" });
      setEditDialog(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Checklists</h1>
          <p className="text-sm text-muted-foreground">Crie, compartilhe e acompanhe checklists</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/checklists/templates")} className="gap-2">
            <FileText className="h-4 w-4" />Templates
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />Novo Checklist
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, loja ou local..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Prioridades</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {uniqueStores.length > 0 && (
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Loja" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Lojas</SelectItem>
              {uniqueStores.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        <div className="rounded-lg border bg-card overflow-hidden">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inst => {
                const assignedUser = allUsers.find((u: any) => u.user_id === inst.assigned_to);
                return (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inst.store || "—"}</TableCell>
                    <TableCell>
                      {assignedUser ? (
                        <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setAssignDialog(inst)}>
                          {assignedUser.full_name}
                        </Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={() => setAssignDialog(inst)}>
                          <UserPlus className="h-3 w-3" />Atribuir
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[inst.status]}>{statusLabels[inst.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={inst.progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{inst.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inst.is_public ? "default" : "outline"} className="text-xs cursor-pointer" onClick={() => togglePublic(inst)}>
                        {inst.is_public ? "Público" : "Privado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditDialog(inst)} title="Editar">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(inst)} title="Copiar link">
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(getChecklistUrl(inst), "_blank")} title="Abrir">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/checklists/${inst.id}`)} title="Executar">
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(inst)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateChecklistDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        templates={templates}
        allUsers={allUsers}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["checklist-instances-admin"] });
        }}
      />

      <AssignChecklistDialog
        instance={assignDialog}
        onOpenChange={(open) => { if (!open) setAssignDialog(null); }}
        allUsers={allUsers}
        onAssigned={() => {
          queryClient.invalidateQueries({ queryKey: ["checklist-instances-admin"] });
          setAssignDialog(null);
        }}
      />

      {editDialog && (
        <EditChecklistDialog
          instance={editDialog}
          onOpenChange={(open) => { if (!open) setEditDialog(null); }}
          onSave={handleUpdateInstance}
        />
      )}
    </div>
  );
}

function EditChecklistDialog({ instance, onOpenChange, onSave }: {
  instance: ChecklistInstance;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<ChecklistInstance>) => void;
}) {
  const [name, setName] = useState(instance.name);
  const [store, setStore] = useState(instance.store || "");
  const [location, setLocation] = useState(instance.location || "");
  const [status, setStatus] = useState(instance.status);
  const [priority, setPriority] = useState(instance.priority);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Checklist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loja/Unidade</Label>
              <Input value={store} onChange={e => setStore(e.target.value)} />
            </div>
            <div>
              <Label>Local</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={v => setPriority(v as any)}>
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
          <Button onClick={() => onSave(instance.id, { name, store: store || undefined, location: location || undefined, status, priority } as any)}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const roleFilterOptions = [
  { value: "all", label: "Todos" },
  { value: "promotor", label: "Promotores" },
  { value: "funcionario", label: "Funcionários" },
  { value: "gerente", label: "Gerentes" },
  { value: "fornecedor", label: "Fornecedores" },
];

function getUserRoleLabel(user: any): string {
  if (user.roles?.includes("admin")) return "Admin";
  if (user.roles?.includes("gerente")) return "Gerente";
  if (user.roles?.includes("funcionario")) {
    // Check if promoter
    return "Funcionário";
  }
  return "Fornecedor";
}

function isPromoter(user: any): boolean {
  // Promoters have portal_promotora permission or funcionario role with promoter profile indicator
  return user.roles?.includes("funcionario") && !user.roles?.includes("gerente");
}

function filterUsersByRole(users: any[], roleFilter: string): any[] {
  if (roleFilter === "all") return users;
  if (roleFilter === "promotor") return users.filter((u: any) => isPromoter(u));
  if (roleFilter === "funcionario") return users.filter((u: any) => u.roles?.includes("funcionario") || u.roles?.includes("gerente"));
  if (roleFilter === "gerente") return users.filter((u: any) => u.roles?.includes("gerente"));
  if (roleFilter === "fornecedor") return users.filter((u: any) => u.roles?.includes("fornecedor") || (!u.roles?.length));
  return users;
}

function UserSelector({ users, value, onChange, roleFilter, onRoleFilterChange, searchTerm, onSearchChange }: {
  users: any[];
  value: string;
  onChange: (v: string) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
}) {
  const filtered = filterUsersByRole(users, roleFilter).filter((u: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-2">
      <Label>Responsável</Label>
      <div className="flex flex-wrap gap-1">
        {roleFilterOptions.map(opt => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={roleFilter === opt.value ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => onRoleFilterChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <Input
        placeholder="Buscar por nome ou email..."
        value={searchTerm}
        onChange={e => onSearchChange(e.target.value)}
        className="h-8 text-sm"
      />
      <Select value={value || "none"} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem responsável</SelectItem>
          {filtered.map((u: any) => (
            <SelectItem key={u.user_id} value={u.user_id}>
              {u.full_name} · {getUserRoleLabel(u)} · {u.email}
            </SelectItem>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum usuário encontrado</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function CreateChecklistDialog({ open, onOpenChange, templates, allUsers, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: ChecklistTemplate[];
  allUsers: any[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [location, setLocation] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [priority, setPriority] = useState<ChecklistPriority>("media");
  const [isPublic, setIsPublic] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (!templateId) { toast({ title: "Selecione um template", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const meta = { name, store: store || undefined, location: location || undefined, priority };
      const instance = await createInstanceFromTemplate(templateId, meta);
      const updates: any = {};
      if (isPublic) updates.is_public = true;
      if (assignedTo && assignedTo !== "none") updates.assigned_to = assignedTo;
      if (Object.keys(updates).length) {
        await updateInstance(instance.id, updates);
      }
      const url = isPublic
        ? `${window.location.origin}/checklist-publico/${instance.id}`
        : `${window.location.origin}/checklists/${instance.id}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Checklist criado! Link copiado para a área de transferência." });
      onOpenChange(false);
      setName(""); setStore(""); setLocation(""); setTemplateId(""); setPriority("media"); setIsPublic(false); setAssignedTo(""); setRoleFilter("all"); setUserSearch("");
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Novo Checklist</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
              <SelectContent>
                {templates.filter(t => t.is_active).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Inauguração Loja Centro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Loja/Unidade</Label><Input value={store} onChange={e => setStore(e.target.value)} placeholder="Loja Centro" /></div>
            <div><Label>Local</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Piso 1" /></div>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={v => setPriority(v as ChecklistPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <UserSelector
            users={allUsers}
            value={assignedTo}
            onChange={setAssignedTo}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            searchTerm={userSearch}
            onSearchChange={setUserSearch}
          />
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <div>
              <Label className="font-medium">Acesso público</Label>
              <p className="text-xs text-muted-foreground">Qualquer pessoa com o link pode preencher, sem login</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>{loading ? "Criando..." : "Criar e Copiar Link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignChecklistDialog({ instance, onOpenChange, allUsers, onAssigned }: {
  instance: ChecklistInstance | null;
  onOpenChange: (o: boolean) => void;
  allUsers: any[];
  onAssigned: () => void;
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!instance) return;
    setLoading(true);
    try {
      const assignValue = selectedUser === "none" ? null : selectedUser || null;
      await updateInstance(instance.id, { assigned_to: assignValue } as any);
      toast({ title: assignValue ? "Responsável atribuído!" : "Responsável removido!" });
      onAssigned();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={!!instance} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Atribuir Responsável</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Checklist: <strong>{instance?.name}</strong></p>
          <UserSelector
            users={allUsers}
            value={selectedUser}
            onChange={setSelectedUser}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            searchTerm={userSearch}
            onSearchChange={setUserSearch}
          />
          <p className="text-xs text-muted-foreground">
            O responsável precisará fazer login para acessar o checklist.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
