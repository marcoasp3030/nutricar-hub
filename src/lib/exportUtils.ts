import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportColumn {
  key: string;
  label: string;
  format?: "currency" | "number" | "text";
}

const formatValue = (value: any, format?: string): string => {
  if (value == null || value === "") return "";
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  }
  if (format === "number") {
    return Number(value).toLocaleString("pt-BR");
  }
  return String(value);
};

export function exportToXLSX(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
) {
  if (!data.length) return;

  const wsData = [
    columns.map((c) => c.label),
    ...data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (c.format === "currency" || c.format === "number") return Number(val) || 0;
        return val ?? "";
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-width
  ws["!cols"] = columns.map((c, i) => {
    const maxLen = Math.max(
      c.label.length,
      ...data.map((row) => String(row[c.key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  // Number format for currency columns
  columns.forEach((c, i) => {
    if (c.format === "currency") {
      for (let r = 1; r <= data.length; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
        if (cell) cell.z = '#,##0.00';
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string
) {
  if (!data.length) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  if (title) {
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(title, 14, 15);
  }

  // Date
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, title ? 22 : 15);

  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((c) => formatValue(row[c.key], c.format))
  );

  autoTable(doc, {
    head,
    body,
    startY: title ? 26 : 20,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: [115, 161, 67],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [245, 248, 240] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

// Predefined column configs for reuse
export const REPORT_COLUMNS: ExportColumn[] = [
  { key: "periodo", label: "Período" },
  { key: "produto", label: "Produto" },
  { key: "categoria", label: "Categoria" },
  { key: "kind", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "quantidade", label: "Quantidade", format: "number" },
  { key: "valor", label: "Valor (R$)", format: "currency" },
  { key: "desconto", label: "Desconto (R$)", format: "currency" },
  { key: "loja", label: "Loja" },
  { key: "regiao", label: "Região" },
];

export const PRODUCT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Produto" },
  { key: "quantidade", label: "Quantidade", format: "number" },
  { key: "valor", label: "Valor (R$)", format: "currency" },
  { key: "valor_compra", label: "Custo (R$)", format: "currency" },
  { key: "margem", label: "Margem (R$)", format: "currency" },
  { key: "margem_pct", label: "Margem (%)", format: "number" },
];
