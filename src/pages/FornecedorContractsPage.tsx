import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, Clock, Package, Tv, Monitor, Play, Grid3X3, CalendarDays, FileText, TrendingUp, XCircle } from "lucide-react";
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

const MEDIA_LABELS: Record<string, string> = { video: "Vídeo", banner: "Banner", slide: "Slide", institucional: "Institucional" };
const POSITION_LABELS: Record<string, string> = { tela_cheia: "Tela Cheia", rodape: "Rodapé", lateral: "Lateral", topo: "Topo" };
const SCHEDULE_LABELS: Record<string, string> = { integral: "Integral", manha: "Manhã", tarde: "Tarde", noite: "Noite", horario_comercial: "Horário Comercial" };

const FornecedorContractsPage = ({ fornecedor }: Props) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, pRes] = await Promise.all([
      supabase.from("ad_contracts").select("*, ad_packages(*)").eq("fornecedor", fornecedor),
      supabase.from("ad_payments").select("*, ad_contracts(*, ad_packages(*))"),
    ]);
    const contractsList = cRes.data || [];
    setContracts(contractsList);
    const contractIds = contractsList.map((c: any) => c.id);
    setPayments((pRes.data || []).filter((p: any) => contractIds.includes(p.contract_id)));
    setLoading(false);
  };

  useEffect(() => {
    if (fornecedor) fetchData();
  }, [fornecedor]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status !== "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalMonthly = activeContracts.reduce((sum, c) => sum + (c.ad_packages?.monthly_value || 0), 0);

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Publicidade - Financeiro</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mensalidade Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalMonthly)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalPaid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalPending)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contracts" className="w-full">
        <TabsList>
          <TabsTrigger value="contracts"><Package className="h-4 w-4 mr-1" /> Meus Pacotes</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> Pagamentos</TabsTrigger>
        </TabsList>

        {/* ===== MEUS PACOTES (CONTRATOS) ===== */}
        <TabsContent value="contracts" className="space-y-4">
          {contracts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">Nenhum pacote contratado</p>
              <p className="text-xs text-muted-foreground mt-1">Quando um pacote for atribuído a você, ele aparecerá aqui.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {contracts.map(c => {
                const pkg = c.ad_packages;
                const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
                const contractPayments = payments.filter(p => p.contract_id === c.id);
                const paidAmount = contractPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
                const pendingAmount = contractPayments.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
                const paidCount = contractPayments.filter(p => p.status === "paid").length;
                const totalCount = contractPayments.length;

                return (
                  <Card key={c.id} className={`relative overflow-hidden ${c.status !== "active" ? "opacity-70" : ""}`}>
                    <div className={`absolute top-0 left-0 right-0 h-1 ${c.status === "active" ? "bg-primary" : c.status === "cancelled" ? "bg-destructive" : "bg-muted-foreground/30"}`} />
                    
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{pkg?.name || "Pacote Removido"}</CardTitle>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      {pkg?.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>}
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Price */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">{fmt(pkg?.monthly_value || 0)}</span>
                        <span className="text-sm text-muted-foreground">/mês</span>
                      </div>

                      {/* Package specs */}
                      {pkg && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Tv className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Mídia:</span>
                            <span className="font-medium">{MEDIA_LABELS[pkg.media_type] || pkg.media_type || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Posição:</span>
                            <span className="font-medium">{POSITION_LABELS[pkg.screen_position] || pkg.screen_position || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Horário:</span>
                            <span className="font-medium">{SCHEDULE_LABELS[pkg.display_schedule] || pkg.display_schedule || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Formato:</span>
                            <span className="font-medium">{pkg.content_format || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Frequência:</span>
                            <span className="font-medium">{pkg.display_frequency}</span>
                          </div>
                        </div>
                      )}

                      {/* Contract period */}
                      <div className="flex items-center gap-2 text-xs">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Vigência:</span>
                        <span className="font-medium">
                          {c.start_date ? format(new Date(c.start_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          {" → "}
                          {c.end_date ? format(new Date(c.end_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </span>
                      </div>

                      {/* Payment summary */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold text-primary">{fmt(paidAmount)}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Pago</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold">{fmt(pendingAmount)}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Pendente</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold">{paidCount}/{totalCount}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Parcelas Pagas</p>
                        </div>
                      </div>

                      {c.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <span className="font-medium">Obs:</span> {c.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== PAGAMENTOS ===== */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5" /> Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pacote</TableHead>
                    <TableHead>Mês Ref.</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(p => {
                    const st = PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending;
                    const METHOD_LABELS: Record<string, string> = { pix: "PIX", transferencia: "Transferência", boleto: "Boleto", dinheiro: "Dinheiro", outro: "Outro" };
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.ad_contracts?.ad_packages?.name || "—"}</TableCell>
                        <TableCell>{p.month_ref}</TableCell>
                        <TableCell>{fmt(p.amount)}</TableCell>
                        <TableCell className="text-xs">{METHOD_LABELS[p.payment_method] || p.payment_method || "—"}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={p.notes || ""}>{p.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {payments.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FornecedorContractsPage;
