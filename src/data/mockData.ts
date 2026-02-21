// Mock data for the Nutricar Portal

export interface Venda {
  id: number;
  periodo: string;
  kind: string;
  status: string;
  motivo: string;
  quantidade: number;
  valor: number;
  desconto: number;
  requisicao: string;
  valor_compra: number;
  local_interno: string;
  loja: string;
  local: string;
  adquirente: string;
  bandeira: string;
  tipo_de_pagamento: string;
  produto: string;
  fornecedor: string;
  categoria: string;
  cod_produto: string;
  consumidor: string;
  regiao: string;
  bairro: string;
  feriado: string;
}

export const mockVendas: Venda[] = [
  { id: 1, periodo: "2026-01", kind: "Venda", status: "Aprovado", motivo: "", quantidade: 150, valor: 4500.00, desconto: 225.00, requisicao: "REQ-001", valor_compra: 3200.00, local_interno: "CD-01", loja: "Loja Centro", local: "São Paulo", adquirente: "Cielo", bandeira: "Visa", tipo_de_pagamento: "Crédito", produto: "Barra de Cereal Integral", fornecedor: "NutriVida Alimentos", categoria: "Cereais", cod_produto: "NV-001", consumidor: "B2B", regiao: "Sudeste", bairro: "Centro", feriado: "Não" },
  { id: 2, periodo: "2026-01", kind: "Venda", status: "Aprovado", motivo: "", quantidade: 80, valor: 2400.00, desconto: 120.00, requisicao: "REQ-002", valor_compra: 1600.00, local_interno: "CD-01", loja: "Loja Jardins", local: "São Paulo", adquirente: "Rede", bandeira: "Mastercard", tipo_de_pagamento: "Débito", produto: "Granola Premium", fornecedor: "NutriVida Alimentos", categoria: "Cereais", cod_produto: "NV-002", consumidor: "B2C", regiao: "Sudeste", bairro: "Jardins", feriado: "Não" },
  { id: 3, periodo: "2026-01", kind: "Devolução", status: "Pendente", motivo: "Avaria", quantidade: 10, valor: 300.00, desconto: 0, requisicao: "REQ-003", valor_compra: 200.00, local_interno: "CD-02", loja: "Loja Norte", local: "Campinas", adquirente: "Cielo", bandeira: "Elo", tipo_de_pagamento: "Crédito", produto: "Mix de Nuts", fornecedor: "NutriVida Alimentos", categoria: "Snacks", cod_produto: "NV-003", consumidor: "B2C", regiao: "Sudeste", bairro: "Cambuí", feriado: "Não" },
  { id: 4, periodo: "2026-02", kind: "Venda", status: "Aprovado", motivo: "", quantidade: 200, valor: 8000.00, desconto: 400.00, requisicao: "REQ-004", valor_compra: 5500.00, local_interno: "CD-01", loja: "Loja Centro", local: "São Paulo", adquirente: "Stone", bandeira: "Visa", tipo_de_pagamento: "PIX", produto: "Proteína Vegetal", fornecedor: "NutriVida Alimentos", categoria: "Proteínas", cod_produto: "NV-004", consumidor: "B2B", regiao: "Sudeste", bairro: "República", feriado: "Sim" },
  { id: 5, periodo: "2026-02", kind: "Venda", status: "Aprovado", motivo: "", quantidade: 120, valor: 3600.00, desconto: 180.00, requisicao: "REQ-005", valor_compra: 2400.00, local_interno: "CD-03", loja: "Loja Sul", local: "Curitiba", adquirente: "PagSeguro", bandeira: "Mastercard", tipo_de_pagamento: "Crédito", produto: "Barra de Cereal Integral", fornecedor: "NutriVida Alimentos", categoria: "Cereais", cod_produto: "NV-001", consumidor: "B2C", regiao: "Sul", bairro: "Batel", feriado: "Não" },
  { id: 6, periodo: "2026-02", kind: "Venda", status: "Cancelado", motivo: "Duplicidade", quantidade: 50, valor: 1500.00, desconto: 75.00, requisicao: "REQ-006", valor_compra: 1000.00, local_interno: "CD-01", loja: "Loja Oeste", local: "Rio de Janeiro", adquirente: "Cielo", bandeira: "Amex", tipo_de_pagamento: "Crédito", produto: "Chá Funcional", fornecedor: "NutriVida Alimentos", categoria: "Bebidas", cod_produto: "NV-005", consumidor: "B2C", regiao: "Sudeste", bairro: "Copacabana", feriado: "Não" },
  { id: 7, periodo: "2026-01", kind: "Venda", status: "Aprovado", motivo: "", quantidade: 300, valor: 12000.00, desconto: 600.00, requisicao: "REQ-007", valor_compra: 8000.00, local_interno: "CD-02", loja: "Loja Central", local: "Belo Horizonte", adquirente: "Rede", bandeira: "Visa", tipo_de_pagamento: "PIX", produto: "Whey Vegano", fornecedor: "NutriVida Alimentos", categoria: "Proteínas", cod_produto: "NV-006", consumidor: "B2B", regiao: "Sudeste", bairro: "Savassi", feriado: "Não" },
  { id: 8, periodo: "2026-02", kind: "Venda", status: "Aprovado", motivo: "", quantidade: 90, valor: 2700.00, desconto: 135.00, requisicao: "REQ-008", valor_compra: 1800.00, local_interno: "CD-03", loja: "Loja Norte", local: "Fortaleza", adquirente: "Stone", bandeira: "Elo", tipo_de_pagamento: "Débito", produto: "Granola Premium", fornecedor: "NutriVida Alimentos", categoria: "Cereais", cod_produto: "NV-002", consumidor: "B2C", regiao: "Nordeste", bairro: "Aldeota", feriado: "Não" },
];

export const mockKPIs = {
  totalQuantidade: mockVendas.reduce((sum, v) => sum + v.quantidade, 0),
  totalValor: mockVendas.reduce((sum, v) => sum + v.valor, 0),
  totalValorCompra: mockVendas.reduce((sum, v) => sum + v.valor_compra, 0),
  totalDesconto: mockVendas.reduce((sum, v) => sum + v.desconto, 0),
};

export const chartByPeriodo = [
  { name: "Jan/2026", valor: 19200, quantidade: 540 },
  { name: "Fev/2026", valor: 15800, quantidade: 460 },
];

export const chartByCategoria = [
  { name: "Cereais", valor: 10500 },
  { name: "Proteínas", valor: 20000 },
  { name: "Snacks", valor: 300 },
  { name: "Bebidas", valor: 1500 },
];

export const chartByRegiao = [
  { name: "Sudeste", valor: 28800 },
  { name: "Sul", valor: 3600 },
  { name: "Nordeste", valor: 2700 },
];

export const chartByPagamento = [
  { name: "Crédito", valor: 18300 },
  { name: "Débito", valor: 5100 },
  { name: "PIX", valor: 11600 },
];

export const chartByStatus = [
  { name: "Aprovado", valor: 33200, fill: "hsl(87, 48%, 51%)" },
  { name: "Pendente", valor: 300, fill: "hsl(45, 80%, 55%)" },
  { name: "Cancelado", valor: 1500, fill: "hsl(0, 72%, 51%)" },
];
