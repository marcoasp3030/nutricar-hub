import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, FileCheck, Trash2, Loader2, CheckCircle, XCircle, Clock, Users, FileText, Save, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

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

interface LgpdDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  updated_at: string;
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

// Simple markdown-like renderer for preview
const renderMarkdown = (text: string) => {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-3 mb-1">{line.slice(3)}</h2>;
    if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
      if (match) return <li key={i} className="ml-4 text-sm"><strong>{match[1]}</strong>{match[2]}</li>;
    }
    if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm">{line}</p>;
  });
};

const AdminLgpdPage = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [requests, setRequests] = useState<LgpdRequest[]>([]);
  const [documents, setDocuments] = useState<LgpdDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<LgpdDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [consentsRes, requestsRes, docsRes] = await Promise.all([
        supabase.from("lgpd_consents" as any).select("*").order("consented_at", { ascending: false }),
        supabase.from("lgpd_requests" as any).select("*").order("requested_at", { ascending: false }),
        supabase.from("lgpd_documents" as any).select("*").order("type"),
      ]);

      const consentData = (consentsRes.data || []) as any[];
      const requestData = (requestsRes.data || []) as any[];

      const userIds = [...new Set([
        ...consentData.map((c: any) => c.user_id),
        ...requestData.map((r: any) => r.user_id),
      ])];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, cnpj").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setConsents(consentData.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) })));
        setRequests(requestData.map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) })));
      } else {
        setConsents([]);
        setRequests([]);
      }

      setDocuments((docsRes.data || []) as unknown as LgpdDocument[]);
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

      const { error } = await supabase.from("lgpd_requests" as any).update(updateData).eq("id", id);
      if (error) throw error;
      toast.success(`Solicitação ${statusLabels[newStatus]?.toLowerCase() || newStatus}`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
    setProcessing(null);
  };

  const startEditing = (doc: LgpdDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditVersion(doc.version);
  };

  const handleSaveDocument = async () => {
    if (!editingDoc) return;
    setSavingDoc(true);
    try {
      const { error } = await supabase
        .from("lgpd_documents" as any)
        .update({
          title: editTitle,
          content: editContent,
          version: editVersion,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", editingDoc.id);

      if (error) throw error;
      toast.success("Documento atualizado com sucesso");
      setEditingDoc(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
    setSavingDoc(false);
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
          Gerenciamento de consentimentos, solicitações e documentos legais
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

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1.5" /> Documentos
          </TabsTrigger>
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

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {editingDoc ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Editando: {editingDoc.type === "terms" ? "Termos de Uso" : "Política de Privacidade"}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingDoc(null)}>
                    Cancelar
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Versão</Label>
                    <Input value={editVersion} onChange={(e) => setEditVersion(e.target.value)} placeholder="ex: 1.1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Conteúdo (suporta formatação com # e ## para títulos, - para listas)</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1.5" /> Pré-visualizar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editTitle}</DialogTitle>
                        </DialogHeader>
                        <div className="prose prose-sm dark:prose-invert">
                          {renderMarkdown(editContent)}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                    placeholder="Escreva o conteúdo do documento..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveDocument} disabled={savingDoc}>
                    {savingDoc ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Salvar Documento
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">{doc.title}</h3>
                        <Badge variant="secondary" className="text-xs">v{doc.version}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tipo: {doc.type === "terms" ? "Termos de Uso" : "Política de Privacidade"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Última atualização: {format(new Date(doc.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                        {doc.content.replace(/[#*-]/g, '').slice(0, 200)}...
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1.5" /> Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{doc.title}</DialogTitle>
                          </DialogHeader>
                          <div className="prose prose-sm dark:prose-invert">
                            {renderMarkdown(doc.content)}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" onClick={() => startEditing(doc)}>
                        <FileText className="h-4 w-4 mr-1.5" /> Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Requests Tab */}
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

        {/* Consents Tab */}
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
                        <td className="px-4 py-3 font-medium text-foreground">{c.profile?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.profile?.cnpj || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.consent_type === "terms_and_privacy" ? "Termos e Privacidade" : c.consent_type}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">v{c.version}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(c.consented_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={c.revoked_at
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          }>
                            {c.revoked_at ? "Revogado" : "Ativo"}
                          </Badge>
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
