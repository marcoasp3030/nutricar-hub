import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { mockKPIs, chartByPeriodo, chartByCategoria, chartByRegiao, chartByPagamento, chartByStatus } from "@/data/mockData";
import { Package, DollarSign, ShoppingCart, Percent } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const COLORS = [
  "hsl(87, 48%, 51%)",
  "hsl(87, 48%, 65%)",
  "hsl(200, 60%, 50%)",
  "hsl(45, 80%, 55%)",
  "hsl(340, 65%, 55%)",
];

const kpis = [
  { label: "Quantidade Total", value: mockKPIs.totalQuantidade.toLocaleString("pt-BR"), icon: Package, color: "text-primary" },
  { label: "Valor Total", value: formatCurrency(mockKPIs.totalValor), icon: DollarSign, color: "text-primary" },
  { label: "Valor de Compra", value: formatCurrency(mockKPIs.totalValorCompra), icon: ShoppingCart, color: "text-primary" },
  { label: "Desconto Total", value: formatCurrency(mockKPIs.totalDesconto), icon: Percent, color: "text-primary" },
];

const DashboardPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das suas movimentações</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Valor por Período</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartByPeriodo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90, 15%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(90, 10%, 45%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(90, 10%, 45%)" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="valor" stroke="hsl(87, 48%, 51%)" fill="hsl(87, 48%, 51%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Valor por Categoria</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartByCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90, 15%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(90, 10%, 45%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(90, 10%, 45%)" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="hsl(87, 48%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Por Região</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartByRegiao} cx="50%" cy="50%" outerRadius={80} dataKey="valor" label={({ name }) => name}>
                  {chartByRegiao.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Tipo de Pagamento</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartByPagamento} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(90, 15%, 88%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(90, 10%, 45%)" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(90, 10%, 45%)" width={70} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="hsl(87, 48%, 65%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Por Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="valor" label={({ name }) => name}>
                  {chartByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
