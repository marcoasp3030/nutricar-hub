import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Trash2, FileCheck, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Em processamento",
  completed: "Concluído",
  rejected: "Rejeitado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const LgpdPage = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [reqRes, conRes] = await Promise.all([
      supabase.from("lgpd_requests" as any).select("*").eq("user_id", user.id).order("requested_at", { ascending: false }),
      supabase.from("lgpd_consents" as any).select("*").eq("user_id", user.id).order("consented_at", { ascending: false }),
    ]);

    setRequests(reqRes.data || []);
    setConsents(conRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("lgpd_requests" as any).insert({
      user_id: user.id,
      request_type: "data_deletion",
      reason: reason || null,
    });

    if (error) {
      toast.error("Erro ao enviar solicitação");
    } else {
      toast.success("Solicitação de exclusão de dados enviada com sucesso");
      setReason("");
      loadData();
    }
    setSubmitting(false);
  };

  const hasPendingRequest = requests.some((r: any) => r.status === "pending" || r.status === "approved");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Meus Dados (LGPD)
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus dados pessoais conforme a Lei Geral de Proteção de Dados
        </p>
      </div>

      {/* Consents */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Consentimentos</h3>
          </div>
          {consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum consentimento registrado.</p>
          ) : (
            consents.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.consent_type === "terms_and_privacy" ? "Termos de Uso e Política de Privacidade" : c.consent_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Versão {c.version} — {format(new Date(c.consented_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant="secondary" className={c.revoked_at
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }>
                  {c.revoked_at ? "Revogado" : "Ativo"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Data Deletion Request */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Solicitar Exclusão de Dados</h3>
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Ao solicitar a exclusão dos seus dados, um administrador irá avaliar e processar sua solicitação.
                Após concluída, seus dados pessoais serão removidos permanentemente do sistema.
              </p>
            </div>
          </div>

          {hasPendingRequest ? (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Você já possui uma solicitação em andamento.
              </p>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Motivo da solicitação (opcional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={submitting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Solicitar Exclusão de Dados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Solicitação de Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja solicitar a exclusão dos seus dados pessoais?
                      Esta ação será avaliada por um administrador e, se aprovada, seus dados serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitRequest}>
                      Confirmar Solicitação
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      {requests.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Histórico de Solicitações</h3>
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {r.request_type === "data_deletion" ? "Exclusão de dados" : r.request_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {r.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">Resposta: {r.admin_notes}</p>
                  )}
                </div>
                <Badge variant="secondary" className={statusColors[r.status] || ""}>
                  {statusLabels[r.status] || r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LgpdPage;
