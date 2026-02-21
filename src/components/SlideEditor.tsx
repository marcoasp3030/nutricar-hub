import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Upload, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, LayoutTemplate, ImageIcon, Trash2 } from "lucide-react";

export type SlideData = {
  title: string;
  subtitle: string;
  body: string;
  titleSize: number;
  subtitleSize: number;
  bodySize: number;
  titleColor: string;
  subtitleColor: string;
  bodyColor: string;
  titleBold: boolean;
  titleItalic: boolean;
  textAlign: "left" | "center" | "right";
  bgType: "color" | "gradient" | "image";
  bgColor: string;
  bgGradient: string;
  bgImage: string;
  overlayOpacity: number;
  verticalAlign: "top" | "center" | "bottom";
  padding: number;
  logoUrl: string;
  logoPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  logoSize: number;
  logoOpacity: number;
};

const DEFAULT_SLIDE: SlideData = {
  title: "Título do Slide",
  subtitle: "",
  body: "",
  titleSize: 48,
  subtitleSize: 28,
  bodySize: 20,
  titleColor: "#FFFFFF",
  subtitleColor: "#E0E0E0",
  bodyColor: "#CCCCCC",
  titleBold: true,
  titleItalic: false,
  textAlign: "center",
  bgType: "gradient",
  bgColor: "#1a1a2e",
  bgGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  bgImage: "",
  overlayOpacity: 50,
  verticalAlign: "center",
  padding: 60,
  logoUrl: "",
  logoPosition: "top-right",
  logoSize: 80,
  logoOpacity: 100,
};

