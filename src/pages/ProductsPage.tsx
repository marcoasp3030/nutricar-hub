import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Legend,
} from "recharts";
import { queryVendas } from "@/lib/api";
import { exportToXLSX, exportToPDF, PRODUCT_COLUMNS } from "@/lib/exportUtils";
import {
  Loader2, CalendarIcon, X, TrendingUp, TrendingDown, Clock, ShoppingBasket, Layers, FileSpreadsheet, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const COLORS = [
  "hsl(87, 48%, 51%)", "hsl(87, 48%, 65%)", "hsl(200, 60%, 50%)",
  "hsl(45, 80%, 55%)", "hsl(340, 65%, 55%)", "hsl(160, 50%, 45%)",
  "hsl(270, 50%, 55%)", "hsl(30, 70%, 50%)", "hsl(10, 60%, 50%)",
  "hsl(180, 50%, 45%)", "hsl(220, 55%, 55%)", "hsl(60, 60%, 50%)",
  "hsl(300, 40%, 55%)", "hsl(120, 45%, 50%)", "hsl(0, 50%, 55%)",
];

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface ProductsPageProps {
  tableName: string;
  fornecedor: string;
}

const ProductsPage = ({ tableName, fornecedor }: ProductsPageProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");

  const dateFilters = {
    ...(dateFrom ? { dateFrom: format(dateFrom, "yyyy-MM-dd") } : {}),
    ...(dateTo ? { dateTo: format(dateTo, "yyyy-MM-dd") } : {}),
  };

  useEffect(() => {
    setLoading(true);
    queryVendas({ action: "produtos", filters: { ...dateFilters, fornecedor }, tableName })
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tableName, dateFrom, dateTo, fornecedor]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const porHoraFormatted = (data.porHora || []).map((h: any) => ({
    ...h,
    name: `${String(h.hora).padStart(2, "0")}h`,
  }));

  const porDiaSemanaFormatted = (data.porDiaSemana || []).map((d: any) => ({
    ...d,
    name: DIAS_SEMANA[Number(d.dia)] || d.dia,
  }));

  // Find peak hour
  const peakHour = porHoraFormatted.reduce(
    (max: any, h: any) => (Number(h.quantidade) > Number(max?.quantidade || 0) ? h : max),
    porHoraFormatted[0]
  );

  const topProduct = data.topVenda?.[0];
  const worstProduct = data.menosVenda?.[0];

  const kpiCards = [
    {
      label: "Total de Produtos",
      value: Number(data.totalProdutos || 0).toLocaleString("pt-BR"),
      icon: ShoppingBasket,
    },
    {
      label: "Produto Mais Vendido",
      value: topProduct?.name?.substring(0, 25) || "—",
      sub: topProduct ? `${Number(topProduct.quantidade).toLocaleString("pt-BR")} un.` : "",
      icon: TrendingUp,
    },
    {
      label: "Produto Menos Vendido",
      value: worstProduct?.name?.substring(0, 25) || "—",
      sub: worstProduct ? `${Number(worstProduct.quantidade).toLocaleString("pt-BR")} un.` : "",
      icon: TrendingDown,
    },
    {
      label: "Horário de Pico",
      value: peakHour?.name || "—",
      sub: peakHour ? `${Number(peakHour.quantidade).toLocaleString("pt-BR")} vendas` : "",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise de Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Visão detalhada do desempenho dos produtos
            {(dateFrom || dateTo) && " (filtrado)"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (!data?.topVenda?.length) return;
              exportToXLSX(data.topVenda, PRODUCT_COLUMNS, `produtos_${tableName}`);
            }}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (!data?.topVenda?.length) return;
              exportToPDF(data.topVenda, PRODUCT_COLUMNS, `produtos_${tableName}`, "Análise de Produtos");
            }}
          >
            <FileText className="h-4 w-4" /> PDF
          </Button>
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="truncate text-base font-bold text-foreground">{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Top vendidos + Menos vendidos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Top 15 — Mais Vendidos (Valor)
            </h3>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data.topVenda} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="hsl(90,10%,45%)" width={140} />
                <Tooltip formatter={(v: number, name: string) => name === "Valor" ? formatCurrency(v) : Number(v).toLocaleString("pt-BR")} />
                <Bar dataKey="valor" name="Valor" fill="hsl(87,48%,51%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="quantidade" name="Quantidade" fill="hsl(200,60%,50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Top 15 — Menos Vendidos (Valor)
            </h3>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data.menosVenda} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="hsl(90,10%,45%)" width={140} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" name="Valor" fill="hsl(340,65%,55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Vendas por Hora + Dia da Semana */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Vendas por Hora do Dia
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={porHoraFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(87,48%,51%)" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(200,60%,50%)" />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "Valor" ? formatCurrency(v) : Number(v).toLocaleString("pt-BR")
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="quantidade" name="Quantidade" fill="hsl(87,48%,51%)" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="valor" name="Valor" stroke="hsl(200,60%,50%)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Vendas por Dia da Semana</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porDiaSemanaFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "valor" ? formatCurrency(v) : Number(v).toLocaleString("pt-BR")
                  }
                />
                <Legend />
                <Bar dataKey="quantidade" name="Quantidade" fill="hsl(87,48%,51%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="valor" name="Valor (R$)" fill="hsl(200,60%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Receita × Margem por Categoria */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Receita × Margem por Categoria</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.porCategoria}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(90,10%,45%)" angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="valor" name="Receita (R$)" fill="hsl(87,48%,51%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="margem" name="Margem (R$)" fill="hsl(160,50%,45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 4: Top produtos por categoria selecionada */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Top 5 Produtos por Categoria
            </h3>
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="w-48 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {(data.porCategoria || []).map((c: any) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(() => {
            const filtered = (data.topPorCategoria || []).filter(
              (p: any) => selectedCategoria === "all" || p.categoria === selectedCategoria
            );
            const grouped = filtered.reduce((acc: any, p: any) => {
              if (!acc[p.categoria]) acc[p.categoria] = [];
              acc[p.categoria].push(p);
              return acc;
            }, {} as Record<string, any[]>);
            const categories = Object.keys(grouped).slice(0, selectedCategoria === "all" ? 4 : 1);

            return (
              <div className={cn("grid gap-6", selectedCategoria === "all" ? "md:grid-cols-2" : "md:grid-cols-1")}>
                {categories.map((cat, ci) => (
                  <div key={cat}>
                    <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat}</p>
                    <ResponsiveContainer width="100%" height={selectedCategoria === "all" ? 220 : 260}>
                      <BarChart data={grouped[cat]} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
                        <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(90,10%,45%)" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 8 }}
                          stroke="hsl(90,10%,45%)"
                          width={180}
                          tickFormatter={(v: string) => v.length > 28 ? v.substring(0, 28) + "…" : v}
                        />
                        <Tooltip formatter={(v: number, name: string) => name === "valor" ? formatCurrency(v) : Number(v).toLocaleString("pt-BR")} />
                        <Bar dataKey="quantidade" name="Quantidade" fill={COLORS[ci % COLORS.length]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Row 5: Margem por produto */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Top 15 — Margem por Produto</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data.margemProduto} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90,15%,88%)" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(90,10%,45%)" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="hsl(90,10%,45%)" width={140} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === "margem_pct" ? `${v}%` : formatCurrency(v)
                }
              />
              <Legend />
              <Bar dataKey="margem" name="Margem (R$)" fill="hsl(160,50%,45%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
