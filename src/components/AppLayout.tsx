import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo-nutricar.webp";
import {
  LayoutDashboard, FileText, Users, LogOut, Menu, ChevronRight, Database, ShoppingBasket, MonitorPlay, Megaphone, Shield, Store, Wifi, ClipboardList, Briefcase, Tag, UserCheck, BarChart3, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { queryVendas } from "@/lib/api";

interface AppLayoutProps {
  children: ReactNode;
  role: "fornecedor" | "admin" | "gerente" | "funcionario";
  fornecedor: string;
  fornecedores: string[];
  onFornecedorChange: (f: string) => void;
  onLogout: () => void;
  tableName: string;
  onTableChange: (t: string) => void;
  permissions?: string[];
}

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; permission: string; group?: string };

const allNavItems: NavItem[] = [
  // Fornecedor items
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { to: "/produtos", label: "Produtos", icon: ShoppingBasket, permission: "produtos" },
  { to: "/relatorios", label: "Relatórios", icon: FileText, permission: "relatorios" },
  { to: "/contratos", label: "Mídia TV", icon: Megaphone, permission: "contratos" },
  { to: "/checklists", label: "Checklists", icon: ClipboardList, permission: "checklists" },
  { to: "/meus-dados", label: "Meus Dados", icon: Shield, permission: "meus_dados" },
  // Admin items — grouped
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "admin_dashboard", group: "Geral" },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, permission: "admin_usuarios", group: "Geral" },
  { to: "/admin/lgpd", label: "LGPD", icon: Shield, permission: "admin_lgpd", group: "Geral" },
  { to: "/admin/midia", label: "Mídia TV", icon: MonitorPlay, permission: "admin_midia", group: "TV & Lojas" },
  { to: "/admin/lojas", label: "Lojas & TVs", icon: Store, permission: "admin_lojas", group: "TV & Lojas" },
  { to: "/admin/publicidade", label: "Publicidade", icon: Megaphone, permission: "admin_publicidade", group: "TV & Lojas" },
  { to: "/admin/tv-api", label: "API TV", icon: Wifi, permission: "admin_tv_api", group: "TV & Lojas" },
  { to: "/admin/checklists", label: "Checklists", icon: ClipboardList, permission: "admin_checklists", group: "Checklists" },
  { to: "/admin/checklists/dashboard", label: "Métricas", icon: BarChart3, permission: "admin_checklists", group: "Checklists" },
  { to: "/admin/jobs", label: "Eventos", icon: Briefcase, permission: "admin_jobs", group: "Eventos" },
  { to: "/admin/jobs/dashboard", label: "Métricas", icon: BarChart3, permission: "admin_jobs", group: "Eventos" },
  { to: "/admin/jobs/calendario", label: "Calendário", icon: CalendarDays, permission: "admin_jobs", group: "Eventos" },
  { to: "/admin/event-types", label: "Tipos Evento", icon: Tag, permission: "admin_jobs", group: "Eventos" },
  { to: "/admin/promotoras", label: "Promotoras", icon: UserCheck, permission: "admin_jobs", group: "Eventos" },
  // Promotora
  { to: "/promotora", label: "Portal Promotora", icon: Briefcase, permission: "portal_promotora" },
];

const defaultNavItems = {
  fornecedor: ["dashboard", "produtos", "relatorios", "contratos", "checklists", "meus_dados", "portal_promotora"],
  admin: ["admin_dashboard", "admin_usuarios", "admin_midia", "admin_lojas", "admin_publicidade", "admin_checklists", "admin_lgpd", "admin_tv_api", "admin_jobs"],
};

const AppLayout = ({ children, role, fornecedor, fornecedores, onFornecedorChange, onLogout, tableName, onTableChange, permissions }: AppLayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tables, setTables] = useState<string[]>([]);

  // Build nav items based on permissions
  const items = (() => {
    if (role === 'admin') {
      return allNavItems.filter(item => defaultNavItems.admin.includes(item.permission));
    }
    if (role === 'fornecedor') {
      return allNavItems.filter(item => defaultNavItems.fornecedor.includes(item.permission));
    }
    // gerente/funcionario - use permissions
    if (permissions && permissions.length > 0) {
      return allNavItems.filter(item => permissions.includes(item.permission));
    }
    return [];
  })();
  

  useEffect(() => {
    if (role === 'admin') return; // Admin doesn't need table data
    queryVendas({ action: 'tables', filters: { fornecedor: fornecedor !== 'Não vinculado' ? fornecedor : undefined } })
      .then(res => {
        if (res.data?.length) {
          setTables(res.data);
          if (!res.data.includes(tableName)) {
            onTableChange(res.data[0]);
          }
        }
      })
      .catch(console.error);
  }, [fornecedor, role]);

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <img src={logo} alt="Nutricar" className="h-8 object-contain" />
        </div>

        {role !== 'admin' && tables.length > 1 && (
          <div className="border-b border-sidebar-border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Database className="h-3 w-3" /> Base de dados
            </div>
            <Select value={tableName} onValueChange={onTableChange}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tables.map(t => <SelectItem key={t} value={t}>{t.replace('vendas_', 'Vendas ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3">
          {(() => {
            const groups: { label: string | null; items: NavItem[] }[] = [];
            let currentGroup: string | null | undefined = undefined;
            for (const item of items) {
              const g = item.group ?? null;
              if (g !== currentGroup) {
                groups.push({ label: g, items: [item] });
                currentGroup = g;
              } else {
                groups[groups.length - 1].items.push(item);
              }
            }
            return groups.map((group, gi) => (
              <div key={gi} className={cn(gi > 0 && "mt-3")}>
                {group.label && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}>
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {active && <ChevronRight className="ml-auto h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {role !== 'admin' && fornecedores.length > 1 ? (
            <div className="mb-2 rounded-lg bg-sidebar-accent px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Fornecedor</p>
              <Select value={fornecedor} onValueChange={onFornecedorChange}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : role !== 'admin' ? (
            <div className="mb-2 rounded-lg bg-sidebar-accent px-3 py-2">
              <p className="text-xs text-muted-foreground">Fornecedor</p>
              <p className="truncate text-sm font-medium text-sidebar-foreground">{fornecedor}</p>
            </div>
          ) : null}
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {role === "admin" ? "Admin" : role === "gerente" ? "Gerente" : role === "funcionario" ? "Funcionário" : "Fornecedor"}
          </span>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
