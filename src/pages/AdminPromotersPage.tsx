import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPromoterProfiles, updatePromoterStatus, PromoterProfile } from "@/lib/jobsApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Check, X, Briefcase, Calendar, Search, Trophy, DollarSign, Download, FileSpreadsheet, FileText, Crown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { format as dateFmt } from "date-fns";
import { exportToXLSX, exportToPDF, ExportColumn } from "@/lib/exportUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  bloqueado: "bg-red-100 text-red-800",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const RatingStars = ({ value, size = "h-3 w-3" }: { value: number; size?: string }) => (
  <div className="flex">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`${size} ${i < value ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const AdminPromotersPage = () => {
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState("cadastro");
  const [statusTab, setStatusTab] = useState("pendente");
  const [selected, setSelected] = useState<PromoterProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterState, setFilterState] = useState("all");

  // Fetch ALL promoters (for ranking/financial/filters)
  const { data: allPromoters = [] } = useQuery({
    queryKey: ["promoter_profiles", "all"],
    queryFn: () => fetchPromoterProfiles(),
  });

  // Fetch by status tab
  const { data: promoters = [], isLoading } = useQuery({
    queryKey: ["promoter_profiles", statusTab],
    queryFn: () => fetchPromoterProfiles({ status: statusTab }),
  });

  // Fetch all assignments with job + payment info
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["all_job_assignments_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*, job:event_jobs(title, start_date, cache_value), promoter:promoter_profiles(stage_name, city, state)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all payments
  const { data: allPayments = [] } = useQuery({
    queryKey: ["all_job_payments_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_payments")
        .select("*, assignment:job_assignments(promoter_id, promoter:promoter_profiles(stage_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch assignments for selected promoter
  const { data: promoterAssignments = [] } = useQuery({
    queryKey: ["promoter_assignments", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase
        .from("job_assignments")
        .select("*, job:event_jobs(title, start_date, cache_value)")
        .eq("promoter_id", selected.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selected,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PromoterProfile['status'] }) => updatePromoterStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promoter_profiles"] });
      toast({ title: "Status atualizado!" });
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const leaderMutation = useMutation({
    mutationFn: async ({ id, is_leader }: { id: string; is_leader: boolean }) => {
      const { error } = await supabase.from("promoter_profiles").update({ is_leader } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["promoter_profiles"] });
      setSelected(prev => prev ? { ...prev, is_leader: vars.is_leader } : prev);
      toast({ title: vars.is_leader ? "Promotora marcada como líder" : "Líder removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Derived: unique cities/states for filters
  const uniqueCities = [...new Set(allPromoters.map(p => p.city).filter(Boolean))].sort();
  const uniqueStates = [...new Set(allPromoters.map(p => p.state).filter(Boolean))].sort();

  // Filter promoters
  const filteredPromoters = promoters.filter(p => {
    const matchesSearch = !searchTerm || 
      (p.stage_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.city || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = filterCity === "all" || p.city === filterCity;
    const matchesState = filterState === "all" || p.state === filterState;
    return matchesSearch && matchesCity && matchesState;
  });

  // Ranking data
  const rankedPromoters = [...allPromoters]
    .filter(p => p.status === "aprovado")
    .sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating) || b.total_jobs - a.total_jobs);

  const rankingChartData = rankedPromoters.slice(0, 10).map(p => ({
    name: (p.stage_name || "Sem nome").substring(0, 12),
    nota: Number(Number(p.avg_rating).toFixed(1)),
    jobs: p.total_jobs,
  }));

  // Financial data: combine job_payments with active assignments (cache_value as predicted pending)
  const paymentsByPromoter = allPayments.reduce((acc: Record<string, { name: string; pago: number; pendente: number }>, p: any) => {
    const promoterId = p.assignment?.promoter_id;
    const name = p.assignment?.promoter?.stage_name || "Desconhecida";
    if (!promoterId) return acc;
    if (!acc[promoterId]) acc[promoterId] = { name, pago: 0, pendente: 0 };
    if (p.status === "pago") acc[promoterId].pago += Number(p.amount);
    else acc[promoterId].pendente += Number(p.amount);
    return acc;
  }, {});

  // Add predicted pending from assignments without payment record
  const assignmentsWithPayment = new Set(
    allPayments.map((p: any) => p.assignment_id).filter(Boolean)
  );
  allAssignments.forEach((a: any) => {
    if (a.status === "cancelado") return;
    if (assignmentsWithPayment.has(a.id)) return;
    const promoterId = a.promoter_id;
    const name = a.promoter?.stage_name || "Desconhecida";
    const cache = Number(a.job?.cache_value || 0);
    if (!promoterId || cache <= 0) return;
    if (!paymentsByPromoter[promoterId]) paymentsByPromoter[promoterId] = { name, pago: 0, pendente: 0 };
    paymentsByPromoter[promoterId].pendente += cache;
  });

  const financialData = Object.values(paymentsByPromoter);
  const totalPago = financialData.reduce((s, f) => s + f.pago, 0);
  const totalPendente = financialData.reduce((s, f) => s + f.pendente, 0);

  const paymentStatusData = [
    { name: "Pago", value: allPayments.filter((p: any) => p.status === "pago").length },
    { name: "Pendente", value: allPayments.filter((p: any) => p.status === "pendente").length },
    { name: "Aprovado", value: allPayments.filter((p: any) => p.status === "aprovado").length },
    { name: "Contestado", value: allPayments.filter((p: any) => p.status === "contestado").length },
  ].filter(d => d.value > 0);

  // Export functions
  const exportPromoterRanking = (format: "xlsx" | "pdf") => {
    const columns: ExportColumn[] = [
      { key: "pos", label: "#" },
      { key: "stage_name", label: "Nome Artístico" },
      { key: "city", label: "Cidade" },
      { key: "state", label: "UF" },
      { key: "avg_rating", label: "Nota Média", format: "number" },
      { key: "total_jobs", label: "Total Eventos", format: "number" },
      { key: "status", label: "Status" },
    ];
    const data = rankedPromoters.map((p, i) => ({
      pos: i + 1,
      stage_name: p.stage_name || "Sem nome",
      city: p.city || "—",
      state: p.state || "—",
      avg_rating: Number(p.avg_rating).toFixed(1),
      total_jobs: p.total_jobs,
      status: p.status,
    }));
    if (format === "xlsx") exportToXLSX(data, columns, "ranking_promotoras");
    else exportToPDF(data, columns, "ranking_promotoras", "Ranking de Promotoras");
  };

  const exportFinancial = (format: "xlsx" | "pdf") => {
    const columns: ExportColumn[] = [
      { key: "name", label: "Promotora" },
      { key: "pago", label: "Pago (R$)", format: "currency" },
      { key: "pendente", label: "Pendente (R$)", format: "currency" },
      { key: "total", label: "Total (R$)", format: "currency" },
    ];
    const data = financialData.map(f => ({ ...f, total: f.pago + f.pendente }));
    if (format === "xlsx") exportToXLSX(data, columns, "financeiro_promotoras");
    else exportToPDF(data, columns, "financeiro_promotoras", "Financeiro - Promotoras");
  };

  const exportHistory = (format: "xlsx" | "pdf") => {
    const columns: ExportColumn[] = [
      { key: "promotora", label: "Promotora" },
      { key: "evento", label: "Evento" },
      { key: "data", label: "Data" },
      { key: "valor", label: "Cachê (R$)", format: "currency" },
      { key: "status", label: "Status" },
      { key: "nota_admin", label: "Nota Admin", format: "number" },
      { key: "nota_promotora", label: "Nota Promotora", format: "number" },
    ];
    const data = allAssignments.map((a: any) => ({
      promotora: a.promoter?.stage_name || "—",
      evento: a.job?.title || "—",
      data: a.job?.start_date ? dateFmt(new Date(a.job.start_date), "dd/MM/yyyy") : "—",
      valor: a.job?.cache_value || 0,
      status: a.status,
      nota_admin: a.admin_rating || "—",
      nota_promotora: a.promoter_rating || "—",
    }));
    if (format === "xlsx") exportToXLSX(data, columns, "historico_eventos");
    else exportToPDF(data, columns, "historico_eventos", "Histórico de Eventos & Avaliações");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Promotoras</h1>
        <p className="text-sm text-muted-foreground">Cadastro, ranking, financeiro e relatórios</p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-3.5 w-3.5 mr-1" />Ranking</TabsTrigger>
          <TabsTrigger value="financeiro"><DollarSign className="h-3.5 w-3.5 mr-1" />Financeiro</TabsTrigger>
          <TabsTrigger value="exportar"><Download className="h-3.5 w-3.5 mr-1" />Exportar</TabsTrigger>
        </TabsList>

        {/* ======== CADASTRO TAB ======== */}
        <TabsContent value="cadastro" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos UF</SelectItem>
                {uniqueStates.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {uniqueCities.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={statusTab} onValueChange={setStatusTab}>
            <TabsList>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="aprovado">Aprovadas</TabsTrigger>
              <TabsTrigger value="bloqueado">Bloqueadas</TabsTrigger>
            </TabsList>

            <TabsContent value={statusTab} className="mt-4">
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : filteredPromoters.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma promotora encontrada</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPromoters.map((p) => (
                    <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(p)}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {(p.stage_name || "P")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{p.stage_name || "Sem nome"}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {p.city || "—"}{p.state ? `, ${p.state}` : ""}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <RatingStars value={Math.round(Number(p.avg_rating))} />
                              <span className="text-xs text-muted-foreground">{Number(p.avg_rating).toFixed(1)}</span>
                              <span className="text-xs text-muted-foreground">• {p.total_jobs} eventos</span>
                            </div>
                          </div>
                          <Badge className={statusColors[p.status]}>{p.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ======== RANKING TAB ======== */}
        <TabsContent value="ranking" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Promotoras</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportPromoterRanking("xlsx")}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportPromoterRanking("pdf")}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          {rankingChartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Nota Média vs Jobs (Top 10)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis yAxisId="left" domain={[0, 5]} fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="nota" fill="hsl(var(--primary))" name="Nota Média" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="jobs" fill="hsl(var(--chart-2))" name="Total Eventos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {rankedPromoters.map((p, i) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelected(p)}>
                <CardContent className="py-3 flex items-center gap-4">
                  <span className={`text-lg font-bold w-8 text-center ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                  </span>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {(p.stage_name || "P")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{p.stage_name || "Sem nome"}</h4>
                    <p className="text-xs text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <RatingStars value={Math.round(Number(p.avg_rating))} />
                      <span className="text-sm font-semibold ml-1">{Number(p.avg_rating).toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.total_jobs} eventos</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rankedPromoters.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Nenhuma promotora aprovada</p>
            )}
          </div>
        </TabsContent>

        {/* ======== FINANCEIRO TAB ======== */}
        <TabsContent value="financeiro" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Resumo Financeiro</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportFinancial("xlsx")}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportFinancial("pdf")}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPago)}
                </p>
                <p className="text-xs text-muted-foreground">Total Pago</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPendente)}
                </p>
                <p className="text-xs text-muted-foreground">Total Pendente</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPago + totalPendente)}
                </p>
                <p className="text-xs text-muted-foreground">Total Geral</p>
              </CardContent>
            </Card>
          </div>

          {paymentStatusData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Status dos Pagamentos</CardTitle></CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {paymentStatusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Por Promotora</CardTitle></CardHeader>
            <CardContent>
              {financialData.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {financialData.sort((a, b) => (b.pago + b.pendente) - (a.pago + a.pendente)).map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted rounded-lg p-3">
                      <span className="font-medium text-sm">{f.name}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">Pago: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(f.pago)}</span>
                        <span className="text-yellow-600">Pendente: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(f.pendente)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== EXPORTAR TAB ======== */}
        <TabsContent value="exportar" className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Exportar Relatórios</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 space-y-3 text-center">
                <Trophy className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">Ranking de Promotoras</h3>
                <p className="text-xs text-muted-foreground">Nome, cidade, nota média, total de jobs</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => exportPromoterRanking("xlsx")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPromoterRanking("pdf")}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3 text-center">
                <DollarSign className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">Financeiro</h3>
                <p className="text-xs text-muted-foreground">Pago e pendente por promotora</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => exportFinancial("xlsx")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportFinancial("pdf")}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3 text-center">
                <Calendar className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">Histórico de Eventos</h3>
                <p className="text-xs text-muted-foreground">Eventos, avaliações e cachês</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => exportHistory("xlsx")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportHistory("pdf")}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======== PROMOTER DETAIL DIALOG ======== */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil da Promotora</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {(selected.stage_name || "P")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {selected.stage_name || "Sem nome"}
                    {selected.is_leader && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1"><Crown className="h-3 w-3" /> Líder</Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selected.city}{selected.state ? `, ${selected.state}` : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <RatingStars value={Math.round(Number(selected.avg_rating))} />
                    <span className="text-sm font-medium">{Number(selected.avg_rating).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {selected.bio && <p className="text-sm">{selected.bio}</p>}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{selected.total_jobs}</p>
                  <p className="text-xs text-muted-foreground">Eventos</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{Number(selected.avg_rating).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Nota Média</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{selected.service_radius_km || "—"}</p>
                  <p className="text-xs text-muted-foreground">Raio km</p>
                </div>
              </div>

              {selected.portfolio_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Portfólio</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.portfolio_urls.map((url, i) => (
                      <img key={i} src={url} className="rounded-lg aspect-square object-cover" alt="portfolio" />
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Briefcase className="h-4 w-4" /> Histórico de Eventos & Avaliações
                </h4>
                {promoterAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum evento registrado</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {promoterAssignments.map((a: any) => (
                      <div key={a.id} className="bg-muted rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{a.job?.title || "Evento"}</span>
                          <Badge variant="outline" className="text-xs">{a.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {a.job?.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {dateFmt(new Date(a.job.start_date), "dd/MM/yyyy")}
                            </span>
                          )}
                          {a.job?.cache_value && (
                            <span>R$ {Number(a.job.cache_value).toFixed(2)}</span>
                          )}
                        </div>
                        {a.admin_rating ? (
                          <div className="flex items-center gap-2 text-xs pt-1">
                            <span className="text-muted-foreground">Admin:</span>
                            <RatingStars value={a.admin_rating} />
                            {a.admin_comment && <span className="italic text-muted-foreground">"{a.admin_comment}"</span>}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 pt-1">Sem avaliação do admin</p>
                        )}
                        {a.promoter_rating && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Promotora:</span>
                            <RatingStars value={a.promoter_rating} />
                            {a.promoter_comment && <span className="italic text-muted-foreground">"{a.promoter_comment}"</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {selected.status !== "aprovado" && (
                  <Button className="flex-1" onClick={() => statusMutation.mutate({ id: selected.id, status: "aprovado" })}>
                    <Check className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                )}
                {selected.status !== "bloqueado" && (
                  <Button variant="destructive" className="flex-1" onClick={() => statusMutation.mutate({ id: selected.id, status: "bloqueado" })}>
                    <X className="h-4 w-4 mr-1" /> Bloquear
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPromotersPage;
