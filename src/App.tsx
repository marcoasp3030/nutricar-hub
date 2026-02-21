import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile } from "@/lib/api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
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
  const [tableName, setTableName] = useState("vendas_2026");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const p = await getUserProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const p = await getUserProfile();
        setProfile(p);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

  const role = profile?.isAdmin ? "admin" : "fornecedor";
  const fornecedor = profile?.fornecedor || "Não vinculado";

  return (
    <BrowserRouter>
      <AppLayout
        role={role as "admin" | "fornecedor"}
        fornecedor={fornecedor}
        onLogout={() => supabase.auth.signOut()}
        tableName={tableName}
        onTableChange={setTableName}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage tableName={tableName} />} />
          <Route path="/relatorios" element={<ReportsPage tableName={tableName} />} />
          {role === "admin" && (
            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          )}
          <Route path="*" element={<NotFound />} />
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
