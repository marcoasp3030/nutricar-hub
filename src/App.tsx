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
import AdminTvApiPage from "./pages/AdminTvApiPage";
import ChecklistsPage from "./pages/ChecklistsPage";
import ChecklistExecutionPage from "./pages/ChecklistExecutionPage";
import ChecklistTemplatesPage from "./pages/ChecklistTemplatesPage";
import ChecklistTemplateEditorPage from "./pages/ChecklistTemplateEditorPage";
import AdminChecklistsManagerPage from "./pages/AdminChecklistsManagerPage";
import AdminChecklistsDashboardPage from "./pages/AdminChecklistsDashboardPage";
import PublicChecklistPage from "./pages/PublicChecklistPage";
import AdminEventTypesPage from "./pages/AdminEventTypesPage";
import AdminPromotersPage from "./pages/AdminPromotersPage";
import AdminJobsPage from "./pages/AdminJobsPage";
import AdminJobsDashboardPage from "./pages/AdminJobsDashboardPage";
import AdminJobsCalendarPage from "./pages/AdminJobsCalendarPage";
import PromoterPortalPage from "./pages/PromoterPortalPage";
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
  
  // Check if user is a promoter (has portal_promotora permission and is not admin/gerente/funcionario)
  const isPromoter = !isAdmin && !isGerente && !isFuncionario && userPermissions.includes('portal_promotora');
  
  // Determine effective role for layout
  const role = isAdmin ? "admin" : isPromoter ? "promotora" : (isGerente || isFuncionario) ? "staff" : "fornecedor";
  const fornecedores: string[] = profile?.fornecedores || [];
  const activeFornecedor = selectedFornecedor || fornecedores[0] || "Não vinculado";

  // Permission check helper
  const hasPermission = (perm: string) => {
    if (isAdmin) return true;
    if (isPromoter) {
      // Promoters can only access portal_promotora and checklists (if assigned)
      return ['portal_promotora', 'checklists'].includes(perm) && userPermissions.includes(perm);
    }
    if (!isGerente && !isFuncionario) {
      return ['dashboard', 'produtos', 'relatorios', 'contratos', 'checklists', 'meus_dados'].includes(perm);
    }
    return userPermissions.includes(perm);
  };

  // For staff (gerente/funcionario), determine which nav items to show
  const staffRole = isGerente ? "gerente" : isFuncionario ? "funcionario" : null;

  return (
    <AppLayout
      role={isAdmin ? "admin" : isPromoter ? "promotora" : (staffRole || "fornecedor") as any}
      fornecedor={activeFornecedor}
      fornecedores={fornecedores}
      onFornecedorChange={setSelectedFornecedor}
      onLogout={() => supabase.auth.signOut()}
      tableName={tableName}
      onTableChange={setTableName}
      permissions={userPermissions}
    >
      <Routes>
        <Route path="/" element={<Navigate to={isAdmin ? '/admin/dashboard' : isPromoter ? '/promotora' : hasPermission('dashboard') ? '/dashboard' : hasPermission('admin_dashboard') ? '/admin/dashboard' : '/dashboard'} replace />} />
        
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
        {hasPermission('checklists') && (
          <Route path="/checklists" element={<ChecklistsPage />} />
        )}
        {hasPermission('checklists') && (
          <Route path="/checklists/:id" element={<ChecklistExecutionPage />} />
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
        {hasPermission('admin_tv_api') && (
          <Route path="/admin/tv-api" element={<AdminTvApiPage />} />
        )}
        {hasPermission('admin_checklists') && (
          <Route path="/admin/checklists/templates" element={<ChecklistTemplatesPage />} />
        )}
        {hasPermission('admin_checklists') && (
          <Route path="/admin/checklists/templates/:id" element={<ChecklistTemplateEditorPage />} />
        )}
        {hasPermission('admin_checklists') && (
          <Route path="/admin/checklists" element={<AdminChecklistsManagerPage />} />
        )}
        {hasPermission('admin_checklists') && (
          <Route path="/admin/checklists/dashboard" element={<AdminChecklistsDashboardPage />} />
        )}
        {hasPermission('admin_jobs') && (
          <Route path="/admin/jobs" element={<AdminJobsPage />} />
        )}
        {hasPermission('admin_jobs') && (
          <Route path="/admin/jobs/dashboard" element={<AdminJobsDashboardPage />} />
        )}
        {hasPermission('admin_jobs') && (
          <Route path="/admin/jobs/calendario" element={<AdminJobsCalendarPage />} />
        )}
        {hasPermission('admin_jobs') && (
          <Route path="/admin/event-types" element={<AdminEventTypesPage />} />
        )}
        {hasPermission('admin_jobs') && (
          <Route path="/admin/promotoras" element={<AdminPromotersPage />} />
        )}
        {hasPermission('portal_promotora') && (
          <Route path="/promotora" element={<PromoterPortalPage />} />
        )}

        <Route path="*" element={<Navigate to={isAdmin ? '/admin/dashboard' : isPromoter ? '/promotora' : '/dashboard'} replace />} />
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
          <Route path="/checklist-publico/:id" element={<PublicChecklistPage />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
