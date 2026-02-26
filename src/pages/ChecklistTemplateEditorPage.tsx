import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTemplateWithDetails, updateTemplate, createSection, updateSection, deleteSection,
  createItem, updateItem, deleteItem,
  type TemplateSection, type TemplateItem, type ChecklistItemType,
} from "@/lib/checklistApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save, Copy,
  CheckSquare, Hash, Type, ToggleLeft, CalendarDays, Camera, PenTool,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const itemTypeLabels: Record<ChecklistItemType, { label: string; icon: typeof CheckSquare }> = {
  checkbox: { label: "Checkbox", icon: CheckSquare },
  quantidade: { label: "Quantidade", icon: Hash },
  texto: { label: "Texto", icon: Type },
  sim_nao: { label: "Sim/Não", icon: ToggleLeft },
  data_hora: { label: "Data/Hora", icon: CalendarDays },
  foto: { label: "Foto", icon: Camera },
  assinatura: { label: "Assinatura", icon: PenTool },
};

export default function ChecklistTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [addItemSectionId, setAddItemSectionId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

  const { data: template, refetch } = useQuery({
    queryKey: ["checklist-template-detail", id],
    queryFn: () => fetchTemplateWithDetails(id!),
    enabled: !!id,
  });

  const handleSaveTemplate = async (data: { name?: string; description?: string; is_active?: boolean }) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateTemplate(id, data);
      refetch();
      toast({ title: "Template salvo!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleAddSection = async (name: string, color: string) => {
    if (!id) return;
    try {
      const order = (template?.sections?.length || 0) * 10;
      await createSection({ template_id: id, name, sort_order: order, color });
      refetch();
      setShowAddSection(false);
      toast({ title: "Seção adicionada!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection(sectionId);
      refetch();
      toast({ title: "Seção removida" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleAddItem = async (sectionId: string, data: Partial<TemplateItem> & { name: string }) => {
    try {
      const section = template?.sections?.find(s => s.id === sectionId);
      const order = (section?.items?.length || 0) * 10;
      await createItem({ ...data, section_id: sectionId, sort_order: order });
      refetch();
      setAddItemSectionId(null);
      toast({ title: "Item adicionado!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateItem = async (itemId: string, data: Partial<TemplateItem>) => {
    try {
      await updateItem(itemId, data);
      refetch();
      setEditingItem(null);
      toast({ title: "Item atualizado!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId);
      refetch();
      toast({ title: "Item removido" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDuplicateItem = async (item: TemplateItem) => {
    try {
      await createItem({
        section_id: item.section_id,
        name: `${item.name} (cópia)`,
        item_type: item.item_type,
        default_quantity: item.default_quantity,
        unit: item.unit,
        is_required: item.is_required,
        requires_attachments: item.requires_attachments,
        default_observation: item.default_observation,
        sort_order: item.sort_order + 1,
      });
      refetch();
      toast({ title: "Item duplicado!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (!template) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/checklists/templates")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Editor de Template</h1>
          <p className="text-sm text-muted-foreground">{template.name}</p>
        </div>
      </div>

      {/* Template metadata */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input defaultValue={template.name} onBlur={e => { if (e.target.value !== template.name) handleSaveTemplate({ name: e.target.value }); }} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={template.is_active} onCheckedChange={v => handleSaveTemplate({ is_active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea defaultValue={template.description || ""} rows={2}
              onBlur={e => { if (e.target.value !== (template.description || "")) handleSaveTemplate({ description: e.target.value }); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Seções</h2>
        <Button size="sm" onClick={() => setShowAddSection(true)} className="gap-1"><Plus className="h-3 w-3" />Seção</Button>
      </div>

      {template.sections?.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-muted-foreground">Nenhuma seção. Adicione a primeira seção acima.</CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={template.sections?.map(s => s.id) || []} className="space-y-2">
          {template.sections?.map(section => (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                  <span className="font-semibold text-sm">{section.name}</span>
                  <Badge variant="secondary" className="text-xs">{section.items?.length || 0} itens</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                {/* Section actions */}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddItemSectionId(section.id)}>
                    <Plus className="h-3 w-3" />Item
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteSection(section.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {section.items?.map(item => {
                    const TypeIcon = itemTypeLabels[item.item_type]?.icon || CheckSquare;
                    return (
                      <div key={item.id} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm group">
                        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                        <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{item.name}</span>
                        <Badge variant="outline" className="text-[10px]">{itemTypeLabels[item.item_type]?.label}</Badge>
                        {item.is_required && <Badge variant="secondary" className="text-[10px]">Obrig.</Badge>}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingItem(item)}><Save className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDuplicateItem(item)}><Copy className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Add Section Dialog */}
      <AddSectionDialog open={showAddSection} onOpenChange={setShowAddSection} onAdd={handleAddSection} />

      {/* Add Item Dialog */}
      <ItemFormDialog
        open={!!addItemSectionId}
        onOpenChange={() => setAddItemSectionId(null)}
        title="Novo Item"
        onSubmit={(data) => addItemSectionId && handleAddItem(addItemSectionId, data)}
      />

      {/* Edit Item Dialog */}
      <ItemFormDialog
        open={!!editingItem}
        onOpenChange={() => setEditingItem(null)}
        title="Editar Item"
        initial={editingItem || undefined}
        onSubmit={(data) => editingItem && handleUpdateItem(editingItem.id, data)}
      />
    </div>
  );
}

function AddSectionDialog({ open, onOpenChange, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void; onAdd: (name: string, color: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleSubmit = () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    onAdd(name, color);
    setName(""); setColor("#3b82f6");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Nova Seção</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ESTRUTURAS" /></div>
          <div><Label>Cor</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-20" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemFormDialog({ open, onOpenChange, title, initial, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  initial?: Partial<TemplateItem>; onSubmit: (data: any) => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [itemType, setItemType] = useState<ChecklistItemType>(initial?.item_type || "checkbox");
  const [isRequired, setIsRequired] = useState(initial?.is_required || false);
  const [requiresAttachments, setRequiresAttachments] = useState(initial?.requires_attachments || false);
  const [defaultQty, setDefaultQty] = useState(initial?.default_quantity?.toString() || "");
  const [unit, setUnit] = useState(initial?.unit || "");
  const [defaultObs, setDefaultObs] = useState(initial?.default_observation || "");

  // Reset when initial changes
  useState(() => {
    if (initial) {
      setName(initial.name || "");
      setItemType(initial.item_type || "checkbox");
      setIsRequired(initial.is_required || false);
      setRequiresAttachments(initial.requires_attachments || false);
      setDefaultQty(initial.default_quantity?.toString() || "");
      setUnit(initial.unit || "");
      setDefaultObs(initial.default_observation || "");
    }
  });

  const handleSubmit = () => {
    if (!name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    onSubmit({
      name,
      item_type: itemType,
      is_required: isRequired,
      requires_attachments: requiresAttachments,
      default_quantity: defaultQty ? parseFloat(defaultQty) : null,
      unit: unit || null,
      default_observation: defaultObs || null,
    });
    setName(""); setItemType("checkbox"); setIsRequired(false); setRequiresAttachments(false); setDefaultQty(""); setUnit(""); setDefaultObs("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div><Label>Nome do item *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Balcão de atendimento" /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={itemType} onValueChange={v => setItemType(v as ChecklistItemType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(itemTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {itemType === "quantidade" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Qtd padrão</Label><Input type="number" value={defaultQty} onChange={e => setDefaultQty(e.target.value)} /></div>
              <div><Label>Unidade</Label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="un, cx, pct" /></div>
            </div>
          )}
          <div className="flex items-center gap-3"><Switch checked={isRequired} onCheckedChange={setIsRequired} /><Label>Obrigatório</Label></div>
          <div className="flex items-center gap-3"><Switch checked={requiresAttachments} onCheckedChange={setRequiresAttachments} /><Label>Exige anexo/foto</Label></div>
          <div><Label>Observação padrão</Label><Input value={defaultObs} onChange={e => setDefaultObs(e.target.value)} placeholder="Observação pré-preenchida" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
