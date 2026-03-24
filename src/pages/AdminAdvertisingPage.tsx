import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, FileText, Package, CheckCircle, Clock, XCircle, BarChart3, Filter, History } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdPackage {
  id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  duration_months: number;
  display_frequency: string;
  playlist_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface AdContract {
  id: string;
  fornecedor: string;
  package_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  ad_packages?: AdPackage;
}

interface AdPayment {
  id: string;
  contract_id: string;
  month_ref: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  ad_contracts?: AdContract;
}

interface Playlist {
  id: string;
  name: string;
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

const AdminAdvertisingPage = () => {
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [contracts, setContracts] = useState<AdContract[]>([]);
  const [payments, setPayments] = useState<AdPayment[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Package form
  const [pkgDialog, setPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<AdPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: "", description: "", monthly_value: "", duration_months: "1", display_frequency: "30s a cada 5 min", playlist_id: "", is_active: true, media_type: "video", screen_position: "tela_cheia", display_schedule: "integral", content_format: "16:9", tags: "" });

  // Contract form
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<AdContract | null>(null);
  const [contractForm, setContractForm] = useState({ fornecedor: "", package_id: "", status: "pending", start_date: "", end_date: "", notes: "" });

  // Payment form
  const [payDialog, setPayDialog] = useState(false);
  const [payForm, setPayForm] = useState({ contract_id: "", month_ref: "", amount: "", status: "pending" });

  // Period filter
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // History
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [pkgRes, contractRes, payRes, playlistRes, fornRes] = await Promise.all([
      supabase.from("ad_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_contracts").select("*, ad_packages(*)").order("created_at", { ascending: false }),
      supabase.from("ad_payments").select("*, ad_contracts(*, ad_packages(*))").order("created_at", { ascending: false }),
      supabase.from("playlists").select("id, name").order("name"),
      supabase.from("user_fornecedores").select("fornecedor"),
    ]);
    setPackages(pkgRes.data || []);
    setContracts(contractRes.data || []);
    setPayments(payRes.data || []);
    setPlaylists(playlistRes.data || []);
    const uniqueF = [...new Set((fornRes.data || []).map((f: any) => f.fornecedor))];
    setFornecedores(uniqueF);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // === Package CRUD ===
  const openPkgCreate = () => {
    setEditingPkg(null);
    setPkgForm({ name: "", description: "", monthly_value: "", duration_months: "1", display_frequency: "30s a cada 5 min", playlist_id: "", is_active: true, media_type: "video", screen_position: "tela_cheia", display_schedule: "integral", content_format: "16:9", tags: "" });
    setPkgDialog(true);
  };
  const openPkgEdit = (pkg: AdPackage) => {
    setEditingPkg(pkg);
    setPkgForm({ name: pkg.name, description: pkg.description || "", monthly_value: String(pkg.monthly_value), duration_months: String(pkg.duration_months), display_frequency: pkg.display_frequency, playlist_id: pkg.playlist_id || "", is_active: pkg.is_active, media_type: (pkg as any).media_type || "video", screen_position: (pkg as any).screen_position || "tela_cheia", display_schedule: (pkg as any).display_schedule || "integral", content_format: (pkg as any).content_format || "16:9", tags: ((pkg as any).tags || []).join(", ") });
    setPkgDialog(true);
  };
  const savePkg = async () => {
    const tagsArr = pkgForm.tags ? pkgForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const payload = { name: pkgForm.name, description: pkgForm.description || null, monthly_value: parseFloat(pkgForm.monthly_value) || 0, duration_months: parseInt(pkgForm.duration_months) || 1, display_frequency: pkgForm.display_frequency, playlist_id: pkgForm.playlist_id || null, is_active: pkgForm.is_active, media_type: pkgForm.media_type, screen_position: pkgForm.screen_position, display_schedule: pkgForm.display_schedule, content_format: pkgForm.content_format, tags: tagsArr };
    if (editingPkg) {
      const { error } = await supabase.from("ad_packages").update(payload).eq("id", editingPkg.id);
      if (error) { toast.error("Erro ao atualizar pacote"); return; }
      toast.success("Pacote atualizado");
    } else {
      const { error } = await supabase.from("ad_packages").insert(payload);
      if (error) { toast.error("Erro ao criar pacote"); return; }
      toast.success("Pacote criado");
    }
    setPkgDialog(false);
    fetchAll();
  };
  const deletePkg = async (id: string) => {
    if (!confirm("Excluir este pacote?")) return;
    await supabase.from("ad_packages").delete().eq("id", id);
    toast.success("Pacote excluído");
    fetchAll();
  };

  // === Contract CRUD ===
  const openContractCreate = () => {
    setEditingContract(null);
    setContractForm({ fornecedor: "", package_id: "", status: "pending", start_date: "", end_date: "", notes: "" });
    setContractDialog(true);
  };
  const openContractEdit = (c: AdContract) => {
    setEditingContract(c);
    setContractForm({ fornecedor: c.fornecedor, package_id: c.package_id, status: c.status, start_date: c.start_date || "", end_date: c.end_date || "", notes: c.notes || "" });
    setContractDialog(true);
  };
  const saveContract = async () => {
    const payload = { fornecedor: contractForm.fornecedor, package_id: contractForm.package_id, status: contractForm.status, start_date: contractForm.start_date || null, end_date: contractForm.end_date || null, notes: contractForm.notes || null };
    if (editingContract) {
      const { error } = await supabase.from("ad_contracts").update(payload).eq("id", editingContract.id);
      if (error) { toast.error("Erro ao atualizar contrato"); return; }
      toast.success("Contrato atualizado");
    } else {
      const { error } = await supabase.from("ad_contracts").insert(payload);
      if (error) { toast.error("Erro ao criar contrato"); return; }
      toast.success("Contrato criado");
    }
    setContractDialog(false);
    fetchAll();
  };
  const deleteContract = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    await supabase.from("ad_contracts").delete().eq("id", id);
    toast.success("Contrato excluído");
    fetchAll();
  };

  const openHistory = async (contractId: string) => {
    setHistoryContractId(contractId);
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

  // === Payment CRUD ===
  const savePayment = async () => {
    const payload = { contract_id: payForm.contract_id, month_ref: payForm.month_ref, amount: parseFloat(payForm.amount) || 0, status: payForm.status, paid_at: payForm.status === "paid" ? new Date().toISOString() : null };
    const { error } = await supabase.from("ad_payments").insert(payload);
    if (error) { toast.error("Erro ao registrar pagamento"); return; }
    toast.success("Pagamento registrado");
    setPayDialog(false);
    fetchAll();
  };
  const togglePayStatus = async (pay: AdPayment) => {
    const newStatus = pay.status === "paid" ? "pending" : "paid";
    await supabase.from("ad_payments").update({ status: newStatus, paid_at: newStatus === "paid" ? new Date().toISOString() : null }).eq("id", pay.id);
    toast.success(`Pagamento marcado como ${newStatus === "paid" ? "pago" : "pendente"}`);
    fetchAll();
  };
  const deletePayment = async (id: string) => {
    if (!confirm("Excluir este pagamento?")) return;
    await supabase.from("ad_payments").delete().eq("id", id);
    toast.success("Pagamento excluído");
    fetchAll();
  };

  // === Filtered payments ===
  const filteredPayments = payments.filter(p => {
    if (filterFrom && p.month_ref < filterFrom) return false;
    if (filterTo && p.month_ref > filterTo) return false;
    return true;
  });

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalMonthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.ad_packages?.monthly_value || 0), 0);
  const totalPaid = filteredPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filteredPayments.filter(p => p.status !== "paid").reduce((sum, p) => sum + p.amount, 0);

  // === Chart data ===
  const revenueByMonth: Record<string, { paid: number; pending: number }> = {};
  filteredPayments.forEach(p => {
    if (!revenueByMonth[p.month_ref]) revenueByMonth[p.month_ref] = { paid: 0, pending: 0 };
    if (p.status === "paid") revenueByMonth[p.month_ref].paid += p.amount;
    else revenueByMonth[p.month_ref].pending += p.amount;
  });
  const chartData = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, paid: vals.paid, pending: vals.pending }));

  // === Available months for filter ===
  const allMonths = [...new Set(payments.map(p => p.month_ref))].sort();

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Publicidade TV</h1>
        {allMonths.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterFrom || "all"} onValueChange={v => setFilterFrom(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="De" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Início</SelectItem>
                {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">até</span>
            <Select value={filterTo || "all"} onValueChange={v => setFilterTo(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Até" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Fim</SelectItem>
                {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterFrom || filterTo) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFrom(""); setFilterTo(""); }}>Limpar</Button>
            )}
          </div>
        )}
      </div>

      {/* Dashboard Cards */}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalMonthlyRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
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

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Receita Mensal por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} className="text-xs fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="paid" name="Recebido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pendente" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="packages" className="w-full">
        <TabsList>
          <TabsTrigger value="packages"><Package className="h-4 w-4 mr-1" /> Pacotes</TabsTrigger>
          <TabsTrigger value="contracts"><FileText className="h-4 w-4 mr-1" /> Contratos</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> Pagamentos</TabsTrigger>
        </TabsList>

        {/* ===== PACOTES ===== */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openPkgCreate}><Plus className="h-4 w-4 mr-1" /> Novo Pacote</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Tipo Mídia</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map(pkg => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{fmt(pkg.monthly_value)}</TableCell>
                    <TableCell>{pkg.duration_months} {pkg.duration_months === 1 ? "mês" : "meses"}</TableCell>
                    <TableCell className="text-xs">{pkg.display_frequency}</TableCell>
                    <TableCell className="text-xs">{playlists.find(p => p.id === pkg.playlist_id)?.name || "—"}</TableCell>
                    <TableCell><Badge variant={pkg.is_active ? "default" : "secondary"}>{pkg.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openPkgEdit(pkg)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deletePkg(pkg.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {packages.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum pacote cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== CONTRATOS ===== */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openContractCreate}><Plus className="h-4 w-4 mr-1" /> Novo Contrato</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.fornecedor}</TableCell>
                      <TableCell>{c.ad_packages?.name || "—"}</TableCell>
                      <TableCell>{fmt(c.ad_packages?.monthly_value || 0)}/mês</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-xs">{c.start_date || "—"}</TableCell>
                      <TableCell className="text-xs">{c.end_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openHistory(c.id)} title="Histórico"><History className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openContractEdit(c)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteContract(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum contrato cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== PAGAMENTOS ===== */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setPayForm({ contract_id: "", month_ref: "", amount: "", status: "pending" }); setPayDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Registrar Pagamento
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(p => {
                  const st = PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.ad_contracts?.fornecedor || "—"}</TableCell>
                      <TableCell>{p.ad_contracts?.ad_packages?.name || "—"}</TableCell>
                      <TableCell>{p.month_ref}</TableCell>
                      <TableCell>{fmt(p.amount)}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => togglePayStatus(p)} title={p.status === "paid" ? "Marcar pendente" : "Marcar pago"}>
                            {p.status === "paid" ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deletePayment(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === Package Dialog === */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingPkg ? "Editar Pacote" : "Novo Pacote"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Mensal (R$)</Label><Input type="number" step="0.01" value={pkgForm.monthly_value} onChange={e => setPkgForm(f => ({ ...f, monthly_value: e.target.value }))} /></div>
              <div><Label>Duração (meses)</Label><Input type="number" value={pkgForm.duration_months} onChange={e => setPkgForm(f => ({ ...f, duration_months: e.target.value }))} /></div>
            </div>
            <div><Label>Frequência de Exibição</Label><Input value={pkgForm.display_frequency} onChange={e => setPkgForm(f => ({ ...f, display_frequency: e.target.value }))} placeholder="Ex: 30s a cada 5 min" /></div>
            <div>
              <Label>Playlist Vinculada</Label>
              <Select value={pkgForm.playlist_id || "none"} onValueChange={v => setPkgForm(f => ({ ...f, playlist_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar playlist" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={pkgForm.is_active} onChange={e => setPkgForm(f => ({ ...f, is_active: e.target.checked }))} id="pkg-active" />
              <Label htmlFor="pkg-active">Ativo</Label>
            </div>
            <Button className="w-full" onClick={savePkg}>{editingPkg ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Contract Dialog === */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fornecedor</Label>
              <Select value={contractForm.fornecedor} onValueChange={v => setContractForm(f => ({ ...f, fornecedor: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pacote</Label>
              <Select value={contractForm.package_id} onValueChange={v => setContractForm(f => ({ ...f, package_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar pacote" /></SelectTrigger>
                <SelectContent>
                  {packages.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {fmt(p.monthly_value)}/mês</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={contractForm.status} onValueChange={v => setContractForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Fim</Label><Input type="date" value={contractForm.end_date} onChange={e => setContractForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button className="w-full" onClick={saveContract}>{editingContract ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Payment Dialog === */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Contrato</Label>
              <Select value={payForm.contract_id} onValueChange={v => {
                const c = contracts.find(c => c.id === v);
                setPayForm(f => ({ ...f, contract_id: v, amount: String(c?.ad_packages?.monthly_value || "") }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
                <SelectContent>
                  {contracts.filter(c => c.status === "active").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.fornecedor} — {c.ad_packages?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mês Referência</Label><Input value={payForm.month_ref} onChange={e => setPayForm(f => ({ ...f, month_ref: e.target.value }))} placeholder="Ex: 02/2026" /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={payForm.status} onValueChange={v => setPayForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAY_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={savePayment}>Registrar</Button>
          </div>
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
                      {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
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

export default AdminAdvertisingPage;
