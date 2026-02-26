import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchTemplates, createTemplate, deleteTemplate, duplicateTemplate,
  type ChecklistTemplate,
} from "@/lib/checklistApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Copy, FileText, Search, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ChecklistTemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: fetchTemplates,
  });

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTemplate(deleteId);
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast({ title: "Template excluído" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const handleDuplicate = async (t: ChecklistTemplate) => {
    try {
      const newT = await duplicateTemplate(t.id);
      toast({ title: "Template duplicado com todas as seções e itens!" });
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      navigate(`/admin/checklists/templates/${newT.id}`);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Checklist</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie modelos reutilizáveis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/checklists")} className="gap-2"><ClipboardList className="h-4 w-4" />Gestão</Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" />Novo Template</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{isLoading ? "Carregando..." : "Nenhum template encontrado"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <Card key={t.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Ativo" : "Inativo"}</Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
              </CardHeader>
              <CardContent>
                {t.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.tags.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                  </div>
                )}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/admin/checklists/templates/${t.id}`)}>
                    <Edit className="h-3 w-3" />Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(t)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateTemplateDialog open={showCreate} onOpenChange={setShowCreate} onCreated={(id) => {
        queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
        navigate(`/admin/checklists/templates/${id}`);
      }} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Seções e itens serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateTemplateDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const t = await createTemplate({
        name,
        description: description || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      onOpenChange(false);
      setName(""); setDescription(""); setTags("");
      onCreated(t.id);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Inauguração de Loja" /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do template..." rows={2} /></div>
          <div><Label>Tags (separadas por vírgula)</Label><Input value={tags} onChange={e => setTags(e.target.value)} placeholder="inauguração, loja, setup" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>{loading ? "Criando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
