import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEventTypes, upsertEventType, EventType } from "@/lib/jobsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_REQ_OPTIONS = [
  { key: "exigir_foto", label: "Exigir fotos" },
  { key: "exigir_uniforme", label: "Exigir uniforme" },
  { key: "exigir_experiencia", label: "Exigir experiência" },
  { key: "exigir_checklist", label: "Gerar checklist" },
];

const AdminEventTypesPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true, default_requirements: {} as Record<string, boolean> });

  const { data: types = [], isLoading } = useQuery({ queryKey: ["event_types"], queryFn: fetchEventTypes });

  const mutation = useMutation({
    mutationFn: (data: Partial<EventType>) => upsertEventType(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event_types"] });
      toast({ title: "Tipo de evento salvo!" });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true, default_requirements: {} });
    setOpen(true);
  };

  const openEdit = (et: EventType) => {
    setEditing(et);
    setForm({ name: et.name, description: et.description || "", is_active: et.is_active, default_requirements: et.default_requirements || {} });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    mutation.mutate({ ...(editing ? { id: editing.id } : {}), ...form });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tipos de Evento</h1>
          <p className="text-sm text-muted-foreground">Configure os tipos disponíveis para publicação de jobs</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Tipo</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((et) => (
            <Card key={et.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(et)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    {et.name}
                  </CardTitle>
                  <Badge variant={et.is_active ? "default" : "secondary"}>{et.is_active ? "Ativo" : "Inativo"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{et.description || "Sem descrição"}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(et.default_requirements || {}).filter(([, v]) => v).map(([k]) => (
                    <Badge key={k} variant="outline" className="text-xs">{DEFAULT_REQ_OPTIONS.find(o => o.key === k)?.label || k}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Tipo de Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Inauguração" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva este tipo de evento" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativo</Label>
            </div>
            <div>
              <Label className="mb-2 block">Requisitos padrão</Label>
              {DEFAULT_REQ_OPTIONS.map((opt) => (
                <div key={opt.key} className="flex items-center gap-2 py-1">
                  <Switch
                    checked={!!form.default_requirements[opt.key]}
                    onCheckedChange={(v) => setForm({ ...form, default_requirements: { ...form.default_requirements, [opt.key]: v } })}
                  />
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventTypesPage;
