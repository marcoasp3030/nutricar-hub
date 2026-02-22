import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Store, Monitor, MonitorSmartphone, MonitorPlay, MapPin, Search,
  Download, FileSpreadsheet, FileText, StickyNote, ChevronDown, ChevronUp, Tv, Wifi, WifiOff,
  Activity, Clock,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToXLSX, exportToPDF } from "@/lib/exportUtils";
import type { ExportColumn } from "@/lib/exportUtils";

type PlaylistOption = { id: string; name: string };

type StoreTv = {
  id: string;
  store_name: string;
  tv_quantity: number;
  tv_format: string;
  tv_model: string | null;
  tv_inches: number | null;
  playlist_id: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type TvUnit = {
  id: string;
  store_id: string;
  label: string;
  tv_format: string;
  tv_model: string | null;
  tv_inches: number | null;
  playlist_id: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  notes: string | null;
};

const emptyStoreForm = {
  store_name: "",
  tv_quantity: 1,
  tv_format: "horizontal",
  tv_model: "",
  tv_inches: "",
  playlist_id: "__none__",
  city: "",
  address: "",
  notes: "",
};

const emptyUnitForm = {
  label: "",
  tv_format: "horizontal",
  tv_model: "",
  tv_inches: "",
  playlist_id: "__none__",
  notes: "",
};

const STORE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "store_name", label: "Loja" },
  { key: "city", label: "Cidade" },
  { key: "address", label: "Endereço" },
  { key: "tv_quantity", label: "Qtd TVs", format: "number" },
  { key: "tv_format", label: "Formato" },
  { key: "tv_model", label: "Modelo" },
  { key: "tv_inches", label: "Polegadas" },
  { key: "playlist_name", label: "Playlist" },
  { key: "notes", label: "Observações" },
];

