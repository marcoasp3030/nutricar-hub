import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roles } = await supabaseUser.from('user_roles').select('role').eq('user_id', userId);
    const isAdmin = roles?.some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { action } = body;

    // LIST USERS
    if (action === 'list') {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get roles for all users
      const { data: allRoles } = await supabaseAdmin
        .from('user_roles')
        .select('*');

      // Get auth users for emails
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      const users = (profiles || []).map((p: any) => {
        const authUser = authData?.users?.find((u: any) => u.id === p.user_id);
        const userRoles = allRoles?.filter((r: any) => r.user_id === p.user_id) || [];
        return {
          ...p,
          email: authUser?.email || '',
          roles: userRoles.map((r: any) => r.role),
          last_sign_in: authUser?.last_sign_in_at || null,
        };
      });

      return new Response(JSON.stringify({ data: users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // CREATE USER
    if (action === 'create') {
      const { email, password, full_name, fornecedor, role } = body;

      if (!email || !password || !full_name) {
        return new Response(JSON.stringify({ error: 'E-mail, senha e nome são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const newUserId = newUser.user.id;

      // Update profile with fornecedor
      await supabaseAdmin
        .from('profiles')
        .update({ full_name, fornecedor: fornecedor || null })
        .eq('user_id', newUserId);

      // Set role
      if (role) {
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUserId, role });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUserId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // UPDATE USER
    if (action === 'update') {
      const { target_user_id, full_name, fornecedor, role } = body;

      if (!target_user_id) {
        return new Response(JSON.stringify({ error: 'ID do usuário é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Update profile
      await supabaseAdmin
        .from('profiles')
        .update({ full_name, fornecedor: fornecedor || null })
        .eq('user_id', target_user_id);

      // Update role - delete existing and insert new
      if (role) {
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', target_user_id);

        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: target_user_id, role });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // RESET PASSWORD
    if (action === 'reset-password') {
      const { target_user_id, new_password } = body;

      if (!target_user_id || !new_password) {
        return new Response(JSON.stringify({ error: 'ID e nova senha são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DELETE USER
    if (action === 'delete') {
      const { target_user_id } = body;

      if (!target_user_id) {
        return new Response(JSON.stringify({ error: 'ID do usuário é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Prevent self-deletion
      if (target_user_id === userId) {
        return new Response(JSON.stringify({ error: 'Não é possível excluir sua própria conta' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // GET FORNECEDORES (from external DB for autocomplete)
    if (action === 'fornecedores') {
      // Query external DB for unique fornecedores
      const { default: postgres } = await import("npm:postgres@3.4.5");
      const sql = postgres({
        host: Deno.env.get('EXTERNAL_DB_HOST')!,
        user: Deno.env.get('EXTERNAL_DB_USER')!,
        password: Deno.env.get('EXTERNAL_DB_PASSWORD')!,
        database: Deno.env.get('EXTERNAL_DB_NAME')!,
        port: 5432,
        ssl: false,
        max: 1,
        idle_timeout: 5,
      });

      try {
        const result = await sql`
          SELECT DISTINCT fornecedor FROM vendas_2026 
          WHERE fornecedor IS NOT NULL AND fornecedor != ''
          ORDER BY fornecedor 
          LIMIT 500
        `;
        await sql.end();
        return new Response(JSON.stringify({ data: result.map((r: any) => r.fornecedor) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        await sql.end();
        return new Response(JSON.stringify({ data: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