const SLIDE_TEMPLATES: { label: string; emoji: string; data: SlideData }[] = [
  {
    label: "Promoção",
    emoji: "🔥",
    data: {
      title: "MEGA PROMOÇÃO",
      subtitle: "Até 50% de desconto",
      body: "Aproveite as ofertas especiais!\nVálido por tempo limitado.",
      titleSize: 64, subtitleSize: 36, bodySize: 22,
      titleColor: "#FFEB3B", subtitleColor: "#FFFFFF", bodyColor: "#E0E0E0",
      titleBold: true, titleItalic: false, textAlign: "center",
      bgType: "gradient", bgColor: "#b71c1c",
      bgGradient: "linear-gradient(135deg, #b71c1c 0%, #e53935 50%, #ff7043 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 60,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "Aviso",
    emoji: "⚠️",
    data: {
      title: "AVISO IMPORTANTE",
      subtitle: "",
      body: "Informamos que estaremos em manutenção\nneste sábado das 8h às 12h.\n\nAgradecemos a compreensão.",
      titleSize: 56, subtitleSize: 28, bodySize: 24,
      titleColor: "#FFFFFF", subtitleColor: "#E0E0E0", bodyColor: "#CFD8DC",
      titleBold: true, titleItalic: false, textAlign: "center",
      bgType: "gradient", bgColor: "#1a237e",
      bgGradient: "linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 80,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "Cardápio",
    emoji: "🍽️",
    data: {
      title: "Cardápio do Dia",
      subtitle: "Almoço Executivo — R$ 29,90",
      body: "🥗 Salada Caesar\n🍖 Filé Grelhado ao Molho Mostarda\n🍚 Arroz e Feijão\n🍮 Pudim de Leite",
      titleSize: 52, subtitleSize: 30, bodySize: 26,
      titleColor: "#FFFFFF", subtitleColor: "#A5D6A7", bodyColor: "#E8F5E9",
      titleBold: true, titleItalic: false, textAlign: "left",
      bgType: "gradient", bgColor: "#1b5e20",
      bgGradient: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 80,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "Boas-vindas",
    emoji: "👋",
    data: {
      title: "Bem-vindo!",
      subtitle: "Estamos felizes em tê-lo conosco",
      body: "",
      titleSize: 72, subtitleSize: 32, bodySize: 20,
      titleColor: "#FFFFFF", subtitleColor: "#B3E5FC", bodyColor: "#E0E0E0",
      titleBold: true, titleItalic: false, textAlign: "center",
      bgType: "gradient", bgColor: "#0d47a1",
      bgGradient: "linear-gradient(135deg, #0d47a1 0%, #1565c0 40%, #42a5f5 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 60,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "Evento",
    emoji: "🎉",
    data: {
      title: "EVENTO ESPECIAL",
      subtitle: "Sexta-feira, 20h",
      body: "Venha celebrar conosco!\nMúsica ao vivo • Comes e bebes\n\nLocal: Salão Principal",
      titleSize: 60, subtitleSize: 32, bodySize: 22,
      titleColor: "#FFD54F", subtitleColor: "#FFF9C4", bodyColor: "#FFFFFF",
      titleBold: true, titleItalic: false, textAlign: "center",
      bgType: "gradient", bgColor: "#4a148c",
      bgGradient: "linear-gradient(135deg, #4a148c 0%, #7b1fa2 50%, #e040fb 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 60,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "Horário",
    emoji: "🕐",
    data: {
      title: "Horário de Funcionamento",
      subtitle: "",
      body: "Segunda a Sexta: 8h às 18h\nSábado: 8h às 13h\nDomingo e Feriados: Fechado",
      titleSize: 48, subtitleSize: 28, bodySize: 28,
      titleColor: "#FFFFFF", subtitleColor: "#E0E0E0", bodyColor: "#B0BEC5",
      titleBold: true, titleItalic: false, textAlign: "center",
      bgType: "gradient", bgColor: "#263238",
      bgGradient: "linear-gradient(135deg, #263238 0%, #37474f 50%, #455a64 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 80,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "NutriCar",
    emoji: "🥬",
    data: {
      title: "NutriCar",
      subtitle: "Nutrição de qualidade para você",
      body: "",
      titleSize: 72, subtitleSize: 28, bodySize: 20,
      titleColor: "#FFFFFF", subtitleColor: "#C8E6C9", bodyColor: "#E0E0E0",
      titleBold: true, titleItalic: false, textAlign: "center",
      bgType: "gradient", bgColor: "#2e7d32",
      bgGradient: "linear-gradient(135deg, hsl(87 48% 25%) 0%, hsl(87 48% 40%) 50%, hsl(87 48% 51%) 100%)",
      bgImage: "", overlayOpacity: 50, verticalAlign: "center", padding: 60,
      logoUrl: "", logoPosition: "top-right", logoSize: 80, logoOpacity: 100,
    },
  },
  {
    label: "Em branco",
    emoji: "📄",
    data: { ...DEFAULT_SLIDE },
  },
];

const GRADIENT_PRESETS = [
  { label: "Noite Azul", value: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
  { label: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { label: "Floresta", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { label: "Roxo", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "Laranja", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
  { label: "Escuro", value: "linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #2d2d2d 100%)" },
  { label: "Oceano", value: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)" },
  { label: "NutriCar", value: "linear-gradient(135deg, hsl(87 48% 35%) 0%, hsl(87 48% 51%) 100%)" },
];

/* ─── Logo position helper ─── */
const logoPositionStyle = (pos: string, pad: number): React.CSSProperties => {
  switch (pos) {
    case "top-left": return { top: pad, left: pad };
    case "top-right": return { top: pad, right: pad };
    case "top-center": return { top: pad, left: "50%", transform: "translateX(-50%)" };
    case "bottom-left": return { bottom: pad, left: pad };
    case "bottom-right": return { bottom: pad, right: pad };
    case "bottom-center": return { bottom: pad, left: "50%", transform: "translateX(-50%)" };
    default: return { top: pad, right: pad };
  }
};

/* ─── Slide Preview (reusable for TV mockup too) ─── */
export const SlidePreview = ({
  data,
  width = 480,
  height = 270,
  className = "",
}: {
  data: SlideData;
  width?: number;
  height?: number;
  className?: string;
}) => {
  const scale = width / 1920;

  const bgStyle: React.CSSProperties = {
    width,
    height,
    position: "relative",
    overflow: "hidden",
  };

  if (data.bgType === "color") {
    bgStyle.backgroundColor = data.bgColor;
  } else if (data.bgType === "gradient") {
    bgStyle.background = data.bgGradient;
  }

  const verticalJustify =
    data.verticalAlign === "top" ? "flex-start" : data.verticalAlign === "bottom" ? "flex-end" : "center";

  return (
    <div style={bgStyle} className={`rounded ${className}`}>
      {data.bgType === "image" && data.bgImage && (
        <>
          <img
            src={data.bgImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${data.overlayOpacity / 100})` }}
          />
        </>
      )}
      <div
        className="relative flex flex-col h-full w-full"
        style={{
          justifyContent: verticalJustify,
          textAlign: data.textAlign,
          padding: data.padding * scale,
        }}
      >
        {data.title && (
          <h1
            style={{
              fontSize: data.titleSize * scale,
              color: data.titleColor,
              fontWeight: data.titleBold ? 700 : 400,
              fontStyle: data.titleItalic ? "italic" : "normal",
              lineHeight: 1.2,
              marginBottom: 8 * scale,
            }}
          >
            {data.title}
          </h1>
        )}
        {data.subtitle && (
          <h2
            style={{
              fontSize: data.subtitleSize * scale,
              color: data.subtitleColor,
              fontWeight: 400,
              lineHeight: 1.3,
              marginBottom: 12 * scale,
            }}
          >
            {data.subtitle}
          </h2>
        )}
        {data.body && (
          <p
            style={{
              fontSize: data.bodySize * scale,
              color: data.bodyColor,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {data.body}
          </p>
        )}
      </div>
      {/* Logo overlay */}
      {data.logoUrl && (
        <img
          src={data.logoUrl}
          alt="Logo"
          style={{
            position: "absolute",
            width: (data.logoSize || 80) * scale,
            height: "auto",
            opacity: (data.logoOpacity ?? 100) / 100,
            ...(logoPositionStyle(data.logoPosition || "top-right", (data.padding || 20) * scale)),
          }}
        />
      )}
    </div>
  );
};

/* ─── Slide Editor ─── */
const SlideEditor = ({
  playlistId,
  sortOrder,
  onCreated,
  editData,
  editItemId,
  onUpdated,
}: {
  playlistId: string;
  sortOrder: number;
  onCreated?: (item: any) => void;
  editData?: SlideData;
  editItemId?: string;
  onUpdated?: (item: any) => void;
}) => {
  const { toast } = useToast();
  const [slide, setSlide] = useState<SlideData>(editData || DEFAULT_SLIDE);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof SlideData, value: any) => {
    setSlide((prev) => ({ ...prev, [field]: value }));
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const filePath = `slides/${playlistId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("media").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(filePath);
      update("bgImage", data.publicUrl);
      update("bgType", "image");
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingBg(false);
      e.target.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const filePath = `logos/${playlistId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("media").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(filePath);
      update("logoUrl", data.publicUrl);
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editItemId && onUpdated) {
        const { data, error } = await supabase
          .from("playlist_items")
          .update({ slide_data: slide as any })
          .eq("id", editItemId)
          .select()
          .single();
        if (error) throw error;
        onUpdated(data);
        toast({ title: "Slide atualizado!" });
      } else {
        const { data, error } = await supabase
          .from("playlist_items")
          .insert({
            playlist_id: playlistId,
            media_type: "slide",
            media_url: "",
            file_name: slide.title || "Slide",
            sort_order: sortOrder,
            slide_data: slide as any,
          })
          .select()
          .single();
        if (error) throw error;
        onCreated?.(data);
        toast({ title: "Slide adicionado!" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
        {/* Templates */}
        {!editData && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <LayoutTemplate className="h-4 w-4" /> Templates
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {SLIDE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => setSlide({ ...tpl.data })}
                  className="group relative rounded-lg border border-border overflow-hidden hover:border-primary transition-colors"
                >
                  <SlidePreview data={tpl.data} width={120} height={68} />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-white font-medium p-1.5 w-full text-center truncate">
                      {tpl.emoji} {tpl.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text content */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Type className="h-4 w-4" /> Conteúdo
          </h3>
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input value={slide.title} onChange={(e) => update("title", e.target.value)} placeholder="Título principal" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo</Label>
            <Input value={slide.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="Subtítulo (opcional)" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Texto</Label>
            <Textarea value={slide.body} onChange={(e) => update("body", e.target.value)} placeholder="Corpo do texto (opcional)" rows={3} />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Tipografia</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Título {slide.titleSize}px</Label>
              <Slider value={[slide.titleSize]} onValueChange={([v]) => update("titleSize", v)} min={20} max={120} step={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Subtítulo {slide.subtitleSize}px</Label>
              <Slider value={[slide.subtitleSize]} onValueChange={([v]) => update("subtitleSize", v)} min={14} max={80} step={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Texto {slide.bodySize}px</Label>
              <Slider value={[slide.bodySize]} onValueChange={([v]) => update("bodySize", v)} min={12} max={60} step={2} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Label className="text-[10px]">Título</Label>
              <input type="color" value={slide.titleColor} onChange={(e) => update("titleColor", e.target.value)} className="h-6 w-6 rounded border cursor-pointer" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px]">Sub</Label>
              <input type="color" value={slide.subtitleColor} onChange={(e) => update("subtitleColor", e.target.value)} className="h-6 w-6 rounded border cursor-pointer" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px]">Texto</Label>
              <input type="color" value={slide.bodyColor} onChange={(e) => update("bodyColor", e.target.value)} className="h-6 w-6 rounded border cursor-pointer" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant={slide.titleBold ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => update("titleBold", !slide.titleBold)}>
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button variant={slide.titleItalic ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => update("titleItalic", !slide.titleItalic)}>
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <div className="border-l border-border h-6 mx-1" />
            <Button variant={slide.textAlign === "left" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => update("textAlign", "left")}>
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant={slide.textAlign === "center" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => update("textAlign", "center")}>
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button variant={slide.textAlign === "right" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => update("textAlign", "right")}>
              <AlignRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Posição vertical</Label>
            <Select value={slide.verticalAlign} onValueChange={(v: any) => update("verticalAlign", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top" className="text-xs">Topo</SelectItem>
                <SelectItem value="center" className="text-xs">Centro</SelectItem>
                <SelectItem value="bottom" className="text-xs">Base</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Padding {slide.padding}px</Label>
            <Slider value={[slide.padding]} onValueChange={([v]) => update("padding", v)} min={10} max={200} step={5} />
          </div>
        </div>

        {/* Background */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Fundo</h3>
          <div className="flex gap-2">
            <Button variant={slide.bgType === "color" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => update("bgType", "color")}>Cor</Button>
            <Button variant={slide.bgType === "gradient" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => update("bgType", "gradient")}>Gradiente</Button>
            <Button variant={slide.bgType === "image" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => update("bgType", "image")}>Imagem</Button>
          </div>

          {slide.bgType === "color" && (
            <div className="flex items-center gap-2">
              <input type="color" value={slide.bgColor} onChange={(e) => update("bgColor", e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={slide.bgColor} onChange={(e) => update("bgColor", e.target.value)} className="h-8 text-xs w-28" />
            </div>
          )}

          {slide.bgType === "gradient" && (
            <div className="grid grid-cols-4 gap-1.5">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => update("bgGradient", g.value)}
                  className={`h-10 rounded-md border-2 transition-all ${
                    slide.bgGradient === g.value ? "border-primary ring-1 ring-primary" : "border-transparent"
                  }`}
                  style={{ background: g.value }}
                  title={g.label}
                />
              ))}
            </div>
          )}

          {slide.bgType === "image" && (
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploadingBg}>
                <Upload className="h-3.5 w-3.5" /> {uploadingBg ? "Enviando..." : "Escolher imagem"}
              </Button>
              {slide.bgImage && (
                <img src={slide.bgImage} alt="" className="h-16 rounded object-cover" />
              )}
              <div className="space-y-1">
                <Label className="text-[10px]">Opacidade do overlay {slide.overlayOpacity}%</Label>
                <Slider value={[slide.overlayOpacity]} onValueChange={([v]) => update("overlayOpacity", v)} min={0} max={90} step={5} />
              </div>
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <ImageIcon className="h-4 w-4" /> Logo
          </h3>
          <div className="space-y-2">
            <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}>
                <Upload className="h-3.5 w-3.5" /> {uploadingLogo ? "Enviando..." : "Upload Logo"}
              </Button>
              {slide.logoUrl && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive" onClick={() => update("logoUrl", "")}>
                  <Trash2 className="h-3 w-3" /> Remover
                </Button>
              )}
            </div>
            {slide.logoUrl && (
              <>
                <img src={slide.logoUrl} alt="Logo" className="h-12 rounded border border-border object-contain bg-muted p-1" />
                <div className="space-y-1">
                  <Label className="text-[10px]">Posição</Label>
                  <Select value={slide.logoPosition} onValueChange={(v: any) => update("logoPosition", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left" className="text-xs">Topo Esquerda</SelectItem>
                      <SelectItem value="top-center" className="text-xs">Topo Centro</SelectItem>
                      <SelectItem value="top-right" className="text-xs">Topo Direita</SelectItem>
                      <SelectItem value="bottom-left" className="text-xs">Base Esquerda</SelectItem>
                      <SelectItem value="bottom-center" className="text-xs">Base Centro</SelectItem>
                      <SelectItem value="bottom-right" className="text-xs">Base Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Tamanho {slide.logoSize}px</Label>
                  <Slider value={[slide.logoSize]} onValueChange={([v]) => update("logoSize", v)} min={30} max={300} step={5} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Opacidade {slide.logoOpacity}%</Label>
                  <Slider value={[slide.logoOpacity]} onValueChange={([v]) => update("logoOpacity", v)} min={10} max={100} step={5} />
                </div>
              </>
            )}
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Salvando..." : editItemId ? "Atualizar Slide" : "Adicionar Slide"}
        </Button>
      </div>

      {/* Right: Preview */}
      <div className="flex flex-col items-center gap-3">
        <Label className="text-xs text-muted-foreground">Preview (16:9)</Label>
        <SlidePreview data={slide} width={480} height={270} className="shadow-lg border border-border" />
      </div>
    </div>
  );
};

export default SlideEditor;
