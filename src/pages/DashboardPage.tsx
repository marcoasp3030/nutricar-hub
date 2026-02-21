import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line,
} from "recharts";
import { queryVendas } from "@/lib/api";
import { Package, DollarSign, ShoppingCart, Percent, Loader2, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const COLORS = [
  "hsl(87, 48%, 51%)", "hsl(87, 48%, 65%)", "hsl(200, 60%, 50%)",
  "hsl(45, 80%, 55%)", "hsl(340, 65%, 55%)", "hsl(160, 50%, 45%)",
  "hsl(270, 50%, 55%)", "hsl(30, 70%, 50%)",
];

interface DashboardPageProps {
  tableName: string;
}

const DashboardPage = ({ tableName }: DashboardPageProps) => {
  const [kpis, setKpis] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartGroupBy, setChartGroupBy] = useState("categoria");
  const [periodoData, setPeriodoData] = useState<any[]>([]);
  // status chart removed - dashboard now only shows status=OK data
  const [pagamentoData, setPagamentoData] = useState<any[]>([]);
  const [bairroData, setBairroData] = useState<any[]>([]);
  const [bandeiraData, setBandeiraData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const dateFilters = {
    ...(dateFrom ? { dateFrom: format(dateFrom, "yyyy-MM-dd") } : {}),
    ...(dateTo ? { dateTo: format(dateTo, "yyyy-MM-dd") } : {}),
  };

  useEffect(() => {
    setLoading(true);
    queryVendas({ action: 'dashboard', filters: { ...dateFilters, groupBy: chartGroupBy }, tableName })
      .then(res => {
        const d = res.data;
        setKpis(d.kpis);
        setPeriodoData(d.periodo || []);
        // status data no longer needed (filtered to OK only)
        setPagamentoData(d.pagamento || []);
        setBairroData(d.bairro || []);
        setBandeiraData(d.bandeira || []);
        setChartData(d.extra || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tableName, dateFrom, dateTo, chartGroupBy]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Quantidade Total", value: Number(kpis?.total_quantidade || 0).toLocaleString("pt-BR"), icon: Package },
    { label: "Valor Total", value: formatCurrency(Number(kpis?.total_valor || 0)), icon: DollarSign },
    { label: "Valor de Compra", value: formatCurrency(Number(kpis?.total_valor_compra || 0)), icon: ShoppingCart },
    { label: "Desconto Total", value: formatCurrency(Number(kpis?.total_desconto || 0)), icon: Percent },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral — {Number(kpis?.total_registros || 0).toLocaleString("pt-BR")} registros
            {(dateFrom || dateTo) && " (filtrado)"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left text-sm font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left text-sm font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="icon" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} title="Limpar filtro">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Valor por Período</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={periodoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="valor" stroke="hsl(87,48%,51%)" fill="hsl(87,48%,51%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Valor por</h3>
              <Select value={chartGroupBy} onValueChange={setChartGroupBy}>
                <SelectTrigger className="w-44 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['categoria', 'produto', 'regiao', 'bairro', 'loja', 'bandeira'].map(g => (
                    <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" radius={[4,4,0,0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Tipo de Pagamento</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pagamentoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" width={80} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" fill="hsl(87,48%,65%)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 3: Bairro */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Top 10 Bairros por Valor</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bairroData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(90,10%,45%)" angle={-30} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" radius={[4,4,0,0]}>
                {bairroData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 4: Comparativo Período (valor + quantidade) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Comparativo por Período — Valor × Quantidade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={periodoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(90,10%,45%)" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(87,48%,51%)" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(200,60%,50%)" />
              <Tooltip formatter={(v: number, name: string) => name === 'valor' ? formatCurrency(v) : Number(v).toLocaleString('pt-BR')} />
              <Legend />
              <Bar yAxisId="left" dataKey="valor" name="Valor (R$)" fill="hsl(87,48%,51%)" radius={[4,4,0,0]} fillOpacity={0.7} />
              <Line yAxisId="right" type="monotone" dataKey="quantidade" name="Quantidade" stroke="hsl(200,60%,50%)" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
