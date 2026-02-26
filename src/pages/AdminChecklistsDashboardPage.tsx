import { useQuery } from "@tanstack/react-query";
import { fetchInstances, fetchTemplates } from "@/lib/checklistApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { ClipboardList, CheckCircle2, AlertTriangle, Clock, FileText, TrendingUp, BarChart3, Layers } from "lucide-react";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", em_andamento: "Em Andamento", concluido: "Concluído",
  aprovado: "Aprovado", reprovado: "Reprovado", arquivado: "Arquivado",
};

const statusColors: Record<string, string> = {
  rascunho: "hsl(var(--muted-foreground))",
  em_andamento: "hsl(var(--primary))",
  concluido: "hsl(200, 70%, 50%)",
  aprovado: "hsl(150, 60%, 45%)",
  reprovado: "hsl(0, 70%, 50%)",
  arquivado: "hsl(var(--muted-foreground))",
};

const priorityLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};

const priorityColors: Record<string, string> = {
  baixa: "hsl(200, 60%, 55%)",
  media: "hsl(40, 90%, 50%)",
  alta: "hsl(25, 90%, 55%)",
  urgente: "hsl(0, 70%, 50%)",
};

export default function AdminChecklistsDashboardPage() {
  const { data: instances = [] } = useQuery({
    queryKey: ["checklists_dashboard_instances"],
    queryFn: () => fetchInstances(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["checklists_dashboard_templates"],
    queryFn: fetchTemplates,
  });

  const { data: responseItems = [] } = useQuery({
    queryKey: ["checklists_dashboard_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_response_items")
        .select("id, status, is_blocking, is_required");
      if (error) throw error;
      return data || [];
    },
  });

  // KPIs
  const totalInstances = instances.length;
  const activeTemplates = templates.filter(t => t.is_active).length;

  const completed = instances.filter(i => ["concluido", "aprovado"].includes(i.status)).length;
  const completionRate = totalInstances > 0 ? Math.round((completed / totalInstances) * 100) : 0;

  const totalItems = responseItems.length;
  const okItems = responseItems.filter((i: any) => i.status === "ok").length;
  const problemItems = responseItems.filter((i: any) => i.status === "problema").length;
  const blockingItems = responseItems.filter((i: any) => i.is_blocking && i.status !== "ok").length;

  const avgProgress = totalInstances > 0
    ? Math.round(instances.reduce((s, i) => s + i.progress, 0) / totalInstances)
    : 0;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  instances.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    fill: statusColors[status] || "hsl(var(--primary))",
  }));

  // Priority distribution
  const priorityCounts: Record<string, number> = {};
  instances.forEach(i => { priorityCounts[i.priority] = (priorityCounts[i.priority] || 0) + 1; });
  const priorityData = Object.entries(priorityCounts).map(([prio, count]) => ({
    name: priorityLabels[prio] || prio,
    value: count,
    fill: priorityColors[prio] || "hsl(var(--primary))",
  }));

  // Top stores by checklist count
  const storeCounts: Record<string, number> = {};
  instances.forEach(i => {
    const store = i.store || "Sem loja";
    storeCounts[store] = (storeCounts[store] || 0) + 1;
  });
  const storeData = Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const chartConfig = { value: { label: "Quantidade" } };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Checklists</h1>
        <p className="text-muted-foreground text-sm">Métricas e visão geral do módulo de checklists</p>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={ClipboardList} label="Total de Instâncias" value={totalInstances} />
        <MetricCard icon={FileText} label="Templates Ativos" value={activeTemplates} sub={`${templates.length} total`} />
        <MetricCard icon={TrendingUp} label="Taxa de Conclusão" value={`${completionRate}%`} sub={`${completed}/${totalInstances}`} />
        <MetricCard icon={BarChart3} label="Progresso Médio" value={`${avgProgress}%`} />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={CheckCircle2} label="Itens OK" value={okItems} sub={`de ${totalItems} total`} />
        <MetricCard icon={AlertTriangle} label="Itens com Problema" value={problemItems} variant={problemItems > 0 ? "warning" : undefined} />
        <MetricCard icon={Clock} label="Itens Bloqueantes" value={blockingItems} variant={blockingItems > 0 ? "danger" : undefined} />
        <MetricCard icon={Layers} label="Em Andamento" value={instances.filter(i => i.status === "em_andamento").length} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
            <CardDescription>Instâncias por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={statusData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Nenhuma instância</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
            <CardDescription>Instâncias por nível de prioridade</CardDescription>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Store ranking */}
      {storeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklists por Loja</CardTitle>
            <CardDescription>Top lojas com mais checklists</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={storeData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const MetricCard = ({ icon: Icon, label, value, sub, variant }: {
  icon: any; label: string; value: string | number; sub?: string;
  variant?: "warning" | "danger";
}) => {
  const bgClass = variant === "warning" ? "bg-yellow-500/10" : variant === "danger" ? "bg-destructive/10" : "bg-primary/10";
  const iconClass = variant === "warning" ? "text-yellow-600" : variant === "danger" ? "text-destructive" : "text-primary";

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2.5 ${bgClass}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
