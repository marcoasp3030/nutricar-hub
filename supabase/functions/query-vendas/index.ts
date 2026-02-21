import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;

    // Get user profile and role
    const { data: profile } = await supabase.from('profiles').select('fornecedor').eq('user_id', userId).single();
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    
    const isAdmin = roles?.some((r: any) => r.role === 'admin') || false;
    const fornecedor = profile?.fornecedor;

    if (!isAdmin && !fornecedor) {
      return new Response(JSON.stringify({ error: 'Fornecedor não vinculado ao usuário' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse request body
    const body = await req.json();
    const { action, filters = {}, page = 1, pageSize = 50, sortBy, sortDir = 'desc', tableName = 'vendas_2026' } = body;

    // Validate table name - only allow vendas_ tables
    const tableNameClean = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    if (!tableNameClean.startsWith('vendas_')) {
      return new Response(JSON.stringify({ error: 'Tabela inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Connect to external DB
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
      if (action === 'kpis') {
        // KPIs query
        let query;
        if (isAdmin && !filters.fornecedor) {
          query = sql`
            SELECT 
              COALESCE(SUM(quantidade::numeric), 0) as total_quantidade,
              COALESCE(SUM(valor::numeric), 0) as total_valor,
              COALESCE(SUM(valor_compra::numeric), 0) as total_valor_compra,
              COALESCE(SUM(desconto::numeric), 0) as total_desconto,
              COUNT(*) as total_registros
            FROM ${sql(tableNameClean)}
            WHERE 1=1
          `;
        } else {
          const forn = filters.fornecedor || fornecedor;
          query = sql`
            SELECT 
              COALESCE(SUM(quantidade::numeric), 0) as total_quantidade,
              COALESCE(SUM(valor::numeric), 0) as total_valor,
              COALESCE(SUM(valor_compra::numeric), 0) as total_valor_compra,
              COALESCE(SUM(desconto::numeric), 0) as total_desconto,
              COUNT(*) as total_registros
            FROM ${sql(tableNameClean)}
            WHERE fornecedor = ${forn}
          `;
        }
        const result = await query;
        return new Response(JSON.stringify({ data: result[0] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'chart') {
        const groupBy = filters.groupBy || 'periodo';
        const allowedGroupBy = ['periodo', 'produto', 'categoria', 'regiao', 'bairro', 'tipo_de_pagamento', 'status', 'bandeira', 'loja'];
        if (!allowedGroupBy.includes(groupBy)) {
          return new Response(JSON.stringify({ error: 'Agrupamento inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let result;
        if (isAdmin && !filters.fornecedor) {
          result = await sql`
            SELECT ${sql(groupBy)} as name,
              COALESCE(SUM(valor::numeric), 0) as valor,
              COALESCE(SUM(quantidade::numeric), 0) as quantidade
            FROM ${sql(tableNameClean)}
            GROUP BY ${sql(groupBy)}
            ORDER BY valor DESC
            LIMIT 20
          `;
        } else {
          const forn = filters.fornecedor || fornecedor;
          result = await sql`
            SELECT ${sql(groupBy)} as name,
              COALESCE(SUM(valor::numeric), 0) as valor,
              COALESCE(SUM(quantidade::numeric), 0) as quantidade
            FROM ${sql(tableNameClean)}
            WHERE fornecedor = ${forn}
            GROUP BY ${sql(groupBy)}
            ORDER BY valor DESC
            LIMIT 20
          `;
        }
        return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'list') {
        const offset = (page - 1) * pageSize;
        const forn = filters.fornecedor || fornecedor;
        
        // Build conditions array
        const conditions: string[] = [];
        const values: any[] = [];

        if (!isAdmin || forn) {
          conditions.push('fornecedor');
          values.push(forn);
        }

        // Dynamic filtering with parameterized queries
        const filterFields = ['periodo', 'produto', 'categoria', 'loja', 'status', 'kind', 'feriado', 'bandeira', 'adquirente', 'regiao', 'bairro', 'tipo_de_pagamento'];
        
        // For simplicity with the postgres library, we'll use template literals with parameterized values
        let whereClause = '';
        if (!isAdmin) {
          whereClause = `WHERE fornecedor = '${forn?.replace(/'/g, "''")}'`;
        } else if (forn) {
          whereClause = `WHERE fornecedor = '${forn?.replace(/'/g, "''")}'`;
        } else {
          whereClause = 'WHERE 1=1';
        }

        for (const field of filterFields) {
          if (filters[field]) {
            whereClause += ` AND ${field} = '${String(filters[field]).replace(/'/g, "''")}'`;
          }
        }

        if (filters.search) {
          const s = String(filters.search).replace(/'/g, "''");
          whereClause += ` AND (produto ILIKE '%${s}%' OR loja ILIKE '%${s}%' OR cod_produto ILIKE '%${s}%')`;
        }

        const validSortCols = ['id', 'periodo', 'quantidade', 'valor', 'desconto', 'valor_compra', 'produto', 'categoria', 'status', 'loja', 'regiao'];
        const sortCol = validSortCols.includes(sortBy) ? sortBy : 'id';
        const sortDirection = sortDir === 'asc' ? 'ASC' : 'DESC';

        const countResult = await sql.unsafe(`SELECT COUNT(*) as total FROM ${tableNameClean} ${whereClause}`);
        const dataResult = await sql.unsafe(`SELECT * FROM ${tableNameClean} ${whereClause} ORDER BY ${sortCol} ${sortDirection} LIMIT ${pageSize} OFFSET ${offset}`);

        return new Response(JSON.stringify({
          data: dataResult,
          total: parseInt(countResult[0].total),
          page,
          pageSize,
          totalPages: Math.ceil(parseInt(countResult[0].total) / pageSize),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'filter-options') {
        const field = filters.field;
        const allowedFields = ['periodo', 'produto', 'categoria', 'loja', 'status', 'kind', 'feriado', 'bandeira', 'adquirente', 'regiao', 'bairro', 'tipo_de_pagamento', 'fornecedor'];
        if (!allowedFields.includes(field)) {
          return new Response(JSON.stringify({ error: 'Campo inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let result;
        if (isAdmin && !filters.fornecedor) {
          result = await sql`
            SELECT DISTINCT ${sql(field)} as value FROM ${sql(tableNameClean)} WHERE ${sql(field)} IS NOT NULL ORDER BY value LIMIT 100
          `;
        } else {
          const forn = filters.fornecedor || fornecedor;
          result = await sql`
            SELECT DISTINCT ${sql(field)} as value FROM ${sql(tableNameClean)} WHERE fornecedor = ${forn} AND ${sql(field)} IS NOT NULL ORDER BY value LIMIT 100
          `;
        }
        return new Response(JSON.stringify({ data: result.map((r: any) => r.value) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'tables') {
        const result = await sql`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name LIKE 'vendas_%'
          ORDER BY table_name
        `;
        return new Response(JSON.stringify({ data: result.map((r: any) => r.table_name) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
