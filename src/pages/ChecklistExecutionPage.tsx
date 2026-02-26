import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInstance, fetchResponseItems, updateResponseItem, updateInstance,
  recalculateProgress, fetchAuditLog, type ChecklistResponseItem, type ChecklistItemStatus, type ChecklistStatus,
} from "@/lib/checklistApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, AlertTriangle, Clock,
  MessageSquare, Save, Play, CheckCheck, ThumbsUp, ThumbsDown, History,
  Link2, Copy, Globe, Lock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export default function ChecklistExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [obsDialog, setObsDialog] = useState<{ item: ChecklistResponseItem; newStatus: ChecklistItemStatus } | null>(null);
  const [obsText, setObsText] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: instance, refetch: refetchInstance } = useQuery({
    queryKey: ["checklist-instance", id],
    queryFn: () => fetchInstance(id!),
    enabled: !!id,
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["checklist-items", id],
    queryFn: () => fetchResponseItems(id!),
    enabled: !!id,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ["checklist-audit", id],
    queryFn: () => fetchAuditLog(id!),
    enabled: !!id && showHistory,
  });

  // Group items by section
  const sections = useMemo(() => {
    const map = new Map<string, ChecklistResponseItem[]>();
    items.forEach(item => {
      const key = item.section_name || "Sem seção";
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
    if (!obsDialog) return;
    if (!obsText.trim()) {
      toast({ title: "Observação obrigatória para problemas", variant: "destructive" });
      return;
    }
    try {
      await updateResponseItem(obsDialog.item.id, {
        status: obsDialog.newStatus,
        observation: obsText,
        requires_action: true,
      });
      await recalculateProgress(id!);
      setObsDialog(null);
      refetchItems();
      refetchInstance();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleQuantityChange = async (item: ChecklistResponseItem, qty: number) => {
    try {
      await updateResponseItem(item.id, { actual_quantity: qty });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleObservationBlur = async (item: ChecklistResponseItem, text: string) => {
    if (text !== item.observation) {
      try {
        await updateResponseItem(item.id, { observation: text });
      } catch (e: any) {
        toast({ title: "Erro", description: e.message, variant: "destructive" });
      }
    }
  };

  const changeInstanceStatus = async (newStatus: ChecklistStatus) => {
    if (newStatus === "concluido") {
      const blocking = items.filter(i => i.is_required && i.status === "pendente");
      if (blocking.length > 0) {
        toast({ title: `${blocking.length} item(ns) obrigatório(s) pendente(s)`, variant: "destructive" });
        return;
      }
      const blockingItems = items.filter(i => i.is_blocking && i.status === "problema");
      if (blockingItems.length > 0) {
        toast({ title: `${blockingItems.length} item(ns) bloqueante(s) com problema`, variant: "destructive" });
        return;
      }
    }
    try {
      await updateInstance(id!, { status: newStatus } as any);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('checklist_audit_log').insert({
        instance_id: id!,
        action: `status_changed_to_${newStatus}`,
        details: { from: instance?.status },
        created_by: user?.id,
      });
      toast({ title: `Status alterado para ${statusLabels[newStatus]}` });
      refetchInstance();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const markAllOk = async () => {
    const pending = items.filter(i => i.status === "pendente");
    for (const item of pending) {
      await updateResponseItem(item.id, { status: "ok" as ChecklistItemStatus });
    }
    await recalculateProgress(id!);
    refetchItems();
    refetchInstance();
    toast({ title: `${pending.length} itens marcados como OK` });
  };

  if (!instance) return null;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/checklists")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{instance.name}</h1>
          <p className="text-xs text-muted-foreground">{instance.store}{instance.location ? ` · ${instance.location}` : ""}</p>
        </div>
        <Badge variant="secondary">{statusLabels[instance.status]}</Badge>
      </div>

      {/* Progress bar */}
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

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {instance.status === "rascunho" && (
          <Button size="sm" onClick={() => changeInstanceStatus("em_andamento")} className="gap-1"><Play className="h-3 w-3" />Iniciar</Button>
        )}
        {instance.status === "em_andamento" && (
          <>
            <Button size="sm" onClick={() => changeInstanceStatus("concluido")} className="gap-1"><CheckCheck className="h-3 w-3" />Concluir</Button>
            <Button size="sm" variant="outline" onClick={markAllOk} className="gap-1"><CheckCircle2 className="h-3 w-3" />Marcar tudo OK</Button>
          </>
        )}
        {instance.status === "concluido" && (
          <>
            <Button size="sm" variant="outline" onClick={() => changeInstanceStatus("aprovado")} className="gap-1 text-green-600"><ThumbsUp className="h-3 w-3" />Aprovar</Button>
            <Button size="sm" variant="outline" onClick={() => changeInstanceStatus("reprovado")} className="gap-1 text-destructive"><ThumbsDown className="h-3 w-3" />Reprovar</Button>
          </>
        )}
        {instance.status === "reprovado" && (
          <Button size="sm" onClick={() => changeInstanceStatus("em_andamento")} className="gap-1"><Play className="h-3 w-3" />Reabrir</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} className="gap-1 ml-auto"><History className="h-3 w-3" />Histórico</Button>
      </div>

      {/* Access & Assignment card */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {instance.is_public ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <div>
                <Label className="text-sm font-medium">Acesso público</Label>
                <p className="text-xs text-muted-foreground">
                  {instance.is_public ? "Qualquer pessoa com o link pode acessar" : "Requer login para acessar"}
                </p>
              </div>
            </div>
            <Switch
              checked={instance.is_public}
              onCheckedChange={async (checked) => {
                try {
                  await updateInstance(id!, { is_public: checked } as any);
                  refetchInstance();
                  toast({ title: checked ? "Checklist agora é público" : "Checklist agora requer login" });
                } catch (e: any) {
                  toast({ title: "Erro", description: e.message, variant: "destructive" });
                }
              }}
            />
          </div>
          {instance.is_public && (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/checklist-publico/${id}`}
                className="text-xs h-8 bg-muted"
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-1 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/checklist-publico/${id}`);
                  toast({ title: "Link copiado!" });
                }}
              >
                <Copy className="h-3 w-3" />Copiar
              </Button>
            </div>
          )}
          {instance.assigned_to && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                Atribuído a um responsável
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit log */}
      {showHistory && auditLog.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {auditLog.map((log: any) => (
              <div key={log.id} className="flex items-start gap-2 text-xs border-b border-border pb-2 last:border-0">
                <History className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">{log.action}</span>
                  <span className="text-muted-foreground ml-2">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sections & Items */}
      {sections.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-muted-foreground">
            Nenhum item neste checklist. Crie itens ou use um template.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={sections.map(([name]) => name)} className="space-y-2">
          {sections.map(([sectionName, sectionItems]) => {
            const sOk = sectionItems.filter(i => i.status === "ok").length;
            const sTotal = sectionItems.length;
            return (
              <AccordionItem key={sectionName} value={sectionName} className="border rounded-lg bg-card overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="font-semibold text-sm">{sectionName}</span>
                    <Badge variant="secondary" className="text-xs">{sOk}/{sTotal}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-border">
                    {sectionItems.map(item => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        disabled={instance.status !== "em_andamento"}
                        onStatusChange={(s) => handleStatusChange(item, s)}
                        onQuantityChange={(q) => handleQuantityChange(item, q)}
                        onObservationBlur={(t) => handleObservationBlur(item, t)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Problem observation dialog */}
      <Dialog open={!!obsDialog} onOpenChange={() => setObsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Problema</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Item: <strong>{obsDialog?.item.item_name}</strong></p>
            <Textarea placeholder="Descreva o problema..." value={obsText} onChange={e => setObsText(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleObsSubmit}>Confirmar Problema</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistItemRow({ item, disabled, onStatusChange, onQuantityChange, onObservationBlur }: {
  item: ChecklistResponseItem;
  disabled: boolean;
  onStatusChange: (s: ChecklistItemStatus) => void;
  onQuantityChange: (q: number) => void;
  onObservationBlur: (t: string) => void;
}) {
  const cfg = itemStatusConfig[item.status];
  const StatusIcon = cfg.icon;
  const [localObs, setLocalObs] = useState(item.observation || "");
  const [localQty, setLocalQty] = useState(item.actual_quantity?.toString() || "");
  const [showObs, setShowObs] = useState(false);

  useEffect(() => { setLocalObs(item.observation || ""); }, [item.observation]);
  useEffect(() => { setLocalQty(item.actual_quantity?.toString() || ""); }, [item.actual_quantity]);

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
        <span className="flex-1 text-sm">{item.item_name}</span>
        {item.is_required && <Badge variant="outline" className="text-[10px] px-1">Obrig.</Badge>}
      </div>

      {/* Quick actions */}
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

      {/* Quantity field */}
      {(item.item_type === "quantidade") && (
        <div className="ml-6">
          <Input type="number" placeholder="Qtd" className="h-8 w-24 text-sm" disabled={disabled}
            value={localQty} onChange={e => setLocalQty(e.target.value)}
            onBlur={() => { const n = parseFloat(localQty); if (!isNaN(n)) onQuantityChange(n); }}
          />
        </div>
      )}

      {/* Observation */}
      {(showObs || item.observation) && (
        <div className="ml-6">
          <Textarea className="text-xs min-h-[48px]" placeholder="Observação..." disabled={disabled}
            value={localObs} onChange={e => setLocalObs(e.target.value)}
            onBlur={() => onObservationBlur(localObs)}
          />
        </div>
      )}
    </div>
  );
}
