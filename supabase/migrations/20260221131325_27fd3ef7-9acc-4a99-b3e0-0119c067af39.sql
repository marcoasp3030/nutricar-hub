-- Status change history for ad_contracts
CREATE TABLE public.ad_contract_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.ad_contracts(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_contract_history ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage contract history"
ON public.ad_contract_history
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fornecedores can view history of their own contracts
CREATE POLICY "Fornecedores can view own contract history"
ON public.ad_contract_history
FOR SELECT
TO authenticated
USING (
  contract_id IN (
    SELECT c.id FROM ad_contracts c
    WHERE c.fornecedor IN (
      SELECT uf.fornecedor FROM user_fornecedores uf WHERE uf.user_id = auth.uid()
    )
  )
);

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_contract_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ad_contract_history (contract_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ad_contract_history (contract_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contract_status_history
AFTER INSERT OR UPDATE ON public.ad_contracts
FOR EACH ROW
EXECUTE FUNCTION public.log_contract_status_change();