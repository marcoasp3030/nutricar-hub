
-- Pacotes/planos de publicidade em TV
CREATE TABLE public.ad_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  monthly_value numeric(10,2) NOT NULL DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 1,
  display_frequency text NOT NULL DEFAULT '30s a cada 5 min',
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad_packages" ON public.ad_packages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view active packages" ON public.ad_packages FOR SELECT
  TO authenticated USING (is_active = true);

-- Contratos de fornecedores
CREATE TABLE public.ad_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor text NOT NULL,
  package_id uuid NOT NULL REFERENCES public.ad_packages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled','expired')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad_contracts" ON public.ad_contracts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Fornecedores can view own contracts" ON public.ad_contracts FOR SELECT
  TO authenticated
  USING (fornecedor IN (
    SELECT uf.fornecedor FROM public.user_fornecedores uf WHERE uf.user_id = auth.uid()
  ));

-- Pagamentos
CREATE TABLE public.ad_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ad_contracts(id) ON DELETE CASCADE,
  month_ref text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad_payments" ON public.ad_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Fornecedores can view own payments" ON public.ad_payments FOR SELECT
  TO authenticated
  USING (contract_id IN (
    SELECT c.id FROM public.ad_contracts c
    WHERE c.fornecedor IN (
      SELECT uf.fornecedor FROM public.user_fornecedores uf WHERE uf.user_id = auth.uid()
    )
  ));

-- Triggers para updated_at
CREATE TRIGGER update_ad_packages_updated_at BEFORE UPDATE ON public.ad_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_contracts_updated_at BEFORE UPDATE ON public.ad_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
