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

  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', user.id);

  const userRoles = roles?.map((r: any) => r.role) || [];

  return {
    ...profile,
    user_id: user.id,
    email: user.email,
    roles: userRoles,
    isAdmin: userRoles.includes('admin'),
    isGerente: userRoles.includes('gerente'),
    isFuncionario: userRoles.includes('funcionario'),
    fornecedores: fornecedores?.map((f: any) => f.fornecedor) || [],
    permissions: permissions?.map((p: any) => p.permission) || [],
    is_active: profile?.is_active ?? false,
  };
}
