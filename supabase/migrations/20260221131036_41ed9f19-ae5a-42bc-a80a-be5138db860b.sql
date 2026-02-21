-- Allow fornecedores to insert contract requests (status defaults to 'pending')
CREATE POLICY "Fornecedores can request contracts"
ON public.ad_contracts
FOR INSERT
TO authenticated
WITH CHECK (
  fornecedor IN (
    SELECT uf.fornecedor FROM user_fornecedores uf WHERE uf.user_id = auth.uid()
  )
  AND status = 'pending'
);