const AdminStoresPage = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreTv[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("__all__");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyStoreForm);

  // TV Units state
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, TvUnit[]>>({});
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitStoreId, setUnitStoreId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);

  const [onlineCount, setOnlineCount] = useState({ online: 0, total: 0 });
  const prevStatusRef = useRef<Record<string, boolean>>({});
  const [connectivityLog, setConnectivityLog] = useState<{ id: string; unit_label: string; status: string; created_at: string }[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const loadData = async () => {
    const [storesRes, playlistsRes, unitsRes] = await Promise.all([
      supabase.from("store_tvs").select("*").order("store_name"),
      supabase.from("playlists").select("id, name").order("name"),
      supabase.from("store_tv_units").select("id, is_online, label, store_id"),
    ]);
    if (storesRes.data) setStores(storesRes.data as StoreTv[]);
    if (playlistsRes.data) setPlaylists(playlistsRes.data as PlaylistOption[]);
    if (unitsRes.data) {
      setOnlineCount({ online: unitsRes.data.filter(u => u.is_online).length, total: unitsRes.data.length });
      const statusMap: Record<string, boolean> = {};
      unitsRes.data.forEach(u => { statusMap[u.id] = u.is_online; });
      prevStatusRef.current = statusMap;
    }
    setLoading(false);
  };

  const loadUnits = async (storeId: string) => {
    const { data } = await supabase
      .from("store_tv_units")
      .select("*")
      .eq("store_id", storeId)
      .order("label");
    if (data) setUnits(prev => ({ ...prev, [storeId]: data as TvUnit[] }));
  };

  const loadConnectivityLog = async () => {
    const { data } = await supabase
      .from("tv_connectivity_log")
      .select("id, unit_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data) return;
    // Enrich with unit labels
    const unitIds = [...new Set(data.map(d => d.unit_id))];
    const { data: unitsData } = await supabase
      .from("store_tv_units")
      .select("id, label")
      .in("id", unitIds);
    const labelMap: Record<string, string> = {};
    unitsData?.forEach(u => { labelMap[u.id] = u.label; });
    setConnectivityLog(data.map(d => ({
      id: d.id,
      unit_label: labelMap[d.unit_id] || "TV desconhecida",
      status: d.status,
      created_at: d.created_at,
    })));
  };

  // Refresh online status + toast on changes
  const refreshOnlineStatus = async () => {
    const { data } = await supabase.from("store_tv_units").select("id, is_online, label, store_id");
    if (!data) return;
    setOnlineCount({ online: data.filter(u => u.is_online).length, total: data.length });

    const prev = prevStatusRef.current;
    const wentOffline: string[] = [];
    const wentOnline: string[] = [];
    data.forEach(u => {
      if (prev[u.id] !== undefined) {
        if (prev[u.id] && !u.is_online) wentOffline.push(u.label);
        if (!prev[u.id] && u.is_online) wentOnline.push(u.label);
      }
    });
    if (wentOffline.length > 0) {
      toast({ title: "📴 TV ficou offline", description: wentOffline.join(", "), variant: "destructive" });
    }
    if (wentOnline.length > 0) {
      toast({ title: "📡 TV ficou online", description: wentOnline.join(", ") });
    }

    const statusMap: Record<string, boolean> = {};
    data.forEach(u => { statusMap[u.id] = u.is_online; });
    prevStatusRef.current = statusMap;

    if (expandedStore) {
      const storeUnits = data.filter(u => u.store_id === expandedStore);
      if (storeUnits.length > 0) loadUnits(expandedStore);
    }

    if (timelineOpen) loadConnectivityLog();
  };

  useEffect(() => { loadData(); }, []);

  // Load timeline when opened
  useEffect(() => {
    if (timelineOpen) loadConnectivityLog();
  }, [timelineOpen]);

  // Auto-refresh online status every 30s
  useEffect(() => {
    const interval = setInterval(refreshOnlineStatus, 30_000);
    return () => clearInterval(interval);
  }, [expandedStore, timelineOpen]);

  const toggleExpand = (storeId: string) => {
    if (expandedStore === storeId) {
      setExpandedStore(null);
    } else {
      setExpandedStore(storeId);
      if (!units[storeId]) loadUnits(storeId);
    }
  };

  const getPlaylistName = (id: string | null) => {
    if (!id) return null;
    return playlists.find(p => p.id === id)?.name || null;
  };

  // Store CRUD
  const openNew = () => { setEditingId(null); setForm(emptyStoreForm); setDialogOpen(true); };
  const openEdit = (s: StoreTv) => {
    setEditingId(s.id);
    setForm({
      store_name: s.store_name, tv_quantity: s.tv_quantity, tv_format: s.tv_format,
      tv_model: s.tv_model || "", tv_inches: s.tv_inches?.toString() || "",
      playlist_id: s.playlist_id || "__none__", city: s.city || "", address: s.address || "",
      notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.store_name.trim()) { toast({ title: "Nome da loja é obrigatório", variant: "destructive" }); return; }
    if (form.tv_quantity < 1) { toast({ title: "Quantidade deve ser pelo menos 1", variant: "destructive" }); return; }
    const payload = {
      store_name: form.store_name.trim(), tv_quantity: form.tv_quantity, tv_format: form.tv_format,
      tv_model: form.tv_model.trim() || null, tv_inches: form.tv_inches ? parseInt(form.tv_inches) : null,
      playlist_id: form.playlist_id === "__none__" ? null : form.playlist_id,
      city: form.city.trim() || null, address: form.address.trim() || null, notes: form.notes.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from("store_tvs").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Loja atualizada com sucesso" });
    } else {
      const { error } = await supabase.from("store_tvs").insert(payload);
      if (error) { toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Loja cadastrada com sucesso" });
    }
    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("store_tvs").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Loja removida" });
    if (expandedStore === id) setExpandedStore(null);
    loadData();
  };

  // TV Unit CRUD
  const openNewUnit = (storeId: string) => {
    const storeUnits = units[storeId] || [];
    setUnitStoreId(storeId);
    setEditingUnitId(null);
    setUnitForm({ ...emptyUnitForm, label: `TV ${storeUnits.length + 1}` });
    setUnitDialogOpen(true);
  };

  const openEditUnit = (u: TvUnit) => {
    setUnitStoreId(u.store_id);
    setEditingUnitId(u.id);
    setUnitForm({
      label: u.label, tv_format: u.tv_format, tv_model: u.tv_model || "",
      tv_inches: u.tv_inches?.toString() || "", playlist_id: u.playlist_id || "__none__",
      notes: u.notes || "",
    });
    setUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitStoreId || !unitForm.label.trim()) {
      toast({ title: "Nome da TV é obrigatório", variant: "destructive" }); return;
    }
    const payload = {
      store_id: unitStoreId,
      label: unitForm.label.trim(), tv_format: unitForm.tv_format,
      tv_model: unitForm.tv_model.trim() || null, tv_inches: unitForm.tv_inches ? parseInt(unitForm.tv_inches) : null,
      playlist_id: unitForm.playlist_id === "__none__" ? null : unitForm.playlist_id,
      notes: unitForm.notes.trim() || null,
    };
    if (editingUnitId) {
      const { error } = await supabase.from("store_tv_units").update(payload).eq("id", editingUnitId);
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "TV atualizada" });
    } else {
      const { error } = await supabase.from("store_tv_units").insert(payload);
      if (error) { toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "TV cadastrada" });
    }
    setUnitDialogOpen(false);
    loadUnits(unitStoreId);
  };

  const handleDeleteUnit = async (unitId: string, storeId: string) => {
    const { error } = await supabase.from("store_tv_units").delete().eq("id", unitId);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "TV removida" });
    loadUnits(storeId);
  };

  // Export
  const handleExport = (format: "xlsx" | "pdf") => {
    const exportData = filteredStores.map(s => ({
      ...s,
      playlist_name: getPlaylistName(s.playlist_id) || "—",
      tv_format: s.tv_format === "horizontal" ? "Horizontal" : "Vertical",
      tv_model: s.tv_model || "—", tv_inches: s.tv_inches || "—",
      city: s.city || "—", address: s.address || "—", notes: s.notes || "—",
    }));
    if (format === "xlsx") {
      exportToXLSX(exportData, STORE_EXPORT_COLUMNS, "lojas-tvs");
      toast({ title: "Exportado em Excel" });
    } else {
      exportToPDF(exportData, STORE_EXPORT_COLUMNS, "lojas-tvs", "Relatório de Lojas & TVs");
      toast({ title: "Exportado em PDF" });
    }
  };

  const cities = [...new Set(stores.map(s => s.city).filter(Boolean))] as string[];
  const filteredStores = stores
    .filter(s => selectedCity === "__all__" || s.city === selectedCity)
    .filter(s => !searchQuery || s.store_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalTvs = stores.reduce((sum, s) => sum + s.tv_quantity, 0);
  const horizontalCount = stores.filter(s => s.tv_format === "horizontal").reduce((sum, s) => sum + s.tv_quantity, 0);
  const verticalCount = stores.filter(s => s.tv_format === "vertical").reduce((sum, s) => sum + s.tv_quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lojas & TVs</h1>
          <p className="text-sm text-muted-foreground">Gerencie as lojas e seus equipamentos de mídia</p>
        </div>
        <div className="flex items-center gap-2">
          {stores.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova Loja</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Loja" : "Nova Loja"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Nome da Loja *</Label>
                  <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Ex: Nutricar Centro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ex: São Paulo" /></div>
                  <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ex: Rua das Flores, 123" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Quantidade de TVs *</Label><Input type="number" min={1} value={form.tv_quantity} onChange={(e) => setForm({ ...form, tv_quantity: parseInt(e.target.value) || 1 })} /></div>
                  <div>
                    <Label>Formato *</Label>
                    <Select value={form.tv_format} onValueChange={(v) => setForm({ ...form, tv_format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="horizontal">Horizontal</SelectItem><SelectItem value="vertical">Vertical</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Modelo</Label><Input value={form.tv_model} onChange={(e) => setForm({ ...form, tv_model: e.target.value })} placeholder="Ex: Samsung QN55Q60" /></div>
                  <div><Label>Polegadas</Label><Input type="number" min={1} value={form.tv_inches} onChange={(e) => setForm({ ...form, tv_inches: e.target.value })} placeholder="Ex: 55" /></div>
                </div>
                <div>
                  <Label>Playlist vinculada</Label>
                  <Select value={form.playlist_id} onValueChange={(v) => setForm({ ...form, playlist_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Responsável: João, Horário: 8h-22h" rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                  <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Cadastrar"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2.5"><Store className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stores.length}</p><p className="text-xs text-muted-foreground">Lojas cadastradas</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2.5"><Monitor className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalTvs}</p><p className="text-xs text-muted-foreground">TVs no total</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2.5"><MonitorSmartphone className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{horizontalCount}H / {verticalCount}V</p><p className="text-xs text-muted-foreground">Horizontal / Vertical</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-lg p-2.5 ${onlineCount.online > 0 ? "bg-green-500/10" : "bg-muted"}`}><Wifi className={`h-5 w-5 ${onlineCount.online > 0 ? "text-green-600" : "text-muted-foreground"}`} /></div><div><p className="text-2xl font-bold">{onlineCount.online}<span className="text-sm font-normal text-muted-foreground">/{onlineCount.total}</span></p><p className="text-xs text-muted-foreground">TVs online agora</p></div></CardContent></Card>
      </div>

      {/* Connectivity Timeline */}
      <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardContent className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Histórico de Conectividade</span>
                {connectivityLog.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{connectivityLog.length}</Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${timelineOpen ? "rotate-180" : ""}`} />
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pb-4">
              {connectivityLog.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum evento registrado ainda.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Os eventos aparecerão quando as TVs forem ligadas/desligadas.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[320px] mt-3">
                  <div className="relative pl-6">
                    {/* Timeline line */}
                    <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                    <div className="space-y-0">
                      {connectivityLog.map((log, i) => {
                        const isOnline = log.status === "online";
                        const date = new Date(log.created_at);
                        const now = new Date();
                        const diffMs = now.getTime() - date.getTime();
                        const diffMin = Math.floor(diffMs / 60000);
                        const diffHrs = Math.floor(diffMin / 60);
                        let timeAgo = "";
                        if (diffMin < 1) timeAgo = "agora";
                        else if (diffMin < 60) timeAgo = `${diffMin}min atrás`;
                        else if (diffHrs < 24) timeAgo = `${diffHrs}h atrás`;
                        else timeAgo = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

                        // Group separator for date changes
                        const prevDate = i > 0 ? new Date(connectivityLog[i - 1].created_at) : null;
                        const showDateSep = i === 0 || (prevDate && date.toDateString() !== prevDate.toDateString());

                        return (
                          <div key={log.id}>
                            {showDateSep && (
                              <div className="flex items-center gap-2 py-2 -ml-6">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                  {date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                                </span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <div className="relative flex items-start gap-3 py-1.5">
                              {/* Dot */}
                              <div
                                className={`absolute -left-6 top-2.5 h-[10px] w-[10px] rounded-full border-2 border-background ${
                                  isOnline ? "bg-green-500" : "bg-red-400"
                                }`}
                                style={{ boxShadow: isOnline ? "0 0 6px rgba(34,197,94,0.4)" : "0 0 6px rgba(248,113,113,0.3)" }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{log.unit_label}</span>
                                  <Badge
                                    variant={isOnline ? "secondary" : "outline"}
                                    className={`text-[10px] gap-0.5 ${isOnline ? "text-green-700 bg-green-500/10" : "text-red-600"}`}
                                  >
                                    {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                                    {isOnline ? "Online" : "Offline"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[11px] text-muted-foreground">
                                    {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/60">• {timeAgo}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
        </div>
        {cities.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por cidade" /></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Todas as cidades</SelectItem>{cities.sort().map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {(selectedCity !== "__all__" || searchQuery) && (
          <span className="text-xs text-muted-foreground">{filteredStores.length} loja{filteredStores.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Store list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : stores.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Store className="h-12 w-12 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">Nenhuma loja cadastrada</p><p className="text-xs text-muted-foreground/60">Clique em "Nova Loja" para começar</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filteredStores.map((s) => {
            const plName = getPlaylistName(s.playlist_id);
            const isExpanded = expandedStore === s.id;
            const storeUnits = units[s.id] || [];
            return (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{s.store_name}</p>
                      {(s.city || s.address) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {[s.city, s.address].filter(Boolean).join(" — ")}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{s.tv_quantity} TV{s.tv_quantity > 1 ? "s" : ""}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{s.tv_format}</Badge>
                        {s.tv_model && <Badge variant="outline" className="text-xs">{s.tv_model}</Badge>}
                        {s.tv_inches && <Badge variant="outline" className="text-xs">{s.tv_inches}"</Badge>}
                        {plName && <Badge variant="default" className="text-xs gap-1"><MonitorPlay className="h-3 w-3" /> {plName}</Badge>}
                        {storeUnits.length > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Tv className="h-3 w-3" /> {storeUnits.filter(u => u.is_online).length}/{storeUnits.length} online
                          </Badge>
                        )}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
                          <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{s.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleExpand(s.id)} title="TVs individuais">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded TV units */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">TVs Individuais</p>
                        <Button size="sm" variant="outline" onClick={() => openNewUnit(s.id)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar TV
                        </Button>
                      </div>
                      {storeUnits.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhuma TV individual cadastrada. Use "Adicionar TV" para controle granular.
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {storeUnits.map((u) => {
                            const uPlName = getPlaylistName(u.playlist_id);
                            return (
                              <div key={u.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                                <div className="relative">
                                  <Tv className="h-4 w-4 text-muted-foreground" />
                                  <div
                                    className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${u.is_online ? "bg-green-500" : "bg-red-400"}`}
                                    style={{ boxShadow: u.is_online ? "0 0 4px rgba(34,197,94,0.5)" : undefined }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{u.label}</p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[10px] capitalize">{u.tv_format}</Badge>
                                    {u.tv_model && <Badge variant="outline" className="text-[10px]">{u.tv_model}</Badge>}
                                    {u.tv_inches && <Badge variant="outline" className="text-[10px]">{u.tv_inches}"</Badge>}
                                    {uPlName && <Badge variant="default" className="text-[10px] gap-0.5"><MonitorPlay className="h-2.5 w-2.5" /> {uPlName}</Badge>}
                                    <Badge variant={u.is_online ? "secondary" : "outline"} className="text-[10px] gap-0.5">
                                      {u.is_online ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                                      {u.is_online ? "Online" : "Offline"}
                                    </Badge>
                                    {u.last_seen_at && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Visto: {new Date(u.last_seen_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUnit(u)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteUnit(u.id, u.store_id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* TV Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnitId ? "Editar TV" : "Nova TV"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome / Identificação *</Label>
              <Input value={unitForm.label} onChange={(e) => setUnitForm({ ...unitForm, label: e.target.value })} placeholder="Ex: TV 1 - Entrada" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Formato</Label>
                <Select value={unitForm.tv_format} onValueChange={(v) => setUnitForm({ ...unitForm, tv_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="horizontal">Horizontal</SelectItem><SelectItem value="vertical">Vertical</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Polegadas</Label><Input type="number" min={1} value={unitForm.tv_inches} onChange={(e) => setUnitForm({ ...unitForm, tv_inches: e.target.value })} placeholder="Ex: 55" /></div>
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={unitForm.tv_model} onChange={(e) => setUnitForm({ ...unitForm, tv_model: e.target.value })} placeholder="Ex: Samsung QN55Q60" />
            </div>
            <div>
              <Label>Playlist vinculada</Label>
              <Select value={unitForm.playlist_id} onValueChange={(v) => setUnitForm({ ...unitForm, playlist_id: v })}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={unitForm.notes} onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })} placeholder="Ex: TV montada na parede da entrada" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button onClick={handleSaveUnit}>{editingUnitId ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStoresPage;
