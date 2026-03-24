import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, DollarSign, CheckCircle, Clock, Package, Send, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  fornecedor: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  active: { label: "Ativo", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  expired: { label: "Expirado", variant: "secondary" },
};

const PAY_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

const FornecedorContractsPage = ({ fornecedor }: Props) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [requestDialog, setRequestDialog] = useState(false);
  const [requestPkg, setRequestPkg] = useState<any>(null);
  const [requestNotes, setRequestNotes] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => {
      setLoading(true);
      const [cRes, pRes, pkgRes] = await Promise.all([
        supabase.from("ad_contracts").select("*, ad_packages(*)").eq("fornecedor", fornecedor).order("created_at", { ascending: false }),
        supabase.from("ad_payments").select("*, ad_contracts(*, ad_packages(*))"),
        supabase.from("ad_packages").select("*").eq("is_active", true).order("monthly_value"),
      ]);
      setContracts(cRes.data || []);
      // Filter payments to only this fornecedor's contracts
      const contractIds = (cRes.data || []).map((c: any) => c.id);
      setPayments((pRes.data || []).filter((p: any) => contractIds.includes(p.contract_id)));
      setPackages(pkgRes.data || []);
      setLoading(false);
  };

  useEffect(() => {
    if (fornecedor) fetchData();
  }, [fornecedor]);

  const handleRequest = async () => {
    if (!requestPkg) return;
    setRequesting(true);
    const { error } = await supabase.from("ad_contracts").insert({
      fornecedor,
      package_id: requestPkg.id,
      status: "pending",
      notes: requestNotes.trim() || null,
    });
    setRequesting(false);
    if (error) { toast.error("Erro ao solicitar contrato"); return; }
    toast.success("Solicitação enviada! Aguarde aprovação do administrador.");
    setRequestDialog(false);
    setRequestNotes("");
    setRequestPkg(null);
    fetchData();
  };

  const openHistory = async (contractId: string) => {
    setHistoryDialog(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from("ad_contract_history")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    setHistoryData(data || []);
    setHistoryLoading(false);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status !== "paid").reduce((sum, p) => sum + p.amount, 0);

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meus Contratos de Mídia TV</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">{fmt(totalPending)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pacote</TableHead>
                <TableHead>Mês Ref.</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => {
                const st = PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.ad_contracts?.ad_packages?.name || "—"}</TableCell>
                    <TableCell>{p.month_ref}</TableCell>
                    <TableCell>{fmt(p.amount)}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.ad_packages?.name || "—"}</TableCell>
                      <TableCell>{fmt(c.ad_packages?.monthly_value || 0)}/mês</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell>{c.ad_packages?.duration_months} {c.ad_packages?.duration_months === 1 ? "mês" : "meses"}</TableCell>
                      <TableCell className="text-xs">{c.start_date || "—"}</TableCell>
                      <TableCell className="text-xs">{c.end_date || "—"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openHistory(c.id)} title="Histórico"><History className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Você não possui contratos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => {
                  const st = PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.ad_contracts?.ad_packages?.name || "—"}</TableCell>
                      <TableCell>{p.month_ref}</TableCell>
                      <TableCell>{fmt(p.amount)}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map(pkg => {
              const hasActive = contracts.some(c => c.package_id === pkg.id && c.status === "active");
              const hasPending = contracts.some(c => c.package_id === pkg.id && c.status === "pending");
              return (
                <Card key={pkg.id} className="relative flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    {pkg.description && <p className="text-sm text-muted-foreground">{pkg.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col">
                    <p className="text-3xl font-bold text-primary">{fmt(pkg.monthly_value)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📅 Duração: {pkg.duration_months} {pkg.duration_months === 1 ? "mês" : "meses"}</p>
                      <p>📺 Frequência: {pkg.display_frequency}</p>
                    </div>
                    <div className="mt-auto pt-3">
                      {hasActive ? (
                        <Badge variant="default">Contratado ✓</Badge>
                      ) : hasPending ? (
                        <Badge variant="outline">Solicitação Pendente</Badge>
                      ) : (
                        <Button className="w-full" onClick={() => { setRequestPkg(pkg); setRequestNotes(""); setRequestDialog(true); }}>
                          <Send className="h-4 w-4 mr-1" /> Solicitar Contratação
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {packages.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">Nenhum pacote disponível</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Request Dialog */}
      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Contratação</DialogTitle>
          </DialogHeader>
          {requestPkg && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-semibold">{requestPkg.name}</p>
                <p className="text-sm text-muted-foreground">{fmt(requestPkg.monthly_value)}/mês · {requestPkg.duration_months} {requestPkg.duration_months === 1 ? "mês" : "meses"}</p>
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} placeholder="Informações adicionais para o administrador..." maxLength={500} />
              </div>
              <Button className="w-full" onClick={handleRequest} disabled={requesting}>
                {requesting ? "Enviando..." : "Confirmar Solicitação"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico do Contrato</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : historyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum registro de histórico</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {historyData.map(h => {
                const oldSt = h.old_status ? (STATUS_MAP[h.old_status]?.label || h.old_status) : "—";
                const newSt = STATUS_MAP[h.new_status]?.label || h.new_status;
                return (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 text-sm">
                      <p>
                        {h.old_status ? (
                          <><span className="text-muted-foreground">{oldSt}</span> → <span className="font-medium">{newSt}</span></>
                        ) : (
                          <>Criado como <span className="font-medium">{newSt}</span></>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FornecedorContractsPage;
