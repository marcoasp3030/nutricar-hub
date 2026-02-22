import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminMediaPage from "./pages/AdminMediaPage";
import AdminAdvertisingPage from "./pages/AdminAdvertisingPage";
import FornecedorContractsPage from "./pages/FornecedorContractsPage";
import AdminLgpdPage from "./pages/AdminLgpdPage";
import AdminStoresPage from "./pages/AdminStoresPage";
import LgpdPage from "./pages/LgpdPage";
import AppLayout from "./components/AppLayout";
import TvPlayerPage from "./pages/TvPlayerPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState(() => sessionStorage.getItem("nutricar_table") || "vendas_2026");
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>(() => sessionStorage.getItem("nutricar_fornecedor") || "");

  // Persist selections in sessionStorage
  useEffect(() => {
    sessionStorage.setItem("nutricar_table", tableName);
  }, [tableName]);

  useEffect(() => {
    if (selectedFornecedor) {
      sessionStorage.setItem("nutricar_fornecedor", selectedFornecedor);
    }
  }, [selectedFornecedor]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      try {
        const p = await getUserProfile();
        if (isMounted) setProfile(p);
      } catch (e) {
        console.error('Error loading profile:', e);
        if (isMounted) setProfile(null);
      }
    };

    // Listener for ongoing auth changes — avoid awaiting inside callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        if (session?.user) {
          setTimeout(() => loadProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Initial load — controls loading state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  // Check if user is active (admins always pass)
  if (profile && !profile.isAdmin && !profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">Acesso Pendente</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada com sucesso, mas ainda aguarda aprovação do administrador.
            <br />Você será notificado quando o acesso for liberado.
          </p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sair</Button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.isAdmin;
  const isGerente = profile?.isGerente;
  const isFuncionario = profile?.isFuncionario;
  const userPermissions: string[] = profile?.permissions || [];
  
  // Determine effective role for layout
  const role = isAdmin ? "admin" : (isGerente || isFuncionario) ? "staff" : "fornecedor";
  const fornecedores: string[] = profile?.fornecedores || [];
  const activeFornecedor = selectedFornecedor || fornecedores[0] || "Não vinculado";

  // Permission check helper
  const hasPermission = (perm: string) => {
    if (isAdmin) return true; // Admin has all permissions
    if (!isGerente && !isFuncionario) {
      // Regular fornecedor has default fornecedor permissions
      return ['dashboard', 'produtos', 'relatorios', 'contratos', 'meus_dados'].includes(perm);
    }
    return userPermissions.includes(perm);
  };

  // For staff (gerente/funcionario), determine which nav items to show
  const staffRole = isGerente ? "gerente" : isFuncionario ? "funcionario" : null;

  return (
    <AppLayout
      role={isAdmin ? "admin" : (staffRole || "fornecedor") as any}
      fornecedor={activeFornecedor}
      fornecedores={fornecedores}
      onFornecedorChange={setSelectedFornecedor}
      onLogout={() => supabase.auth.signOut()}
      tableName={tableName}
      onTableChange={setTableName}
      permissions={userPermissions}
    >
      <Routes>
        <Route path="/" element={<Navigate to={isAdmin ? '/admin/dashboard' : hasPermission('dashboard') ? '/dashboard' : hasPermission('admin_dashboard') ? '/admin/dashboard' : '/dashboard'} replace />} />
        
        {/* Fornecedor / staff pages - permission gated */}
        {hasPermission('dashboard') && (
          <Route path="/dashboard" element={<DashboardPage tableName={tableName} fornecedor={activeFornecedor} />} />
        )}
        {hasPermission('produtos') && (
          <Route path="/produtos" element={<ProductsPage tableName={tableName} fornecedor={activeFornecedor} />} />
        )}
        {hasPermission('relatorios') && (
          <Route path="/relatorios" element={<ReportsPage tableName={tableName} fornecedor={activeFornecedor} />} />
        )}
        {hasPermission('contratos') && (
          <Route path="/contratos" element={<FornecedorContractsPage fornecedor={activeFornecedor} />} />
        )}
        {hasPermission('meus_dados') && (
          <Route path="/meus-dados" element={<LgpdPage />} />
        )}

        {/* Admin pages - permission gated */}
        {hasPermission('admin_dashboard') && (
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        )}
        {hasPermission('admin_usuarios') && (
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
        )}
        {hasPermission('admin_midia') && (
          <Route path="/admin/midia" element={<AdminMediaPage />} />
        )}
        {hasPermission('admin_lojas') && (
          <Route path="/admin/lojas" element={<AdminStoresPage />} />
        )}
        {hasPermission('admin_publicidade') && (
          <Route path="/admin/publicidade" element={<AdminAdvertisingPage />} />
        )}
        {hasPermission('admin_lgpd') && (
          <Route path="/admin/lgpd" element={<AdminLgpdPage />} />
        )}

        <Route path="*" element={<Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/tv/:playlistId" element={<TvPlayerPage />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
