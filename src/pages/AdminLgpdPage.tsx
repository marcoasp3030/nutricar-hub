import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, FileCheck, Trash2, Loader2, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Consent {
  id: string;
  user_id: string;
  consent_type: string;
  consented_at: string;
  version: string;
  revoked_at: string | null;
  profile?: { full_name: string; cnpj: string | null };
}

interface LgpdRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
  completed_at: string | null;
  profile?: { full_name: string; cnpj: string | null };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  completed: "Concluído",
  rejected: "Rejeitado",
};

const AdminLgpdPage = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [requests, setRequests] = useState<LgpdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [consentsRes, requestsRes] = await Promise.all([
        supabase
          .from("lgpd_consents" as any)
          .select("*")
          .order("consented_at", { ascending: false }),
        supabase
          .from("lgpd_requests" as any)
          .select("*")
          .order("requested_at", { ascending: false }),
      ]);

      const consentData = (consentsRes.data || []) as any[];
      const requestData = (requestsRes.data || []) as any[];

      // Get unique user_ids to fetch profiles
      const userIds = [...new Set([
        ...consentData.map((c: any) => c.user_id),
        ...requestData.map((r: any) => r.user_id),
      ])];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, cnpj")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        setConsents(consentData.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
        setRequests(requestData.map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) })));
      } else {
        setConsents([]);
        setRequests([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados LGPD");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdateRequest = async (id: string, newStatus: string) => {
    setProcessing(id);
    try {
      const updateData: any = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      };
      if (adminNotes[id]) updateData.admin_notes = adminNotes[id];
      if (newStatus === "completed") updateData.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from("lgpd_requests" as any)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast.success(`Solicitação ${statusLabels[newStatus]?.toLowerCase() || newStatus}`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
    setProcessing(null);
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const totalConsents = consents.filter(c => !c.revoked_at).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Gestão LGPD
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de consentimentos e solicitações de dados pessoais
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Consentimentos Ativos</p>
              <p className="text-lg font-bold text-foreground">{totalConsents}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solicitações Pendentes</p>
              <p className="text-lg font-bold text-foreground">{pendingRequests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
              <Trash2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Solicitações</p>
              <p className="text-lg font-bold text-foreground">{requests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuários com Consentimento</p>
              <p className="text-lg font-bold text-foreground">
                {new Set(consents.filter(c => !c.revoked_at).map(c => c.user_id)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            Solicitações
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="consents">Consentimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma solicitação registrada.
              </CardContent>
            </Card>
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {req.profile?.full_name || "Usuário desconhecido"}
                        </p>
                        <Badge className={statusColors[req.status] || "bg-muted text-muted-foreground"} variant="secondary">
                          {statusLabels[req.status] || req.status}
                        </Badge>
                      </div>
                      {req.profile?.cnpj && (
                        <p className="text-xs text-muted-foreground">CNPJ: {req.profile.cnpj}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Tipo: {req.request_type === "data_deletion" ? "Exclusão de dados" : req.request_type}
                      </p>
                      {req.reason && (
                        <p className="text-sm text-muted-foreground">Motivo: {req.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Solicitado em: {format(new Date(req.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {req.admin_notes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          Nota do admin: {req.admin_notes}
                        </p>
                      )}
                    </div>

                    {req.status === "pending" && (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Textarea
                          placeholder="Nota do administrador (opcional)"
                          value={adminNotes[req.id] || ""}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="default" disabled={processing === req.id}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Aprovar solicitação de exclusão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ao aprovar, você confirma que os dados pessoais do usuário serão processados para exclusão conforme a LGPD.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleUpdateRequest(req.id, "approved")}>
                                  Confirmar Aprovação
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={processing === req.id}
                            onClick={() => handleUpdateRequest(req.id, "rejected")}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      </div>
                    )}

                    {req.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processing === req.id}
                        onClick={() => handleUpdateRequest(req.id, "completed")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Marcar como Concluído
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="consents" className="space-y-4">
          {consents.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum consentimento registrado.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">CNPJ</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Versão</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consents.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {c.profile?.full_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.profile?.cnpj || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.consent_type === "terms_and_privacy" ? "Termos e Privacidade" : c.consent_type}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">v{c.version}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(c.consented_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3">
                          {c.revoked_at ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              Revogado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Ativo
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLgpdPage;
