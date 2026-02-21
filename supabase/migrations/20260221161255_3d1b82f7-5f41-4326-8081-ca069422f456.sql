
-- Table to store LGPD document contents (terms and privacy policy)
CREATE TABLE public.lgpd_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'terms' or 'privacy'
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.lgpd_documents ENABLE ROW LEVEL SECURITY;

-- Everyone can view active documents
CREATE POLICY "Anyone can view active documents"
ON public.lgpd_documents FOR SELECT
USING (is_active = true);

-- Admins can manage all documents
CREATE POLICY "Admins can manage documents"
ON public.lgpd_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default documents
INSERT INTO public.lgpd_documents (type, title, content, version) VALUES
('terms', 'Termos de Uso', E'# Termos de Uso\n\nBem-vindo ao Portal do Fornecedor Nutricar.\n\n## 1. Aceitação dos Termos\n\nAo acessar e utilizar este portal, você concorda com estes Termos de Uso.\n\n## 2. Uso do Portal\n\nO portal é destinado exclusivamente a fornecedores autorizados da Nutricar Brasil para consulta de dados de vendas e gestão de mídia.\n\n## 3. Responsabilidades do Usuário\n\n- Manter a confidencialidade das credenciais de acesso\n- Utilizar os dados apenas para fins comerciais autorizados\n- Não compartilhar informações com terceiros sem autorização\n\n## 4. Propriedade Intelectual\n\nTodo o conteúdo do portal é de propriedade da Nutricar Brasil.\n\n## 5. Alterações\n\nEstes termos podem ser atualizados a qualquer momento. O uso continuado do portal constitui aceitação das alterações.', '1.0'),
('privacy', 'Política de Privacidade', E'# Política de Privacidade\n\nEsta política descreve como tratamos seus dados pessoais conforme a LGPD (Lei nº 13.709/2018).\n\n## 1. Dados Coletados\n\n- **Dados cadastrais:** Nome/Razão Social, CNPJ, e-mail, telefone\n- **Dados de acesso:** Logs de login, endereço IP\n- **Dados de uso:** Interações com o portal\n\n## 2. Finalidade do Tratamento\n\n- Autenticação e controle de acesso\n- Exibição de relatórios de vendas\n- Comunicação sobre contratos de publicidade\n- Cumprimento de obrigações legais\n\n## 3. Base Legal\n\nO tratamento dos dados é realizado com base no consentimento do titular e na execução de contrato.\n\n## 4. Compartilhamento\n\nSeus dados não são compartilhados com terceiros, exceto quando exigido por lei.\n\n## 5. Seus Direitos\n\nVocê pode solicitar:\n- Acesso aos seus dados\n- Correção de dados incompletos ou incorretos\n- Exclusão de dados pessoais\n- Revogação do consentimento\n\n## 6. Contato\n\nPara exercer seus direitos, utilize a opção "Meus Dados" no portal ou entre em contato pelo e-mail: lgpd@nutricarbrasil.com.br', '1.0');

-- Trigger for updated_at
CREATE TRIGGER update_lgpd_documents_updated_at
BEFORE UPDATE ON public.lgpd_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
