import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, ShieldCheck, Clock, Building2, Loader2, Database, AlertCircle, Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface UserData {
  user_id: string;
  full_name: string;
  email: string;
  cnpj: string | null;
  fornecedor: string | null;
  fornecedores: string[];
  roles: string[];
  is_active: boolean;
  created_at: string;
  last_sign_in: string | null;
}

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const callAdmin = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAdmin({ action: "list" });
      setUsers(res.data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const stats = useMemo(() => {
    const fornecedores = users.filter((u) => !u.roles.includes("admin"));
    const admins = users.filter((u) => u.roles.includes("admin"));
    const ativos = fornecedores.filter((u) => u.is_active);
    const inativos = fornecedores.filter((u) => !u.is_active);
    const nuncaAcessou = fornecedores.filter((u) => !u.last_sign_in);
    const allFornecedoresSet = new Set(fornecedores.flatMap((u) => u.fornecedores || []));
    return {
      total: users.length,
      fornecedores: fornecedores.length,
      admins: admins.length,
      ativos: ativos.length,
      inativos: inativos.length,
      pendentes: inativos.length,
      nuncaAcessou: nuncaAcessou.length,
      totalFornecedoresVinculados: allFornecedoresSet.size,
    };
  }, [users]);

  const pendingUsers = useMemo(() => {
    return users.filter((u) => !u.is_active && !u.roles.includes("admin"));
  }, [users]);

  const recentLogins = useMemo(() => {
    return [...users]
      .filter((u) => !u.roles.includes("admin") && u.last_sign_in)
      .sort((a, b) => new Date(b.last_sign_in!).getTime() - new Date(a.last_sign_in!).getTime())
      .slice(0, 10);
  }, [users]);

  const signupChart = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const count = users.filter((u) => {
        if (u.roles.includes("admin")) return false;
        const created = new Date(u.created_at);
        return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label, count });
    }
    return months;
  }, [users]);

  const fornecedorOverview = useMemo(() => {
    const map = new Map<string, { users: number; activeUsers: number; lastAccess: string | null }>();
    users
      .filter((u) => !u.roles.includes("admin"))
      .forEach((u) => {
        (u.fornecedores || []).forEach((f) => {
          const existing = map.get(f) || { users: 0, activeUsers: 0, lastAccess: null };
          existing.users++;
          if (u.is_active) existing.activeUsers++;
          if (u.last_sign_in) {
            if (!existing.lastAccess || new Date(u.last_sign_in) > new Date(existing.lastAccess)) {
              existing.lastAccess = u.last_sign_in;
            }
          }
          map.set(f, existing);
        });
      });
    return [...map.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.users - a.users);
  }, [users]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleApprove = async (user: UserData) => {
    try {
      await callAdmin({ action: "toggle-active", target_user_id: user.user_id, is_active: true });
      toast.success(`${user.full_name || user.email} aprovado com sucesso!`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const kpiCards = [
    { label: "Total Usuários", value: stats.total, icon: Users, color: "text-primary" },
    { label: "Pendentes", value: stats.pendentes, icon: AlertCircle, color: stats.pendentes > 0 ? "text-orange-500" : "text-muted-foreground" },
    { label: "Fornecedores Ativos", value: stats.ativos, icon: UserCheck, color: "text-green-600" },
    { label: "Administradores", value: stats.admins, icon: ShieldCheck, color: "text-amber-600" },
    { label: "Nunca Acessaram", value: stats.nuncaAcessou, icon: Clock, color: "text-orange-500" },
    { label: "Fornecedores Vinculados", value: stats.totalFornecedoresVinculados, icon: Building2, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Visão geral do portal</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <span className="text-2xl font-bold tabular-nums text-foreground">{kpi.value}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Cadastros Pendentes de Aprovação
                <Badge variant="destructive" className="ml-1">{pendingUsers.length}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/usuarios")}>
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">E-mail</TableHead>
                    <TableHead className="text-xs">CNPJ</TableHead>
                    <TableHead className="text-xs">Cadastrado em</TableHead>
                    <TableHead className="text-xs w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.slice(0, 5).map((u) => (
                    <TableRow key={u.user_id} className="text-sm">
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {u.cnpj ? u.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" className="gap-1.5 h-7" onClick={() => handleApprove(u)}>
                          <Check className="h-3.5 w-3.5" /> Aprovar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Signup Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Cadastros por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signupChart} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number) => [`${value} cadastro(s)`, ""]}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logins */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Últimos Acessos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto max-h-52 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogins.length > 0 ? (
                    recentLogins.map((u) => (
                      <TableRow key={u.user_id} className="text-sm">
                        <TableCell className="font-medium py-2">{u.full_name || u.email}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground py-2">
                          {new Date(u.last_sign_in!).toLocaleDateString("pt-BR")}{" "}
                          {new Date(u.last_sign_in!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="py-6 text-center text-muted-foreground text-xs">
                        Nenhum acesso registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fornecedor Overview */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Visão Geral por Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Fornecedor</TableHead>
                  <TableHead className="text-xs text-center">Usuários</TableHead>
                  <TableHead className="text-xs text-center">Ativos</TableHead>
                  <TableHead className="text-xs">Último Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedorOverview.length > 0 ? (
                  fornecedorOverview.map((f) => (
                    <TableRow key={f.name} className="text-sm">
                      <TableCell className="font-medium max-w-[250px] truncate">{f.name}</TableCell>
                      <TableCell className="text-center tabular-nums">{f.users}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={f.activeUsers === f.users ? "default" : "secondary"} className="text-xs">
                          {f.activeUsers}/{f.users}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {f.lastAccess
                          ? `${new Date(f.lastAccess).toLocaleDateString("pt-BR")} ${new Date(f.lastAccess).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : "Nunca"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground text-xs">
                      Nenhum fornecedor vinculado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
