
-- Table to control which databases (vendas tables) each fornecedor can access
CREATE TABLE public.fornecedor_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor text NOT NULL,
  table_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(fornecedor, table_name)
);

-- Enable RLS
ALTER TABLE public.fornecedor_tables ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage
CREATE POLICY "Admins can manage fornecedor_tables"
  ON public.fornecedor_tables
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fornecedor users can view their own permissions
CREATE POLICY "Users can view own fornecedor_tables"
  ON public.fornecedor_tables
  FOR SELECT
  USING (
    fornecedor IN (
      SELECT uf.fornecedor FROM public.user_fornecedores uf WHERE uf.user_id = auth.uid()
    )
  );
