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
    const { data: userFornecedores } = await supabase.from('user_fornecedores').select('fornecedor').eq('user_id', userId);
    
    const isAdmin = roles?.some((r: any) => r.role === 'admin') || false;
    const fornecedor = profile?.fornecedor;
    const allUserFornecedores = userFornecedores?.map((f: any) => f.fornecedor) || (fornecedor ? [fornecedor] : []);

    if (!isAdmin && allUserFornecedores.length === 0) {
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
      // Helper to build date clause
      const buildDateClause = (f: Record<string, any>) => {
        let clause = '';
        if (f.dateFrom) clause += ` AND periodo >= '${String(f.dateFrom).replace(/'/g, "''")}'`;
        if (f.dateTo) clause += ` AND periodo <= '${String(f.dateTo).replace(/'/g, "''")}'`;
        return clause;
      };

      // Helper to resolve fornecedor filter — supports single, array (__all__), or default
      const resolveFornecedorClause = (f: Record<string, any>) => {
        // If admin with no filter, show all
        if (isAdmin && !f.fornecedor) return '';
        
        // Unified mode: user selected "__all__" — use all their fornecedores
        if (f.fornecedor === '__all__' && allUserFornecedores.length > 0) {
          const escaped = allUserFornecedores.map((s: string) => `'${s.replace(/'/g, "''")}'`).join(',');
          return `fornecedor IN (${escaped})`;
        }

        // Single fornecedor
        const forn = f.fornecedor || fornecedor;
        if (!forn) return '';
        return `fornecedor = '${String(forn).replace(/'/g, "''")}'`;
      };

      if (action === 'dashboard') {
        const dateClause = buildDateClause(filters);
        const groupByExtra = filters.groupBy || 'categoria';
        const fornClause = resolveFornecedorClause(filters);
        const whereClause = fornClause
          ? `WHERE ${fornClause} AND status = 'OK'${dateClause}`
          : `WHERE status = 'OK'${dateClause}`;

        const buildGroupQuery = (col: string, limit = 20) =>
          `SELECT ${col} as name, COALESCE(SUM(valor::numeric),0) as valor, COALESCE(SUM(quantidade::numeric),0) as quantidade FROM ${tableNameClean} ${whereClause} GROUP BY ${col} ORDER BY valor DESC LIMIT ${limit}`;

        // Period KPI queries
        const periodKpiSelect = `COALESCE(SUM(valor::numeric),0) as valor, COALESCE(SUM(quantidade::numeric),0) as quantidade, COUNT(*) as registros`;
        const baseWhere = whereClause;
        const todayFilter = `${baseWhere} AND periodo::date = CURRENT_DATE`;
        const last7Filter = `${baseWhere} AND periodo::date >= CURRENT_DATE - INTERVAL '6 days'`;
        const currentMonthFilter = `${baseWhere} AND DATE_TRUNC('month', periodo::date) = DATE_TRUNC('month', CURRENT_DATE)`;
        const prevMonthFilter = `${baseWhere} AND DATE_TRUNC('month', periodo::date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')`;

        const [kpis, periodo, pagamento, bairro, bandeira, extra, kpiHoje, kpi7dias, kpiMesAtual, kpiMesAnterior] = await Promise.all([
          sql.unsafe(`SELECT COALESCE(SUM(quantidade::numeric),0) as total_quantidade, COALESCE(SUM(valor::numeric),0) as total_valor, COALESCE(SUM(valor_compra::numeric),0) as total_valor_compra, COALESCE(SUM(desconto::numeric),0) as total_desconto, COUNT(*) as total_registros FROM ${tableNameClean} ${whereClause}`),
          sql.unsafe(buildGroupQuery('periodo')),
          sql.unsafe(buildGroupQuery('tipo_de_pagamento')),
          sql.unsafe(buildGroupQuery('bairro', 10)),
          sql.unsafe(buildGroupQuery('bandeira')),
          sql.unsafe(buildGroupQuery(groupByExtra)),
          sql.unsafe(`SELECT ${periodKpiSelect} FROM ${tableNameClean} ${todayFilter}`),
          sql.unsafe(`SELECT ${periodKpiSelect} FROM ${tableNameClean} ${last7Filter}`),
          sql.unsafe(`SELECT ${periodKpiSelect} FROM ${tableNameClean} ${currentMonthFilter}`),
          sql.unsafe(`SELECT ${periodKpiSelect} FROM ${tableNameClean} ${prevMonthFilter}`),
        ]);

        return new Response(JSON.stringify({
          data: {
            kpis: kpis[0], periodo, status: [], pagamento, bairro, bandeira, extra,
            periodKpis: {
              hoje: kpiHoje[0],
              ultimos7dias: kpi7dias[0],
              mesAtual: kpiMesAtual[0],
              mesAnterior: kpiMesAnterior[0],
            }
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'produtos') {
        const dateClause = buildDateClause(filters);
        const fornClause = resolveFornecedorClause(filters);
        const whereClause = fornClause
          ? `WHERE ${fornClause} ${dateClause}`
          : `WHERE 1=1${dateClause}`;

        const statusOk = ` AND status = 'OK'`;
        const whereOk = whereClause + statusOk;

        const [topVenda, menosVenda, porHora, porCategoria, margemProduto, porDiaSemana, totalProdutos, categoriaPorHora, topPorCategoria] = await Promise.all([
          sql.unsafe(`SELECT produto as name, COALESCE(SUM(quantidade::numeric),0) as quantidade, COALESCE(SUM(valor::numeric),0) as valor, COALESCE(SUM(valor_compra::numeric),0) as valor_compra FROM ${tableNameClean} ${whereOk} GROUP BY produto ORDER BY quantidade DESC LIMIT 15`),
          sql.unsafe(`SELECT produto as name, COALESCE(SUM(quantidade::numeric),0) as quantidade, COALESCE(SUM(valor::numeric),0) as valor FROM ${tableNameClean} ${whereOk} GROUP BY produto HAVING SUM(quantidade::numeric) > 0 ORDER BY quantidade ASC LIMIT 15`),
          sql.unsafe(`SELECT EXTRACT(HOUR FROM periodo::timestamp) as hora, COALESCE(SUM(quantidade::numeric),0) as quantidade, COALESCE(SUM(valor::numeric),0) as valor, COUNT(DISTINCT produto) as produtos_distintos FROM ${tableNameClean} ${whereOk} GROUP BY hora ORDER BY hora`),
          sql.unsafe(`SELECT categoria as name, COUNT(DISTINCT produto) as total_produtos, COALESCE(SUM(quantidade::numeric),0) as quantidade, COALESCE(SUM(valor::numeric),0) as valor, COALESCE(SUM(valor_compra::numeric),0) as valor_compra, COALESCE(SUM(valor::numeric) - SUM(valor_compra::numeric),0) as margem FROM ${tableNameClean} ${whereOk} GROUP BY categoria ORDER BY valor DESC LIMIT 10`),
          sql.unsafe(`SELECT produto as name, COALESCE(SUM(valor::numeric),0) as valor, COALESCE(SUM(valor_compra::numeric),0) as valor_compra, COALESCE(SUM(valor::numeric) - SUM(valor_compra::numeric),0) as margem, CASE WHEN SUM(valor::numeric) > 0 THEN ROUND(((SUM(valor::numeric) - SUM(valor_compra::numeric)) / SUM(valor::numeric)) * 100, 1) ELSE 0 END as margem_pct FROM ${tableNameClean} ${whereOk} GROUP BY produto HAVING SUM(valor::numeric) > 0 ORDER BY margem DESC LIMIT 15`),
          sql.unsafe(`SELECT EXTRACT(DOW FROM periodo::timestamp) as dia, COALESCE(SUM(quantidade::numeric),0) as quantidade, COALESCE(SUM(valor::numeric),0) as valor FROM ${tableNameClean} ${whereOk} GROUP BY dia ORDER BY dia`),
          sql.unsafe(`SELECT COUNT(DISTINCT produto) as total FROM ${tableNameClean} ${whereOk}`),
          // Vendas por categoria × hora
          sql.unsafe(`SELECT categoria, EXTRACT(HOUR FROM periodo::timestamp) as hora, COALESCE(SUM(quantidade::numeric),0) as quantidade FROM ${tableNameClean} ${whereOk} GROUP BY categoria, hora ORDER BY categoria, hora`),
          // Top 5 produtos por cada categoria (top 5 categorias)
          sql.unsafe(`WITH ranked AS (SELECT categoria, produto as name, SUM(quantidade::numeric) as quantidade, SUM(valor::numeric) as valor, ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY SUM(quantidade::numeric) DESC) as rn FROM ${tableNameClean} ${whereOk} GROUP BY categoria, produto) SELECT * FROM ranked WHERE rn <= 5 ORDER BY categoria, rn`),
        ]);

        return new Response(JSON.stringify({
          data: { topVenda, menosVenda, porHora, porCategoria, margemProduto, porDiaSemana, totalProdutos: totalProdutos[0]?.total || 0, categoriaPorHora, topPorCategoria }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'kpis') {
        const dateClause = buildDateClause(filters);
        const fornClause = resolveFornecedorClause(filters);
        const whereClause = fornClause
          ? `WHERE ${fornClause} ${dateClause}`
          : `WHERE 1=1${dateClause}`;
        const result = await sql.unsafe(`
          SELECT 
            COALESCE(SUM(quantidade::numeric), 0) as total_quantidade,
            COALESCE(SUM(valor::numeric), 0) as total_valor,
            COALESCE(SUM(valor_compra::numeric), 0) as total_valor_compra,
            COALESCE(SUM(desconto::numeric), 0) as total_desconto,
            COUNT(*) as total_registros
          FROM ${tableNameClean} ${whereClause}
        `);
        return new Response(JSON.stringify({ data: result[0] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'chart') {
        const groupBy = filters.groupBy || 'periodo';
        const allowedGroupBy = ['periodo', 'produto', 'categoria', 'regiao', 'bairro', 'tipo_de_pagamento', 'status', 'bandeira', 'loja'];
        if (!allowedGroupBy.includes(groupBy)) {
          return new Response(JSON.stringify({ error: 'Agrupamento inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const dateClause = buildDateClause(filters);
        const fornClause = resolveFornecedorClause(filters);
        const whereClause = fornClause
          ? `WHERE ${fornClause} ${dateClause}`
          : `WHERE 1=1${dateClause}`;

        const result = await sql.unsafe(`
          SELECT ${groupBy} as name,
            COALESCE(SUM(valor::numeric), 0) as valor,
            COALESCE(SUM(quantidade::numeric), 0) as quantidade
          FROM ${tableNameClean} ${whereClause}
          GROUP BY ${groupBy}
          ORDER BY valor DESC
          LIMIT 20
        `);
        return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'list') {
        const offset = (page - 1) * pageSize;
        
        const fornClause = resolveFornecedorClause(filters);
        let whereClause = fornClause ? `WHERE ${fornClause}` : 'WHERE 1=1';

        for (const field of filterFields) {
          if (filters[field]) {
            whereClause += ` AND ${field} = '${String(filters[field]).replace(/'/g, "''")}'`;
          }
        }

        if (filters.search) {
          const s = String(filters.search).replace(/'/g, "''");
          whereClause += ` AND (produto ILIKE '%${s}%' OR loja ILIKE '%${s}%' OR cod_produto ILIKE '%${s}%')`;
        }

        whereClause += buildDateClause(filters);

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
        const allTables = result.map((r: any) => r.table_name);

        // If admin without fornecedor filter, return all tables
        if (isAdmin && !filters.fornecedor) {
          return new Response(JSON.stringify({ data: allTables }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // For fornecedor users, filter by permissions in fornecedor_tables
        const forn = filters.fornecedor || fornecedor;
        const { data: allowedTables } = await supabase
          .from('fornecedor_tables')
          .select('table_name')
          .eq('fornecedor', forn);

        if (allowedTables && allowedTables.length > 0) {
          const allowed = allowedTables.map((t: any) => t.table_name);
          const filtered = allTables.filter((t: string) => allowed.includes(t));
          return new Response(JSON.stringify({ data: filtered }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // If no permissions set, return all tables (backwards compatible)
        return new Response(JSON.stringify({ data: allTables }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
