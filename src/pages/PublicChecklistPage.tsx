import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  fetchInstance, fetchResponseItems, updateResponseItem, updateInstance,
  recalculateProgress, type ChecklistResponseItem, type ChecklistItemStatus,
} from "@/lib/checklistApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, AlertTriangle, MinusCircle, Clock, MessageSquare, Play, CheckCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo-nutricar.webp";

const itemStatusConfig: Record<ChecklistItemStatus, { icon: typeof CheckCircle2; label: string; color: string }> = {
  pendente: { icon: Clock, label: "Pendente", color: "text-muted-foreground" },
  em_execucao: { icon: Play, label: "Em Execução", color: "text-blue-600" },
  ok: { icon: CheckCircle2, label: "OK", color: "text-green-600" },
  nao_aplicavel: { icon: MinusCircle, label: "N/A", color: "text-muted-foreground" },
  problema: { icon: AlertTriangle, label: "Problema", color: "text-destructive" },
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", em_andamento: "Em Andamento", concluido: "Concluído",
  aprovado: "Aprovado", reprovado: "Reprovado", arquivado: "Arquivado",
};

export default function PublicChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [obsDialog, setObsDialog] = useState<{ item: ChecklistResponseItem; newStatus: ChecklistItemStatus } | null>(null);
  const [obsText, setObsText] = useState("");

  const { data: instance, refetch: refetchInstance, isError } = useQuery({
    queryKey: ["public-checklist-instance", id],
    queryFn: () => fetchInstance(id!),
    enabled: !!id,
    retry: 1,
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["public-checklist-items", id],
    queryFn: () => fetchResponseItems(id!),
    enabled: !!id,
  });

  // Auto-start if rascunho
  useEffect(() => {
    if (instance?.status === "rascunho") {
      updateInstance(id!, { status: "em_andamento" } as any).then(() => refetchInstance());
    }
  }, [instance?.status]);

  const sections = useMemo(() => {
    const map = new Map<string, ChecklistResponseItem[]>();
    items.forEach(item => {
      const key = item.section_name || "Itens";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const handleStatusChange = async (item: ChecklistResponseItem, newStatus: ChecklistItemStatus) => {
    if (newStatus === "problema") {
      setObsDialog({ item, newStatus });
      setObsText(item.observation || "");
      return;
    }
    try {
      await updateResponseItem(item.id, { status: newStatus });
      await recalculateProgress(id!);
      refetchItems();
      refetchInstance();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleObsSubmit = async () => {
    if (!obsDialog || !obsText.trim()) {
      toast({ title: "Observação obrigatória", variant: "destructive" });
      return;
    }
    try {
      await updateResponseItem(obsDialog.item.id, { status: obsDialog.newStatus, observation: obsText, requires_action: true });
      await recalculateProgress(id!);
      setObsDialog(null);
      refetchItems();
      refetchInstance();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleFinish = async () => {
    const required = items.filter(i => i.is_required && i.status === "pendente");
    if (required.length > 0) {
      toast({ title: `${required.length} item(ns) obrigatório(s) pendente(s)`, variant: "destructive" });
      return;
    }
    try {
      await updateInstance(id!, { status: "concluido" } as any);
      toast({ title: "Checklist concluído com sucesso!" });
      refetchInstance();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full py-12">
          <CardContent className="text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Checklist não encontrado</h2>
            <p className="text-sm text-muted-foreground">Este link pode ter expirado ou o checklist não é público.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!instance) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const isCompleted = ["concluido", "aprovado"].includes(instance.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-8 object-contain" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{instance.name}</h1>
            <p className="text-xs text-muted-foreground">{instance.store}{instance.location ? ` · ${instance.location}` : ""}</p>
          </div>
          <Badge variant="secondary">{statusLabels[instance.status]}</Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
        {/* Progress */}
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{instance.progress}% concluído</span>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{instance.ok_count}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{instance.pending_count}</span>
                {instance.problem_count > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />{instance.problem_count}</span>
                )}
              </div>
            </div>
            <Progress value={instance.progress} className="h-2" />
          </CardContent>
        </Card>

        {isCompleted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Checklist concluído!</p>
              <p className="text-sm text-green-600">Obrigado por preencher.</p>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <Accordion type="multiple" defaultValue={sections.map(([n]) => n)} className="space-y-2">
            {sections.map(([sectionName, sectionItems]) => {
              const sOk = sectionItems.filter(i => i.status === "ok").length;
              return (
                <AccordionItem key={sectionName} value={sectionName} className="border rounded-lg bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <span className="font-semibold text-sm">{sectionName}</span>
                      <Badge variant="secondary" className="text-xs">{sOk}/{sectionItems.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="divide-y divide-border">
                      {sectionItems.map(item => (
                        <PublicItemRow key={item.id} item={item} disabled={isCompleted} onStatusChange={s => handleStatusChange(item, s)} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Finish button */}
        {!isCompleted && instance.status === "em_andamento" && (
          <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4">
            <div className="max-w-2xl mx-auto">
              <Button onClick={handleFinish} className="w-full gap-2" size="lg">
                <CheckCheck className="h-4 w-4" />Concluir Checklist
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Problem dialog */}
      <Dialog open={!!obsDialog} onOpenChange={() => setObsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Problema</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Item: <strong>{obsDialog?.item.item_name}</strong></p>
            <Textarea placeholder="Descreva o problema..." value={obsText} onChange={e => setObsText(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleObsSubmit}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublicItemRow({ item, disabled, onStatusChange }: {
  item: ChecklistResponseItem; disabled: boolean; onStatusChange: (s: ChecklistItemStatus) => void;
}) {
  const cfg = itemStatusConfig[item.status];
  const StatusIcon = cfg.icon;
  const [showObs, setShowObs] = useState(false);
  const [localObs, setLocalObs] = useState(item.observation || "");
  const [localQty, setLocalQty] = useState(item.actual_quantity?.toString() || "");

  useEffect(() => { setLocalObs(item.observation || ""); }, [item.observation]);

  const saveObs = async () => {
    if (localObs !== item.observation) {
      try { await updateResponseItem(item.id, { observation: localObs }); } catch { }
    }
  };

  const saveQty = async () => {
    const n = parseFloat(localQty);
    if (!isNaN(n) && n !== item.actual_quantity) {
      try { await updateResponseItem(item.id, { actual_quantity: n }); } catch { }
    }
  };

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
        <span className="flex-1 text-sm">{item.item_name}</span>
        {item.is_required && <Badge variant="outline" className="text-[10px] px-1">Obrig.</Badge>}
      </div>

      {!disabled && (
        <div className="flex gap-1 ml-6">
          <Button size="sm" variant={item.status === "ok" ? "default" : "outline"} className="h-7 px-2 text-xs gap-1" onClick={() => onStatusChange("ok")}>
            <CheckCircle2 className="h-3 w-3" />OK
          </Button>
          <Button size="sm" variant={item.status === "problema" ? "destructive" : "outline"} className="h-7 px-2 text-xs gap-1" onClick={() => onStatusChange("problema")}>
            <AlertTriangle className="h-3 w-3" />Problema
          </Button>
          <Button size="sm" variant={item.status === "nao_aplicavel" ? "secondary" : "outline"} className="h-7 px-2 text-xs gap-1" onClick={() => onStatusChange("nao_aplicavel")}>
            N/A
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowObs(!showObs)}>
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      )}

      {item.item_type === "quantidade" && (
        <div className="ml-6">
          <Input type="number" placeholder="Qtd" className="h-8 w-24 text-sm" disabled={disabled}
            value={localQty} onChange={e => setLocalQty(e.target.value)} onBlur={saveQty} />
        </div>
      )}

      {(showObs || item.observation) && (
        <div className="ml-6">
          <Textarea className="text-xs min-h-[48px]" placeholder="Observação..." disabled={disabled}
            value={localObs} onChange={e => setLocalObs(e.target.value)} onBlur={saveObs} />
        </div>
      )}
    </div>
  );
}
