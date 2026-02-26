import { useQuery } from "@tanstack/react-query";
import { fetchEventJobs, fetchPromoterProfiles, fetchJobPayments } from "@/lib/jobsApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Briefcase, Users, ThumbsUp, Star, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";

const AdminJobsDashboardPage = () => {
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs_dashboard_jobs"],
    queryFn: () => fetchEventJobs(),
  });

  const { data: allPromoters = [] } = useQuery({
    queryKey: ["jobs_dashboard_promoters"],
    queryFn: () => fetchPromoterProfiles(),
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["jobs_dashboard_invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_invites")
        .select("id, response, type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["jobs_dashboard_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_assignments")
        .select("id, status, admin_rating, promoter_rating");
      if (error) throw error;
      return data || [];
    },
  });

  // ---- Metrics ----
  const totalJobs = jobs.length;
  const activePromoters = allPromoters.filter((p) => p.status === "aprovado").length;
  const pendingPromoters = allPromoters.filter((p) => p.status === "pendente").length;

  const totalInvites = invites.length;
  const acceptedInvites = invites.filter((i: any) => i.response === "aceito").length;
  const acceptRate = totalInvites > 0 ? Math.round((acceptedInvites / totalInvites) * 100) : 0;

  const ratings = assignments
    .map((a: any) => a.admin_rating)
    .filter((r: any) => r != null && r > 0);
  const avgRating = ratings.length > 0 ? (ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length).toFixed(1) : "—";

  const confirmedJobs = jobs.filter((j) => ["confirmado", "em_execucao", "concluido"].includes(j.status)).length;
  const completedJobs = jobs.filter((j) => j.status === "concluido").length;

  // ---- Status distribution chart ----
  const statusCounts: Record<string, number> = {};
  jobs.forEach((j) => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });

  const statusLabels: Record<string, string> = {
    rascunho: "Rascunho",
    publicado: "Publicado",
    em_negociacao: "Negociação",
    confirmado: "Confirmado",
    em_execucao: "Execução",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    rascunho: "hsl(var(--muted-foreground))",
    publicado: "hsl(var(--primary))",
    em_negociacao: "hsl(40, 90%, 50%)",
    confirmado: "hsl(150, 60%, 45%)",
    em_execucao: "hsl(200, 70%, 50%)",
    concluido: "hsl(140, 70%, 40%)",
    cancelado: "hsl(0, 70%, 50%)",
  };

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    fill: statusColors[status] || "hsl(var(--primary))",
  }));

  // ---- Invite response distribution ----
  const responseLabels: Record<string, string> = {
    pendente: "Pendente",
    aceito: "Aceito",
    recusado: "Recusado",
    expirado: "Expirado",
    cancelado: "Cancelado",
  };
  const responseCounts: Record<string, number> = {};
  invites.forEach((i: any) => {
    responseCounts[i.response] = (responseCounts[i.response] || 0) + 1;
  });
  const responseColors: Record<string, string> = {
    pendente: "hsl(40, 90%, 50%)",
    aceito: "hsl(150, 60%, 45%)",
    recusado: "hsl(0, 70%, 50%)",
    expirado: "hsl(var(--muted-foreground))",
    cancelado: "hsl(0, 40%, 60%)",
  };
  const responseData = Object.entries(responseCounts).map(([resp, count]) => ({
    name: responseLabels[resp] || resp,
    value: count,
    fill: responseColors[resp] || "hsl(var(--primary))",
  }));

  const chartConfig = {
    value: { label: "Quantidade" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Eventos</h1>
        <p className="text-muted-foreground text-sm">Visão geral do módulo de contratação de promotoras</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Briefcase} label="Total de Eventos" value={totalJobs} />
        <MetricCard icon={Users} label="Promotoras Ativas" value={activePromoters} sub={pendingPromoters > 0 ? `+${pendingPromoters} pendentes` : undefined} />
        <MetricCard icon={ThumbsUp} label="Taxa de Aceite" value={`${acceptRate}%`} sub={`${acceptedInvites}/${totalInvites} convites`} />
        <MetricCard icon={Star} label="Avaliação Média" value={avgRating} sub={`${ratings.length} avaliações`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={CheckCircle} label="Eventos Confirmados" value={confirmedJobs} />
        <MetricCard icon={TrendingUp} label="Eventos Concluídos" value={completedJobs} />
        <MetricCard icon={Clock} label="Em Negociação" value={statusCounts["em_negociacao"] || 0} />
        <MetricCard icon={DollarSign} label="Atribuições" value={assignments.length} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
            <CardDescription>Eventos por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={statusData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Nenhum evento cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Respostas de Convites</CardTitle>
            <CardDescription>Distribuição de respostas</CardDescription>
          </CardHeader>
          <CardContent>
            {responseData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <PieChart>
                  <Pie data={responseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {responseData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Nenhum convite registrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <div className="rounded-lg bg-primary/10 p-2.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

export default AdminJobsDashboardPage;
