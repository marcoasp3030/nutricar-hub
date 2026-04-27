-- Add cancellation request fields to ad_contracts
ALTER TABLE public.ad_contracts
  ADD COLUMN IF NOT EXISTS cancellation_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamp with time zone;

-- Allow fornecedores to request cancellation on their own contracts
-- (can only set cancellation_requested = true; admins handle approval)
CREATE POLICY "Fornecedores can request cancellation"
ON public.ad_contracts
FOR UPDATE
TO authenticated
USING (
  fornecedor IN (
    SELECT uf.fornecedor FROM public.user_fornecedores uf
    WHERE uf.user_id = auth.uid()
  )
)
WITH CHECK (
  fornecedor IN (
    SELECT uf.fornecedor FROM public.user_fornecedores uf
    WHERE uf.user_id = auth.uid()
  )
  AND cancellation_requested = true
  AND status IN ('pending', 'active')
);