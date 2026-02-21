import { useState, useMemo } from "react";
import { mockVendas, Venda } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Download, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const PAGE_SIZE = 10;

const ReportsPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return mockVendas.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (kindFilter !== "all" && v.kind !== kindFilter) return false;
      if (categoriaFilter !== "all" && v.categoria !== categoriaFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          v.produto.toLowerCase().includes(s) ||
          v.loja.toLowerCase().includes(s) ||
          v.cod_produto.toLowerCase().includes(s) ||
          v.regiao.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [search, statusFilter, kindFilter, categoriaFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const uniqueValues = (key: keyof Venda) =>
    [...new Set(mockVendas.map((v) => String(v[key])))];

  const exportCSV = () => {
    const headers = ["Período", "Produto", "Categoria", "Status", "Kind", "Qtd", "Valor", "Desconto", "Loja", "Região"];
    const rows = filtered.map((v) => [v.periodo, v.produto, v.categoria, v.status, v.kind, v.quantidade, v.valor, v.desconto, v.loja, v.regiao]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_nutricar.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} registros encontrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros Avançados</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <FilterControls
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  kindFilter={kindFilter} setKindFilter={setKindFilter}
                  categoriaFilter={categoriaFilter} setCategoriaFilter={setCategoriaFilter}
                  uniqueValues={uniqueValues}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters bar for desktop */}
      <Card className="hidden border-0 shadow-sm lg:block">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Produto, loja, código, região..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>
          <FilterControls
            statusFilter={statusFilter} setStatusFilter={(v) => { setStatusFilter(v); setPage(1); }}
            kindFilter={kindFilter} setKindFilter={(v) => { setKindFilter(v); setPage(1); }}
            categoriaFilter={categoriaFilter} setCategoriaFilter={(v) => { setCategoriaFilter(v); setPage(1); }}
            uniqueValues={uniqueValues}
          />
        </CardContent>
      </Card>

      {/* Mobile search */}
      <div className="lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Período</TableHead>
                <TableHead className="text-xs">Produto</TableHead>
                <TableHead className="text-xs">Categoria</TableHead>
                <TableHead className="text-xs">Kind</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Qtd</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs text-right">Desconto</TableHead>
                <TableHead className="text-xs">Loja</TableHead>
                <TableHead className="text-xs">Região</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((v) => (
                <TableRow key={v.id} className="text-sm">
                  <TableCell className="whitespace-nowrap">{v.periodo}</TableCell>
                  <TableCell className="max-w-[180px] truncate font-medium">{v.produto}</TableCell>
                  <TableCell>{v.categoria}</TableCell>
                  <TableCell>{v.kind}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.status === "Aprovado" ? "bg-accent text-accent-foreground" :
                      v.status === "Pendente" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {v.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{v.quantidade}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(v.valor)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(v.desconto)}</TableCell>
                  <TableCell>{v.loja}</TableCell>
                  <TableCell>{v.regiao}</TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

interface FilterControlsProps {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  kindFilter: string;
  setKindFilter: (v: string) => void;
  categoriaFilter: string;
  setCategoriaFilter: (v: string) => void;
  uniqueValues: (key: keyof Venda) => string[];
}

const FilterControls = ({
  statusFilter, setStatusFilter,
  kindFilter, setKindFilter,
  categoriaFilter, setCategoriaFilter,
  uniqueValues,
}: FilterControlsProps) => (
  <>
    <div className="w-full lg:w-36">
      <Label className="text-xs text-muted-foreground">Status</Label>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {uniqueValues("status").map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="w-full lg:w-36">
      <Label className="text-xs text-muted-foreground">Tipo</Label>
      <Select value={kindFilter} onValueChange={setKindFilter}>
        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {uniqueValues("kind").map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="w-full lg:w-40">
      <Label className="text-xs text-muted-foreground">Categoria</Label>
      <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {uniqueValues("categoria").map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </>
);

export default ReportsPage;
