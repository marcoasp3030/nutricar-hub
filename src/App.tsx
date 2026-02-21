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
import AppLayout from "./components/AppLayout";
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

  // Check if user is active
  if (profile && !profile.isAdmin && !profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">Acesso Desativado</h2>
          <p className="text-sm text-muted-foreground">Seu acesso ao portal foi desativado pelo administrador.</p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sair</Button>
        </div>
      </div>
    );
  }

  const role = profile?.isAdmin ? "admin" : "fornecedor";
  const fornecedores: string[] = profile?.fornecedores || [];
  const activeFornecedor = selectedFornecedor || fornecedores[0] || "Não vinculado";

  return (
    <BrowserRouter>
      <AppLayout
        role={role as "admin" | "fornecedor"}
        fornecedor={activeFornecedor}
        fornecedores={fornecedores}
        onFornecedorChange={setSelectedFornecedor}
        onLogout={() => supabase.auth.signOut()}
        tableName={tableName}
        onTableChange={setTableName}
      >
        <Routes>
          <Route path="/" element={<Navigate to={role === 'admin' ? '/admin/usuarios' : '/dashboard'} replace />} />
          {role !== 'admin' && (
            <>
              <Route path="/dashboard" element={<DashboardPage tableName={tableName} fornecedor={activeFornecedor} />} />
              <Route path="/produtos" element={<ProductsPage tableName={tableName} fornecedor={activeFornecedor} />} />
              <Route path="/relatorios" element={<ReportsPage tableName={tableName} fornecedor={activeFornecedor} />} />
            </>
          )}
          {role === "admin" ? (
            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          ) : (
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
          )}
          <Route path="*" element={<Navigate to={role === 'admin' ? '/admin/usuarios' : '/dashboard'} replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
