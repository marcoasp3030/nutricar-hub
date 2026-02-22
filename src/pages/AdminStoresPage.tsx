import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Store, Monitor, MonitorSmartphone, MonitorPlay, MapPin } from "lucide-react";

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
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  store_name: "",
  tv_quantity: 1,
  tv_format: "horizontal",
  tv_model: "",
  tv_inches: "",
  playlist_id: "__none__",
  city: "",
  address: "",
};

const AdminStoresPage = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreTv[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    const [storesRes, playlistsRes] = await Promise.all([
      supabase.from("store_tvs").select("*").order("store_name"),
      supabase.from("playlists").select("id, name").order("name"),
    ]);
    if (storesRes.data) setStores(storesRes.data as StoreTv[]);
    if (playlistsRes.data) setPlaylists(playlistsRes.data as PlaylistOption[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getPlaylistName = (id: string | null) => {
    if (!id) return null;
    return playlists.find(p => p.id === id)?.name || null;
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: StoreTv) => {
    setEditingId(s.id);
    setForm({
      store_name: s.store_name,
      tv_quantity: s.tv_quantity,
      tv_format: s.tv_format,
      tv_model: s.tv_model || "",
      tv_inches: s.tv_inches?.toString() || "",
      playlist_id: s.playlist_id || "__none__",
      city: s.city || "",
      address: s.address || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.store_name.trim()) {
      toast({ title: "Nome da loja é obrigatório", variant: "destructive" });
      return;
    }
    if (form.tv_quantity < 1) {
      toast({ title: "Quantidade deve ser pelo menos 1", variant: "destructive" });
      return;
    }

    const payload = {
      store_name: form.store_name.trim(),
      tv_quantity: form.tv_quantity,
      tv_format: form.tv_format,
      tv_model: form.tv_model.trim() || null,
      tv_inches: form.tv_inches ? parseInt(form.tv_inches) : null,
      playlist_id: form.playlist_id === "__none__" ? null : form.playlist_id,
      city: form.city.trim() || null,
      address: form.address.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("store_tvs").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Loja atualizada com sucesso" });
    } else {
      const { error } = await supabase.from("store_tvs").insert(payload);
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Loja cadastrada com sucesso" });
    }

    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("store_tvs").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Loja removida" });
    loadData();
  };

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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Loja" : "Nova Loja"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome da Loja *</Label>
                <Input
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  placeholder="Ex: Nutricar Centro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ex: Rua das Flores, 123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade de TVs *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.tv_quantity}
                    onChange={(e) => setForm({ ...form, tv_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Formato *</Label>
                  <Select value={form.tv_format} onValueChange={(v) => setForm({ ...form, tv_format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={form.tv_model}
                    onChange={(e) => setForm({ ...form, tv_model: e.target.value })}
                    placeholder="Ex: Samsung QN55Q60"
                  />
                </div>
                <div>
                  <Label>Polegadas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.tv_inches}
                    onChange={(e) => setForm({ ...form, tv_inches: e.target.value })}
                    placeholder="Ex: 55"
                  />
                </div>
              </div>
              <div>
                <Label>Playlist vinculada</Label>
                <Select value={form.playlist_id} onValueChange={(v) => setForm({ ...form, playlist_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {playlists.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSave}>
                  {editingId ? "Salvar Alterações" : "Cadastrar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stores.length}</p>
              <p className="text-xs text-muted-foreground">Lojas cadastradas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTvs}</p>
              <p className="text-xs text-muted-foreground">TVs no total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <MonitorSmartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{horizontalCount}H / {verticalCount}V</p>
              <p className="text-xs text-muted-foreground">Horizontal / Vertical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma loja cadastrada</p>
            <p className="text-xs text-muted-foreground/60">Clique em "Nova Loja" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {stores.map((s) => {
            const plName = getPlaylistName(s.playlist_id);
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-4 p-4">
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
                      <Badge variant="secondary" className="text-xs">
                        {s.tv_quantity} TV{s.tv_quantity > 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {s.tv_format}
                      </Badge>
                      {s.tv_model && (
                        <Badge variant="outline" className="text-xs">{s.tv_model}</Badge>
                      )}
                      {s.tv_inches && (
                        <Badge variant="outline" className="text-xs">{s.tv_inches}"</Badge>
                      )}
                      {plName && (
                        <Badge variant="default" className="text-xs gap-1">
                          <MonitorPlay className="h-3 w-3" /> {plName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminStoresPage;
