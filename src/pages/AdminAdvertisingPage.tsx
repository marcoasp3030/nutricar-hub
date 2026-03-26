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
import { Plus, Edit, Trash2, DollarSign, TrendingUp, FileText, Package, CheckCircle, Clock, XCircle, BarChart3, Filter, History, Users, Search, Copy, LayoutTemplate, Eye, Monitor, CalendarDays, Tv, Play, Grid3X3, Link2, ToggleLeft, ToggleRight, ShoppingBag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FornecedorSelector = ({ fornecedores, selected, onChange }: { fornecedores: string[]; selected: string[]; onChange: (v: string[]) => void }) => {
  const [search, setSearch] = useState("");
  const filtered = fornecedores.filter(f => f.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <Label className="flex items-center gap-1.5 mb-2"><Users className="h-4 w-4" /> Fornecedores Atribuídos</Label>
      <p className="text-xs text-muted-foreground mb-2">Selecione os fornecedores que terão acesso a este pacote. Se nenhum for selecionado, ficará disponível para todos.</p>
      {fornecedores.length > 5 && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Buscar fornecedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}
      <div className="max-h-44 overflow-y-auto border rounded-md p-2 space-y-0.5">
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{fornecedores.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum resultado"}</p>}
        {filtered.map(f => (
          <label key={f} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
            <Checkbox
              checked={selected.includes(f)}
              onCheckedChange={(checked) => onChange(checked ? [...selected, f] : selected.filter(x => x !== f))}
            />
            <span className="text-sm truncate">{f}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{selected.length} selecionado(s)</Badge>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onChange([])}>Limpar</Button>
        </div>
      )}
    </div>
  );
};

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

interface AdPackageTemplate {
  id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  duration_months: number;
  display_frequency: string;
  media_type: string | null;
  screen_position: string | null;
  display_schedule: string | null;
  content_format: string | null;
  tags: string[];
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
  const [packageFornecedores, setPackageFornecedores] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AdPackageTemplate[]>([]);

  // Template form
  const [tplDialog, setTplDialog] = useState(false);
  const [editingTpl, setEditingTpl] = useState<AdPackageTemplate | null>(null);
  const [tplForm, setTplForm] = useState({ name: "", description: "", monthly_value: "", duration_months: "1", display_frequency: "30s a cada 5 min", media_type: "video", screen_position: "tela_cheia", display_schedule: "integral", content_format: "16:9", tags: "", is_active: true });

  // Package form
  const [pkgDialog, setPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<AdPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: "", description: "", monthly_value: "", duration_months: "1", display_frequency: "30s a cada 5 min", playlist_id: "", is_active: true, media_type: "video", screen_position: "tela_cheia", display_schedule: "integral", content_format: "16:9", tags: "" });
  const [pkgSelectedFornecedores, setPkgSelectedFornecedores] = useState<string[]>([]);

  // Contract form
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<AdContract | null>(null);
  const [contractForm, setContractForm] = useState({ fornecedor: "", package_id: "", status: "pending", start_date: "", end_date: "", notes: "" });

  // Payment form
  const [payDialog, setPayDialog] = useState(false);
  const [editingPay, setEditingPay] = useState<AdPayment | null>(null);
  const [payForm, setPayForm] = useState({ contract_id: "", month_ref: "", amount: "", status: "pending", payment_method: "pix", notes: "", paid_at: "" });

  // Period filter
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Tag filter for packages
  const [filterTag, setFilterTag] = useState<string>("__all__");

  // History
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [pkgRes, contractRes, payRes, playlistRes, fornRes, pkgFornRes, tplRes] = await Promise.all([
      supabase.from("ad_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_contracts").select("*, ad_packages(*)").order("created_at", { ascending: false }),
      supabase.from("ad_payments").select("*, ad_contracts(*, ad_packages(*))").order("created_at", { ascending: false }),
      supabase.from("playlists").select("id, name").order("name"),
      supabase.from("user_fornecedores").select("fornecedor"),
      supabase.from("ad_package_fornecedores").select("*"),
      supabase.from("ad_package_templates").select("*").order("name"),
    ]);
    setPackages(pkgRes.data || []);
    setContracts(contractRes.data || []);
    setPayments(payRes.data || []);
    setPlaylists(playlistRes.data || []);
    const uniqueF = [...new Set((fornRes.data || []).map((f: any) => f.fornecedor))];
    setFornecedores(uniqueF);
    // Build package->fornecedores map
    const pfMap: Record<string, string[]> = {};
    (pkgFornRes.data || []).forEach((pf: any) => {
      if (!pfMap[pf.package_id]) pfMap[pf.package_id] = [];
      pfMap[pf.package_id].push(pf.fornecedor);
    });
    setPackageFornecedores(pfMap);
    setTemplates((tplRes.data || []) as AdPackageTemplate[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // === Package CRUD ===
  const openPkgCreate = () => {
    setEditingPkg(null);
    setPkgForm({ name: "", description: "", monthly_value: "", duration_months: "1", display_frequency: "30s a cada 5 min", playlist_id: "", is_active: true, media_type: "video", screen_position: "tela_cheia", display_schedule: "integral", content_format: "16:9", tags: "" });
    setPkgSelectedFornecedores([]);
    setPkgDialog(true);
  };
  const openPkgEdit = (pkg: AdPackage) => {
    setEditingPkg(pkg);
    setPkgForm({ name: pkg.name, description: pkg.description || "", monthly_value: String(pkg.monthly_value), duration_months: String(pkg.duration_months), display_frequency: pkg.display_frequency, playlist_id: pkg.playlist_id || "", is_active: pkg.is_active, media_type: (pkg as any).media_type || "video", screen_position: (pkg as any).screen_position || "tela_cheia", display_schedule: (pkg as any).display_schedule || "integral", content_format: (pkg as any).content_format || "16:9", tags: ((pkg as any).tags || []).join(", ") });
    setPkgSelectedFornecedores(packageFornecedores[pkg.id] || []);
    setPkgDialog(true);
  };
  const savePkg = async () => {
    const tagsArr = pkgForm.tags ? pkgForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const payload = { name: pkgForm.name, description: pkgForm.description || null, monthly_value: parseFloat(pkgForm.monthly_value) || 0, duration_months: parseInt(pkgForm.duration_months) || 1, display_frequency: pkgForm.display_frequency, playlist_id: pkgForm.playlist_id || null, is_active: pkgForm.is_active, media_type: pkgForm.media_type, screen_position: pkgForm.screen_position, display_schedule: pkgForm.display_schedule, content_format: pkgForm.content_format, tags: tagsArr };
    let pkgId = editingPkg?.id;
    if (editingPkg) {
      const { error } = await supabase.from("ad_packages").update(payload).eq("id", editingPkg.id);
      if (error) { toast.error("Erro ao atualizar pacote"); return; }
    } else {
      const { data, error } = await supabase.from("ad_packages").insert(payload).select("id").single();
      if (error || !data) { toast.error("Erro ao criar pacote"); return; }
      pkgId = data.id;
    }
    // Sync fornecedor assignments
    if (pkgId) {
      await supabase.from("ad_package_fornecedores").delete().eq("package_id", pkgId);
      if (pkgSelectedFornecedores.length > 0) {
        await supabase.from("ad_package_fornecedores").insert(
          pkgSelectedFornecedores.map(f => ({ package_id: pkgId!, fornecedor: f }))
        );
      }
    }
    toast.success(editingPkg ? "Pacote atualizado" : "Pacote criado");
    setPkgDialog(false);
    fetchAll();
  };
  const deletePkg = async (id: string) => {
    if (!confirm("Excluir este pacote?")) return;
    await supabase.from("ad_packages").delete().eq("id", id);
    toast.success("Pacote excluído");
    fetchAll();
  };

  // === Template CRUD ===
  const openTplCreate = () => {
    setEditingTpl(null);
    setTplForm({ name: "", description: "", monthly_value: "", duration_months: "1", display_frequency: "30s a cada 5 min", media_type: "video", screen_position: "tela_cheia", display_schedule: "integral", content_format: "16:9", tags: "", is_active: true });
    setTplDialog(true);
  };
  const openTplEdit = (tpl: AdPackageTemplate) => {
    setEditingTpl(tpl);
    setTplForm({ name: tpl.name, description: tpl.description || "", monthly_value: String(tpl.monthly_value), duration_months: String(tpl.duration_months), display_frequency: tpl.display_frequency, media_type: tpl.media_type || "video", screen_position: tpl.screen_position || "tela_cheia", display_schedule: tpl.display_schedule || "integral", content_format: tpl.content_format || "16:9", tags: (tpl.tags || []).join(", "), is_active: tpl.is_active });
    setTplDialog(true);
  };
  const saveTpl = async () => {
    if (!tplForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const tagsArr = tplForm.tags ? tplForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const payload = { name: tplForm.name, description: tplForm.description || null, monthly_value: parseFloat(tplForm.monthly_value) || 0, duration_months: parseInt(tplForm.duration_months) || 1, display_frequency: tplForm.display_frequency, media_type: tplForm.media_type, screen_position: tplForm.screen_position, display_schedule: tplForm.display_schedule, content_format: tplForm.content_format, tags: tagsArr, is_active: tplForm.is_active };
    if (editingTpl) {
      const { error } = await supabase.from("ad_package_templates").update(payload).eq("id", editingTpl.id);
      if (error) { toast.error("Erro ao atualizar template"); return; }
    } else {
      const { error } = await supabase.from("ad_package_templates").insert(payload);
      if (error) { toast.error("Erro ao criar template"); return; }
    }
    toast.success(editingTpl ? "Template atualizado" : "Template criado");
    setTplDialog(false);
    fetchAll();
  };
  const deleteTpl = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    await supabase.from("ad_package_templates").delete().eq("id", id);
    toast.success("Template excluído");
    fetchAll();
  };
  const createPkgFromTemplate = (tpl: AdPackageTemplate) => {
    setPkgForm({
      name: tpl.name,
      description: tpl.description || "",
      monthly_value: String(tpl.monthly_value),
      duration_months: String(tpl.duration_months),
      display_frequency: tpl.display_frequency,
      media_type: tpl.media_type || "video",
      screen_position: tpl.screen_position || "tela_cheia",
      display_schedule: tpl.display_schedule || "integral",
      content_format: tpl.content_format || "16:9",
      tags: (tpl.tags || []).join(", "),
      playlist_id: "",
      is_active: true,
    });
    setEditingPkg(null);
    setPkgSelectedFornecedores([]);
    setPkgDialog(true);
    toast.info("Pacote pré-preenchido a partir do template");
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
  const openPayCreate = () => {
    setEditingPay(null);
    setPayForm({ contract_id: "", month_ref: "", amount: "", status: "pending", payment_method: "pix", notes: "", paid_at: "" });
    setPayDialog(true);
  };
  const openPayEdit = (pay: AdPayment) => {
    setEditingPay(pay);
    setPayForm({
      contract_id: pay.contract_id,
      month_ref: pay.month_ref,
      amount: String(pay.amount),
      status: pay.status,
      payment_method: (pay as any).payment_method || "pix",
      notes: (pay as any).notes || "",
      paid_at: pay.paid_at ? pay.paid_at.slice(0, 10) : "",
    });
    setPayDialog(true);
  };
  const savePayment = async () => {
    const payload: any = {
      contract_id: payForm.contract_id,
      month_ref: payForm.month_ref,
      amount: parseFloat(payForm.amount) || 0,
      status: payForm.status,
      payment_method: payForm.payment_method,
      notes: payForm.notes || null,
      paid_at: payForm.status === "paid" ? (payForm.paid_at ? new Date(payForm.paid_at).toISOString() : new Date().toISOString()) : null,
    };
    if (editingPay) {
      const { error } = await supabase.from("ad_payments").update(payload).eq("id", editingPay.id);
      if (error) { toast.error("Erro ao atualizar pagamento"); return; }
      toast.success("Pagamento atualizado");
    } else {
      const { error } = await supabase.from("ad_payments").insert(payload);
      if (error) { toast.error("Erro ao registrar pagamento"); return; }
      toast.success("Pagamento registrado");
    }
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
        <h1 className="text-2xl font-bold text-foreground">Publicidade</h1>
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
          <TabsTrigger value="packages"><ShoppingBag className="h-4 w-4 mr-1" /> Produtos & Serviços</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="h-4 w-4 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="contracts"><FileText className="h-4 w-4 mr-1" /> Contratos</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> Pagamentos</TabsTrigger>
        </TabsList>

        {/* ===== PACOTES / PRODUTOS & SERVIÇOS ===== */}
        <TabsContent value="packages" className="space-y-4">
          {(() => {
            const allTags = [...new Set(packages.flatMap(p => (p as any).tags || []))].sort();
            const filtered = filterTag === "__all__" ? packages : packages.filter(p => ((p as any).tags || []).includes(filterTag));
            
            const MEDIA_LABELS: Record<string, string> = { video: "Vídeo", banner: "Banner", slide: "Slide", institucional: "Institucional" };
            const POSITION_LABELS: Record<string, string> = { tela_cheia: "Tela Cheia", rodape: "Rodapé", lateral: "Lateral", topo: "Topo" };
            const SCHEDULE_LABELS: Record<string, string> = { integral: "Integral", manha: "Manhã", tarde: "Tarde", noite: "Noite", horario_comercial: "Horário Comercial" };

            return (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {filtered.length} produto(s) cadastrado(s) • {filtered.filter(p => p.is_active).length} ativo(s)
                    </p>
                    {allTags.length > 0 && (
                      <>
                        <span className="text-border">|</span>
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={filterTag} onValueChange={setFilterTag}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Filtrar por tag" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas as tags</SelectItem>
                            {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  <Button onClick={openPkgCreate}><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map(pkg => {
                    const pkgContracts = contracts.filter(c => c.package_id === pkg.id);
                    const activeCount = pkgContracts.filter(c => c.status === "active").length;
                    const pkgPayments = payments.filter(p => p.ad_contracts?.package_id === pkg.id);
                    const totalRevenue = pkgPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
                    const pendingRevenue = pkgPayments.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
                    const assignedF = packageFornecedores[pkg.id] || [];
                    const mediaType = (pkg as any).media_type || "video";
                    const screenPos = (pkg as any).screen_position || "tela_cheia";
                    const schedule = (pkg as any).display_schedule || "integral";
                    const contentFmt = (pkg as any).content_format || "16:9";
                    const tags = (pkg as any).tags || [];

                    return (
                      <Card key={pkg.id} className={`relative overflow-hidden ${!pkg.is_active ? "opacity-60" : ""}`}>
                        {/* Status indicator stripe */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${pkg.is_active ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        
                        <CardHeader className="pb-3 pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{pkg.name}</CardTitle>
                              {pkg.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                              )}
                            </div>
                            <Badge variant={pkg.is_active ? "default" : "secondary"} className="shrink-0">
                              {pkg.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-0">
                          {/* Pricing */}
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary">{fmt(pkg.monthly_value)}</span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                            <span className="text-xs text-muted-foreground ml-1">• {pkg.duration_months} mês(es)</span>
                          </div>

                          {/* Specs grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Tv className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Mídia:</span>
                              <span className="font-medium">{MEDIA_LABELS[mediaType] || mediaType}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Posição:</span>
                              <span className="font-medium">{POSITION_LABELS[screenPos] || screenPos}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Horário:</span>
                              <span className="font-medium">{SCHEDULE_LABELS[schedule] || schedule}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Formato:</span>
                              <span className="font-medium">{contentFmt}</span>
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Frequência:</span>
                              <span className="font-medium">{pkg.display_frequency}</span>
                            </div>
                            {pkg.playlist_id && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Playlist:</span>
                                <span className="font-medium truncate">{playlists.find(p => p.id === pkg.playlist_id)?.name || "—"}</span>
                              </div>
                            )}
                          </div>

                          {/* Revenue metrics */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-muted/50 p-2 text-center">
                              <p className="text-lg font-bold">{activeCount}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">Contratos Ativos</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2 text-center">
                              <p className="text-sm font-bold text-primary">{fmt(totalRevenue)}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">Recebido</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2 text-center">
                              <p className="text-sm font-bold">{fmt(pendingRevenue)}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">Pendente</p>
                            </div>
                          </div>

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                            </div>
                          )}

                          {/* Fornecedores */}
                          <div className="text-xs">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">
                                Fornecedores: {assignedF.length === 0 ? "Todos" : `${assignedF.length} atribuído(s)`}
                              </span>
                            </div>
                            {assignedF.length > 0 && (
                              <div className="flex gap-1 flex-wrap max-h-16 overflow-y-auto">
                                {assignedF.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1 border-t border-border">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => openPkgEdit(pkg)}>
                              <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              // Duplicate package
                              setPkgForm({
                                name: `${pkg.name} (Cópia)`,
                                description: pkg.description || "",
                                monthly_value: String(pkg.monthly_value),
                                duration_months: String(pkg.duration_months),
                                display_frequency: pkg.display_frequency,
                                media_type: (pkg as any).media_type || "video",
                                screen_position: (pkg as any).screen_position || "tela_cheia",
                                display_schedule: (pkg as any).display_schedule || "integral",
                                content_format: (pkg as any).content_format || "16:9",
                                tags: ((pkg as any).tags || []).join(", "),
                                playlist_id: pkg.playlist_id || "",
                                is_active: true,
                              });
                              setEditingPkg(null);
                              setPkgSelectedFornecedores(assignedF);
                              setPkgDialog(true);
                            }}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deletePkg(pkg.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="col-span-full text-center py-16">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground font-medium">Nenhum produto cadastrado</p>
                      <p className="text-xs text-muted-foreground mt-1">Crie produtos e serviços para oferecer aos fornecedores</p>
                      <Button className="mt-4" onClick={openPkgCreate}><Plus className="h-4 w-4 mr-1" /> Criar Primeiro Produto</Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* ===== TEMPLATES ===== */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Templates pré-configurados para criar pacotes rapidamente.</p>
            <Button onClick={openTplCreate}><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => (
              <Card key={tpl.id} className={!tpl.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <Badge variant={tpl.is_active ? "default" : "secondary"}>{tpl.is_active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {tpl.description && <p className="text-xs text-muted-foreground">{tpl.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Valor:</span> {fmt(tpl.monthly_value)}/mês</div>
                    <div><span className="text-muted-foreground">Duração:</span> {tpl.duration_months} mês(es)</div>
                    <div><span className="text-muted-foreground">Mídia:</span> <span className="capitalize">{tpl.media_type || "—"}</span></div>
                    <div><span className="text-muted-foreground">Posição:</span> <span className="capitalize">{(tpl.screen_position || "—").replace("_", " ")}</span></div>
                    <div><span className="text-muted-foreground">Formato:</span> {tpl.content_format || "—"}</div>
                    <div><span className="text-muted-foreground">Horário:</span> <span className="capitalize">{(tpl.display_schedule || "—").replace("_", " ")}</span></div>
                  </div>
                  {tpl.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {tpl.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => createPkgFromTemplate(tpl)}>
                      <Copy className="h-3 w-3 mr-1" /> Usar Template
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openTplEdit(tpl)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteTpl(tpl.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-12">
                <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum template criado</p>
                <p className="text-xs text-muted-foreground mt-1">Crie templates para agilizar a criação de pacotes</p>
              </div>
            )}
          </div>
        </TabsContent>


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
            <Button onClick={openPayCreate}>
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
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Obs.</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(p => {
                  const st = PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending;
                  const METHOD_LABELS: Record<string, string> = { pix: "PIX", transferencia: "Transferência", boleto: "Boleto", dinheiro: "Dinheiro", outro: "Outro" };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.ad_contracts?.fornecedor || "—"}</TableCell>
                      <TableCell>{p.ad_contracts?.ad_packages?.name || "—"}</TableCell>
                      <TableCell>{p.month_ref}</TableCell>
                      <TableCell>{fmt(p.amount)}</TableCell>
                      <TableCell className="text-xs">{METHOD_LABELS[(p as any).payment_method] || (p as any).payment_method || "—"}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate" title={(p as any).notes || ""}>{(p as any).notes || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => togglePayStatus(p)} title={p.status === "paid" ? "Marcar pendente" : "Marcar pago"}>
                            {p.status === "paid" ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openPayEdit(p)} title="Editar"><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deletePayment(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === Package Dialog === */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{editingPkg ? "Editar Pacote" : "Novo Pacote"}</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <div><Label>Nome</Label><Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Mensal (R$)</Label><Input type="number" step="0.01" value={pkgForm.monthly_value} onChange={e => setPkgForm(f => ({ ...f, monthly_value: e.target.value }))} /></div>
              <div><Label>Duração (meses)</Label><Input type="number" value={pkgForm.duration_months} onChange={e => setPkgForm(f => ({ ...f, duration_months: e.target.value }))} /></div>
            </div>
            <div><Label>Frequência de Exibição</Label><Input value={pkgForm.display_frequency} onChange={e => setPkgForm(f => ({ ...f, display_frequency: e.target.value }))} placeholder="Ex: 30s a cada 5 min" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Mídia</Label>
                <Select value={pkgForm.media_type} onValueChange={v => setPkgForm(f => ({ ...f, media_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="institucional">Institucional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posição na Tela</Label>
                <Select value={pkgForm.screen_position} onValueChange={v => setPkgForm(f => ({ ...f, screen_position: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tela_cheia">Tela Cheia</SelectItem>
                    <SelectItem value="rodape">Rodapé</SelectItem>
                    <SelectItem value="lateral">Lateral</SelectItem>
                    <SelectItem value="topo">Topo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horário de Exibição</Label>
                <Select value={pkgForm.display_schedule} onValueChange={v => setPkgForm(f => ({ ...f, display_schedule: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="integral">Integral</SelectItem>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                    <SelectItem value="horario_comercial">Horário Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Formato do Conteúdo</Label>
                <Select value={pkgForm.content_format} onValueChange={v => setPkgForm(f => ({ ...f, content_format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Paisagem)</SelectItem>
                    <SelectItem value="9:16">9:16 (Retrato)</SelectItem>
                    <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div><Label>Tags</Label><Input value={pkgForm.tags} onChange={e => setPkgForm(f => ({ ...f, tags: e.target.value }))} placeholder="Ex: destaque, premium, promo (separadas por vírgula)" /></div>
            <FornecedorSelector
              fornecedores={fornecedores}
              selected={pkgSelectedFornecedores}
              onChange={setPkgSelectedFornecedores}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={pkgForm.is_active} onChange={e => setPkgForm(f => ({ ...f, is_active: e.target.checked }))} id="pkg-active" />
              <Label htmlFor="pkg-active">Ativo</Label>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={savePkg}>{editingPkg ? "Salvar" : "Criar"}</Button>
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

      {/* === Template Dialog === */}
      <Dialog open={tplDialog} onOpenChange={setTplDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{editingTpl ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <div><Label>Nome</Label><Input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Premium Tela Cheia" /></div>
            <div><Label>Descrição</Label><Textarea value={tplForm.description} onChange={e => setTplForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Mensal (R$)</Label><Input type="number" step="0.01" value={tplForm.monthly_value} onChange={e => setTplForm(f => ({ ...f, monthly_value: e.target.value }))} /></div>
              <div><Label>Duração (meses)</Label><Input type="number" value={tplForm.duration_months} onChange={e => setTplForm(f => ({ ...f, duration_months: e.target.value }))} /></div>
            </div>
            <div><Label>Frequência de Exibição</Label><Input value={tplForm.display_frequency} onChange={e => setTplForm(f => ({ ...f, display_frequency: e.target.value }))} placeholder="Ex: 30s a cada 5 min" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Mídia</Label>
                <Select value={tplForm.media_type} onValueChange={v => setTplForm(f => ({ ...f, media_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="institucional">Institucional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posição na Tela</Label>
                <Select value={tplForm.screen_position} onValueChange={v => setTplForm(f => ({ ...f, screen_position: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tela_cheia">Tela Cheia</SelectItem>
                    <SelectItem value="rodape">Rodapé</SelectItem>
                    <SelectItem value="lateral">Lateral</SelectItem>
                    <SelectItem value="topo">Topo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horário de Exibição</Label>
                <Select value={tplForm.display_schedule} onValueChange={v => setTplForm(f => ({ ...f, display_schedule: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="integral">Integral</SelectItem>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                    <SelectItem value="horario_comercial">Horário Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Formato do Conteúdo</Label>
                <Select value={tplForm.content_format} onValueChange={v => setTplForm(f => ({ ...f, content_format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Paisagem)</SelectItem>
                    <SelectItem value="9:16">9:16 (Retrato)</SelectItem>
                    <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Tags</Label><Input value={tplForm.tags} onChange={e => setTplForm(f => ({ ...f, tags: e.target.value }))} placeholder="Ex: premium, destaque (separadas por vírgula)" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={tplForm.is_active} onChange={e => setTplForm(f => ({ ...f, is_active: e.target.checked }))} id="tpl-active" />
              <Label htmlFor="tpl-active">Ativo</Label>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={saveTpl}>{editingTpl ? "Salvar" : "Criar"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdvertisingPage;
