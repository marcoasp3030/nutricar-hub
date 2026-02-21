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
}

const ReportsPage = ({ tableName }: ReportsPageProps) => {
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
      queryVendas({ action: 'filter-options', filters: { field }, tableName })
        .then(res => setFilterOptions(prev => ({ ...prev, [field]: res.data || [] })))
        .catch(console.error);
    });
  }, [tableName]);

  const fetchData = useCallback(() => {
    setLoading(true);
    queryVendas({
      action: 'list',
      filters: { ...filters, search },
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
  }, [filters, search, page, sortBy, sortDir, tableName]);

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

  const columns = ['periodo', 'produto', 'categoria', 'kind', 'status', 'quantidade', 'valor', 'desconto', 'loja', 'regiao'];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString("pt-BR")} registros</p>
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
          placeholder="Buscar produto, loja, código..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {columns.map(col => (
                      <TableHead key={col} className="text-xs cursor-pointer select-none" onClick={() => handleSort(col)}>
                        <span className="inline-flex items-center gap-1 capitalize">
                          {col.replace(/_/g, ' ')}
                          {sortBy === col && <ArrowUpDown className="h-3 w-3" />}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i} className="text-sm">
                      <TableCell className="whitespace-nowrap">{row.periodo}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{row.produto}</TableCell>
                      <TableCell>{row.categoria}</TableCell>
                      <TableCell>{row.kind}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === 'Aprovado' || row.status === 'aprovado' ? 'bg-accent text-accent-foreground' :
                          row.status === 'Pendente' || row.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>{row.status}</span>
                      </TableCell>
                      <TableCell className="text-right">{Number(row.quantidade).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(Number(row.valor))}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(Number(row.desconto))}</TableCell>
                      <TableCell>{row.loja}</TableCell>
                      <TableCell>{row.regiao}</TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-3">
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
