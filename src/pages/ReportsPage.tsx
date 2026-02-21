import { useState, useEffect, useCallback } from "react";
import { queryVendas } from "@/lib/api";
import { exportToXLSX, exportToPDF, REPORT_COLUMNS } from "@/lib/exportUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Download, Filter, Search, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, FileSpreadsheet, FileText } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface ReportsPageProps {
  tableName: string;
  fornecedor: string;
}

const ReportsPage = ({ tableName, fornecedor }: ReportsPageProps) => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});

  const filterFields = ['status', 'kind', 'categoria', 'periodo', 'loja', 'bandeira', 'adquirente', 'regiao', 'feriado', 'tipo_de_pagamento'];

  // Load filter options
  useEffect(() => {
    filterFields.forEach(field => {
      queryVendas({ action: 'filter-options', filters: { field, fornecedor }, tableName })
        .then(res => setFilterOptions(prev => ({ ...prev, [field]: res.data || [] })))
        .catch(console.error);
    });
  }, [tableName, fornecedor]);

  const fetchData = useCallback(() => {
    setLoading(true);
    queryVendas({
      action: 'list',
      filters: { ...filters, search, fornecedor },
      page,
      pageSize: 25,
      sortBy,
      sortDir,
      tableName,
    }).then(res => {
      setData(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, [filters, search, page, sortBy, sortDir, tableName, fornecedor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  const setFilter = (key: string, value: string) => {
    setFilters(prev => {
      if (value === 'all') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => String(r[h] ?? '')));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_nutricar_${tableName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [exporting, setExporting] = useState(false);

  const exportAllData = async (format: "xlsx" | "pdf") => {
    setExporting(true);
    try {
      // Fetch all data (up to 5000 rows) for export
      const res = await queryVendas({
        action: "list",
        filters: { ...filters, search },
        page: 1,
        pageSize: 5000,
        sortBy,
        sortDir,
        tableName,
      });
      const allData = res.data || [];
      const filename = `relatorio_nutricar_${tableName}`;
      if (format === "xlsx") {
        exportToXLSX(allData, REPORT_COLUMNS, filename);
      } else {
        exportToPDF(allData, REPORT_COLUMNS, filename, `Relatório — ${tableName.replace("vendas_", "Vendas ")}`);
      }
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  };

  const formatPeriodo = (val: string) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch { return val; }
  };

  const columns = ['periodo', 'produto', 'categoria', 'quantidade', 'valor', 'regiao'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString("pt-BR")} registros encontrados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportAllData("xlsx")} disabled={exporting} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAllData("pdf")} disabled={exporting} className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader><SheetTitle>Filtros Avançados</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3">
                {filterFields.map(field => (
                  <div key={field}>
                    <Label className="text-xs text-muted-foreground capitalize">{field.replace(/_/g, ' ')}</Label>
                    <Select value={filters[field] || 'all'} onValueChange={v => setFilter(field, v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {(filterOptions[field] || []).map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => { setFilters({}); setPage(1); }} className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produto, código, região..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>

      <Card className="border shadow-sm overflow-hidden rounded-xl">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {columns.map(col => (
                      <TableHead key={col} className="text-xs font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(col)}>
                        <span className="inline-flex items-center gap-1 capitalize">
                          {col === 'periodo' ? 'Período' : col === 'quantidade' ? 'Qtd.' : col === 'regiao' ? 'Região' : col.replace(/_/g, ' ')}
                          {sortBy === col && <ArrowUpDown className="h-3 w-3 text-primary" />}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i} className="text-sm hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatPeriodo(row.periodo)}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{row.produto}</TableCell>
                      <TableCell className="text-muted-foreground">{row.categoria}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(row.quantidade).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">{formatCurrency(Number(row.valor))}</TableCell>
                      <TableCell className="text-muted-foreground">{row.regiao}</TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default ReportsPage;
