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
  Presentation, Pencil, Copy, Tag, X,
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
  tags: string[];
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
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualItems = items.filter((i) => i.media_type !== "audio");
  const audioItem = items.find((i) => i.media_type === "audio");

  const isHorizontal = orientation === "horizontal";
  const screenW = isHorizontal ? 480 : 220;
  const screenH = isHorizontal ? 270 : 390;

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
      return <SlidePreview data={currentItem.slide_data} width={screenW} height={screenH} />;
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
    <div className="flex flex-col items-center gap-4">
      {/* Orientation toggle */}
      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
        <button
          onClick={() => setOrientation("horizontal")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isHorizontal ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="h-3.5 w-3.5" /> Horizontal
        </button>
        <button
          onClick={() => setOrientation("vertical")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            !isHorizontal ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          Vertical
        </button>
      </div>

      {/* Realistic TV */}
      <div className="relative" style={{ perspective: "1200px" }}>
        {/* TV Frame */}
        <div
          className="relative rounded-[8px] transition-all duration-500 ease-in-out"
          style={{
            width: screenW + 20,
            height: screenH + 20,
            background: "linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 30%, #1a1a1a 70%, #111 100%)",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)",
            padding: "10px",
          }}
        >
          {/* Inner bezel */}
          <div
            className="relative w-full h-full rounded-[4px] overflow-hidden"
            style={{
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.6), inset 0 0 3px rgba(0,0,0,0.8)",
              background: "#000",
            }}
          >
            {/* Screen reflection overlay */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)",
              }}
            />

            {visualItems.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                  <Monitor className="h-10 w-10 mx-auto text-white/10" />
                  <p className="text-[10px] text-white/20">Sem sinal</p>
                </div>
              </div>
            ) : currentItem ? (
              <div className={`h-full w-full transition-all duration-500 ease-in-out ${getTransitionClass()}`}>
                {renderCurrentItem()}
              </div>
            ) : null}

            {/* Progress dots */}
            {playing && visualItems.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 p-1.5 z-10">
                {visualItems.map((_, i) => (
                  <div key={i} className="h-[3px] flex-1 rounded-full overflow-hidden bg-white/15">
                    <div className={`h-full rounded-full transition-all duration-300 ${i < currentIndex ? "w-full bg-white/50" : i === currentIndex ? "bg-white/70 animate-pulse w-full" : "w-0"}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LED indicator */}
          <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2">
            <div
              className={`h-[3px] w-[3px] rounded-full transition-colors duration-500 ${playing ? "bg-green-400" : visualItems.length > 0 ? "bg-amber-400" : "bg-red-500"}`}
              style={{ boxShadow: playing ? "0 0 4px rgba(74,222,128,0.6)" : visualItems.length > 0 ? "0 0 4px rgba(251,191,36,0.4)" : "0 0 4px rgba(239,68,68,0.4)" }}
            />
          </div>

          {/* Brand logo on frame */}
          <div className="absolute bottom-[2px] right-3">
            <span className="text-[6px] font-bold tracking-widest text-white/15 uppercase">NutriCar</span>
          </div>
        </div>

        {/* TV Stand */}
        {isHorizontal ? (
          <>
            {/* Neck */}
            <div className="mx-auto w-[60px] h-[28px]" style={{
              background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
              clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
            }} />
            {/* Base */}
            <div className="mx-auto w-[160px] h-[8px] rounded-[4px]" style={{
              background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #111 100%)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
            }} />
          </>
        ) : (
          <>
            {/* Vertical stand - thinner neck */}
            <div className="mx-auto w-[40px] h-[24px]" style={{
              background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
              clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
            }} />
            <div className="mx-auto w-[120px] h-[8px] rounded-[4px]" style={{
              background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #111 100%)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
            }} />
          </>
        )}

        {/* Shadow under TV */}
        <div className="mx-auto mt-1 rounded-full opacity-20 blur-md" style={{
          width: isHorizontal ? 200 : 140,
          height: 6,
          background: "radial-gradient(ellipse, rgba(0,0,0,0.8), transparent)",
        }} />
      </div>

      {/* Controls */}
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
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [showSlideEditor, setShowSlideEditor] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PlaylistItem | null>(null);
  const [filterTag, setFilterTag] = useState<string>("");

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
    const { data, error } = await supabase.from("playlists").insert({ name: newName.trim(), created_by: user.id, tags: newTags } as any).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setPlaylists((prev) => [data as Playlist, ...prev]);
      setSelectedPlaylist(data as Playlist);
      setShowNewDialog(false);
      setNewName("");
      setNewTags([]);
      toast({ title: "Playlist criada!" });
    }
  };

  const duplicatePlaylist = async (playlist: Playlist) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create new playlist
    const { data: newPl, error } = await supabase
      .from("playlists")
      .insert({
        name: `${playlist.name} (cópia)`,
        created_by: user.id,
        tags: playlist.tags,
        schedule_start: playlist.schedule_start,
        schedule_end: playlist.schedule_end,
      } as any)
      .select()
      .single();
    if (error || !newPl) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }

    // Copy items
    const { data: sourceItems } = await supabase
      .from("playlist_items")
      .select("*")
      .eq("playlist_id", playlist.id)
      .order("sort_order");

    if (sourceItems?.length) {
      const copies = sourceItems.map((item: any) => ({
        playlist_id: newPl.id,
        media_type: item.media_type,
        media_url: item.media_url,
        file_name: item.file_name,
        duration_seconds: item.duration_seconds,
        transition: item.transition,
        sort_order: item.sort_order,
        slide_data: item.slide_data,
      }));
      await supabase.from("playlist_items").insert(copies as any);
    }

    setPlaylists((prev) => [newPl as Playlist, ...prev]);
    setSelectedPlaylist(newPl as Playlist);
    toast({ title: "Playlist duplicada!" });
  };

  const deletePlaylist = async (id: string) => {
    await supabase.from("playlists").delete().eq("id", id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlaylist?.id === id) { setSelectedPlaylist(null); setItems([]); }
    toast({ title: "Playlist removida" });
  };

  const updatePlaylistTags = async (playlist: Playlist, tags: string[]) => {
    await supabase.from("playlists").update({ tags } as any).eq("id", playlist.id);
    setPlaylists((prev) => prev.map((p) => (p.id === playlist.id ? { ...p, tags } : p)));
    if (selectedPlaylist?.id === playlist.id) setSelectedPlaylist({ ...playlist, tags });
  };

  const allTags = Array.from(new Set(playlists.flatMap((p) => p.tags || [])));
  const filteredPlaylists = filterTag
    ? playlists.filter((p) => p.tags?.includes(filterTag))
    : playlists;

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
                    <div>
                      <Label className="text-xs">Tags</Label>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {newTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                            {tag}
                            <button onClick={() => setNewTags((prev) => prev.filter((t) => t !== tag))}><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Adicionar tag e pressione Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTagInput.trim()) {
                            e.preventDefault();
                            if (!newTags.includes(newTagInput.trim())) setNewTags((prev) => [...prev, newTagInput.trim()]);
                            setNewTagInput("");
                          }
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button onClick={createPlaylist} className="w-full">Criar Playlist</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pb-2 border-b border-border mb-2">
                <button
                  onClick={() => setFilterTag("")}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${!filterTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  Todas
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${filterTag === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : filteredPlaylists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma playlist encontrada</p>
            ) : (
              filteredPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => { setSelectedPlaylist(pl); setShowSlideEditor(false); setEditingSlide(null); }}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedPlaylist?.id === pl.id ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pl.name}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(pl.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={pl.is_active ? "default" : "secondary"} className="text-[10px]">{pl.is_active ? "Ativa" : "Inativa"}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={(e) => { e.stopPropagation(); duplicatePlaylist(pl); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {pl.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-7">
                      {pl.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                          <Tag className="h-2 w-2 mr-0.5" />{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
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

              {/* Schedule & Tags */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Configurações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {(selectedPlaylist.tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                          {tag}
                          <button onClick={() => updatePlaylistTags(selectedPlaylist, selectedPlaylist.tags.filter((t) => t !== tag))}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Nova tag + Enter"
                      className="h-8 text-xs w-48"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (!selectedPlaylist.tags?.includes(val)) {
                            updatePlaylistTags(selectedPlaylist, [...(selectedPlaylist.tags || []), val]);
                          }
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
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
