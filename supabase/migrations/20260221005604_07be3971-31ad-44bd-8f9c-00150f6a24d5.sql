
-- Add is_active column to profiles
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create user_fornecedores table (many-to-many)
CREATE TABLE public.user_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fornecedor text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, fornecedor)
);

-- Enable RLS
ALTER TABLE public.user_fornecedores ENABLE ROW LEVEL SECURITY;

-- Users can view their own fornecedores
CREATE POLICY "Users can view own fornecedores"
ON public.user_fornecedores
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Admins can manage all fornecedores
CREATE POLICY "Admins can manage fornecedores"
ON public.user_fornecedores
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Migrate existing fornecedor data to new table
INSERT INTO public.user_fornecedores (user_id, fornecedor)
SELECT user_id, fornecedor FROM public.profiles
WHERE fornecedor IS NOT NULL AND fornecedor != '';

-- Create helper function to get all fornecedores for a user
CREATE OR REPLACE FUNCTION public.get_user_fornecedores(_user_id uuid)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(fornecedor), ARRAY[]::text[])
  FROM public.user_fornecedores
  WHERE user_id = _user_id
$$;
