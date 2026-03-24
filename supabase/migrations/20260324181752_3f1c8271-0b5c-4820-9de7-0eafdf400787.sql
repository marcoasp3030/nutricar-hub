
CREATE TABLE public.ad_package_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE CASCADE,
  fornecedor text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (package_id, fornecedor)
);

ALTER TABLE public.ad_package_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad_package_fornecedores"
  ON public.ad_package_fornecedores
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Fornecedores can view own package assignments"
  ON public.ad_package_fornecedores
  FOR SELECT
  TO authenticated
  USING (fornecedor IN (
    SELECT uf.fornecedor FROM user_fornecedores uf WHERE uf.user_id = auth.uid()
  ));
