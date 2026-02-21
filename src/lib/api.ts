import { supabase } from "@/integrations/supabase/client";

interface QueryVendasParams {
  action: 'kpis' | 'chart' | 'list' | 'filter-options' | 'tables' | 'dashboard' | 'produtos';
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
  tableName?: string;
}

export async function queryVendas(params: QueryVendasParams) {
  const { data, error } = await supabase.functions.invoke('query-vendas', {
    body: params,
  });

  if (error) throw new Error(error.message || 'Erro ao consultar dados');
  return data;
}

export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const { data: fornecedores } = await supabase
    .from('user_fornecedores')
    .select('fornecedor')
    .eq('user_id', user.id);

  return {
    ...profile,
    user_id: user.id,
    email: user.email,
    roles: roles?.map((r: any) => r.role) || [],
    isAdmin: roles?.some((r: any) => r.role === 'admin') || false,
    fornecedores: fornecedores?.map((f: any) => f.fornecedor) || [],
    is_active: profile?.is_active ?? true,
  };
}
