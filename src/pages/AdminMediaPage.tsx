import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Upload, Trash2, Play, Pause, Monitor, Clock, Image as ImageIcon,
  Video, Music, GripVertical, Settings2, Eye, ChevronLeft, ChevronRight,
  Presentation, Pencil,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SlideEditor, { SlidePreview, type SlideData } from "@/components/SlideEditor";

/* ─── Types ─── */
type Playlist = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  schedule_start: string | null;
  schedule_end: string | null;
  created_at: string;
};

type PlaylistItem = {
  id: string;
  playlist_id: string;
  media_type: string;
  media_url: string;
  file_name: string | null;
  duration_seconds: number;
  transition: string;
  sort_order: number;
  slide_data?: SlideData | null;
};

const TRANSITIONS = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "none", label: "Nenhuma" },
];

/* ─── Sortable Item ─── */
const SortableItem = ({
  item,
  onDelete,
  onUpdate,
  onEditSlide,
}: {
  item: PlaylistItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onEditSlide?: (item: PlaylistItem) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const typeLabel = item.media_type === "image" ? "Imagem" : item.media_type === "video" ? "Vídeo" : item.media_type === "slide" ? "Slide" : "Áudio";

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
        {item.media_type === "image" ? (
          <img src={item.media_url} alt="" className="h-full w-full object-cover" />
        ) : item.media_type === "slide" && item.slide_data ? (
          <SlidePreview data={item.slide_data} width={64} height={36} />
        ) : item.media_type === "video" ? (
          <Video className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Music className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{item.file_name || "Sem nome"}</p>
        <Badge variant="secondary" className="text-[10px] mt-1">{typeLabel}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            min={1}
            max={120}
            value={item.duration_seconds}
            onChange={(e) => onUpdate(item.id, "duration_seconds", parseInt(e.target.value) || 5)}
            className="h-8 w-16 text-xs"
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>

        <Select value={item.transition} onValueChange={(v) => onUpdate(item.id, "transition", v)}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {item.media_type === "slide" && onEditSlide && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditSlide(item)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

/* ─── TV Mockup Preview ─── */
const TvMockup = ({
  items,
  playing,
  onTogglePlay,
}: {
  items: PlaylistItem[];
  playing: boolean;
  onTogglePlay: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualItems = items.filter((i) => i.media_type !== "audio");
  const audioItem = items.find((i) => i.media_type === "audio");

  useEffect(() => { setCurrentIndex(0); }, [items.length]);

  useEffect(() => {
    if (!playing || visualItems.length <= 1) return;
    const current = visualItems[currentIndex];
    if (!current) return;

    timerRef.current = setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % visualItems.length);
        setTransitioning(false);
      }, 600);
    }, current.duration_seconds * 1000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, currentIndex, visualItems]);

  const currentItem = visualItems[currentIndex];
  const transition = currentItem?.transition || "fade";

  const getTransitionClass = () => {
    if (!transitioning) return "opacity-100 scale-100 translate-x-0";
    switch (transition) {
      case "fade": return "opacity-0";
      case "slide": return "opacity-0 -translate-x-full";
      case "zoom": return "opacity-0 scale-150";
      default: return "opacity-0";
    }
  };

  const renderCurrentItem = () => {
    if (!currentItem) return null;
    if (currentItem.media_type === "slide" && currentItem.slide_data) {
      return <SlidePreview data={currentItem.slide_data} width={480} height={270} />;
    }
    if (currentItem.media_type === "image") {
      return <img src={currentItem.media_url} alt="" className="h-full w-full object-contain bg-black" />;
    }
    if (currentItem.media_type === "video") {
      return <video src={currentItem.media_url} autoPlay={playing} muted className="h-full w-full object-contain bg-black" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="rounded-2xl border-[6px] border-foreground/80 bg-black overflow-hidden shadow-2xl" style={{ width: 480, height: 270 }}>
          {visualItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Monitor className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-xs">Adicione mídias à playlist</p>
              </div>
            </div>
          ) : currentItem ? (
            <div className={`h-full w-full transition-all duration-500 ease-in-out ${getTransitionClass()}`}>
              {renderCurrentItem()}
            </div>
          ) : null}

          {playing && visualItems.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 p-1">
              {visualItems.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full overflow-hidden bg-white/20">
                  <div className={`h-full rounded-full transition-all ${i < currentIndex ? "w-full bg-white/60" : i === currentIndex ? "bg-white/80 animate-pulse w-full" : "w-0"}`} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mx-auto h-4 w-32 rounded-b-lg bg-foreground/70" />
        <div className="mx-auto h-2 w-48 rounded-b-md bg-foreground/50" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={visualItems.length === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onTogglePlay} disabled={visualItems.length === 0}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentIndex((p) => (p + 1) % Math.max(1, visualItems.length))} disabled={visualItems.length === 0}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {visualItems.length > 0 ? `${currentIndex + 1}/${visualItems.length}` : "0/0"}
        </span>
      </div>

      {audioItem && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Music className="h-3.5 w-3.5" />
          <span>Áudio: {audioItem.file_name}</span>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
const AdminMediaPage = () => {
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [showSlideEditor, setShowSlideEditor] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PlaylistItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPlaylists = useCallback(async () => {
    const { data } = await supabase.from("playlists").select("*").order("created_at", { ascending: false });
    if (data) setPlaylists(data as Playlist[]);
    setLoading(false);
  }, []);

  const fetchItems = useCallback(async (playlistId: string) => {
    const { data } = await supabase.from("playlist_items").select("*").eq("playlist_id", playlistId).order("sort_order");
    if (data) setItems(data as unknown as PlaylistItem[]);
  }, []);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);
  useEffect(() => {
    if (selectedPlaylist) fetchItems(selectedPlaylist.id);
    else setItems([]);
  }, [selectedPlaylist, fetchItems]);

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("playlists").insert({ name: newName.trim(), created_by: user.id }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setPlaylists((prev) => [data as Playlist, ...prev]);
      setSelectedPlaylist(data as Playlist);
      setShowNewDialog(false);
      setNewName("");
      toast({ title: "Playlist criada!" });
    }
  };

  const deletePlaylist = async (id: string) => {
    await supabase.from("playlists").delete().eq("id", id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlaylist?.id === id) { setSelectedPlaylist(null); setItems([]); }
    toast({ title: "Playlist removida" });
  };

  const toggleActive = async (playlist: Playlist) => {
    const { error } = await supabase.from("playlists").update({ is_active: !playlist.is_active }).eq("id", playlist.id);
    if (!error) {
      setPlaylists((prev) => prev.map((p) => (p.id === playlist.id ? { ...p, is_active: !p.is_active } : p)));
      if (selectedPlaylist?.id === playlist.id) setSelectedPlaylist({ ...playlist, is_active: !playlist.is_active });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPlaylist || !e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        let mediaType = "image";
        if (["mp4", "webm", "mov"].includes(ext)) mediaType = "video";
        else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) mediaType = "audio";

        const filePath = `${selectedPlaylist.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);

        const { data: item, error: insertError } = await supabase
          .from("playlist_items")
          .insert({ playlist_id: selectedPlaylist.id, media_type: mediaType, media_url: urlData.publicUrl, file_name: file.name, sort_order: items.length })
          .select().single();
        if (insertError) throw insertError;
        if (item) setItems((prev) => [...prev, item as unknown as PlaylistItem]);
      }
      toast({ title: "Mídia(s) adicionada(s)!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally { setUploading(false); e.target.value = ""; }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("playlist_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = async (id: string, field: string, value: any) => {
    await supabase.from("playlist_items").update({ [field]: value }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("playlist_items").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const updateSchedule = async (field: "schedule_start" | "schedule_end", value: string) => {
    if (!selectedPlaylist) return;
    await supabase.from("playlists").update({ [field]: value || null }).eq("id", selectedPlaylist.id);
    setSelectedPlaylist({ ...selectedPlaylist, [field]: value || null });
    setPlaylists((prev) => prev.map((p) => (p.id === selectedPlaylist.id ? { ...p, [field]: value || null } : p)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mídia TV</h1>
          <p className="text-sm text-muted-foreground">Gerencie playlists de mídia para exibição em TVs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Playlist list */}
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Playlists</CardTitle>
              <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Playlist</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label>Nome</Label>
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Promoções Janeiro" onKeyDown={(e) => e.key === "Enter" && createPlaylist()} />
                    </div>
                    <Button onClick={createPlaylist} className="w-full">Criar Playlist</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : playlists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma playlist criada</p>
            ) : (
              playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => { setSelectedPlaylist(pl); setShowSlideEditor(false); setEditingSlide(null); }}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedPlaylist?.id === pl.id ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pl.name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(pl.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={pl.is_active ? "default" : "secondary"} className="text-[10px]">{pl.is_active ? "Ativa" : "Inativa"}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Editor + Preview */}
        <div className="xl:col-span-2 space-y-6">
          {!selectedPlaylist ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Monitor className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Selecione ou crie uma playlist para editar</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* TV Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Preview — {selectedPlaylist.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Ativa</Label>
                      <Switch checked={selectedPlaylist.is_active} onCheckedChange={() => toggleActive(selectedPlaylist)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TvMockup items={items} playing={playing} onTogglePlay={() => setPlaying(!playing)} />
                </CardContent>
              </Card>

              {/* Slide Editor (conditionally shown) */}
              {showSlideEditor && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Presentation className="h-4 w-4" /> {editingSlide ? "Editar Slide" : "Novo Slide"}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => { setShowSlideEditor(false); setEditingSlide(null); }}>
                        Fechar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SlideEditor
                      playlistId={selectedPlaylist.id}
                      sortOrder={items.length}
                      editData={editingSlide?.slide_data || undefined}
                      editItemId={editingSlide?.id}
                      onCreated={(item) => {
                        setItems((prev) => [...prev, item as PlaylistItem]);
                        setShowSlideEditor(false);
                      }}
                      onUpdated={(item) => {
                        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...item } : i)));
                        setShowSlideEditor(false);
                        setEditingSlide(null);
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Schedule */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Agendamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Início</Label>
                      <Input type="time" value={selectedPlaylist.schedule_start || ""} onChange={(e) => updateSchedule("schedule_start", e.target.value)} className="h-9 w-36" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim</Label>
                      <Input type="time" value={selectedPlaylist.schedule_end || ""} onChange={(e) => updateSchedule("schedule_end", e.target.value)} className="h-9 w-36" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Media items */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Mídias ({items.length})</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => { setEditingSlide(null); setShowSlideEditor(true); }}
                      >
                        <Presentation className="h-3.5 w-3.5" /> Criar Slide
                      </Button>
                      <div>
                        <input type="file" id="media-upload" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={handleUpload} />
                        <Button size="sm" className="gap-1.5" asChild disabled={uploading}>
                          <label htmlFor="media-upload" className="cursor-pointer">
                            <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload"}
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border py-10 text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Arraste ou clique em Upload para adicionar mídias</p>
                      <p className="text-xs text-muted-foreground mt-1">Imagens, vídeos, áudios ou crie slides</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              onDelete={deleteItem}
                              onUpdate={updateItem}
                              onEditSlide={(it) => { setEditingSlide(it); setShowSlideEditor(true); }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMediaPage;
