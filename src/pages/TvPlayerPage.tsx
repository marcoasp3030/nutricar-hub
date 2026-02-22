import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SlidePreview, type SlideData } from "@/components/SlideEditor";

type PlaylistItem = {
  id: string;
  media_type: string;
  media_url: string;
  duration_seconds: number;
  transition: string;
  sort_order: number;
  slide_data?: SlideData | null;
  rotation: number;
};

type PlaylistLogo = {
  logo_url: string;
  logo_position: string;
  logo_size: number;
  logo_opacity: number;
};

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

const TvPlayerPage = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [logo, setLogo] = useState<PlaylistLogo>({ logo_url: "", logo_position: "top-right", logo_size: 80, logo_opacity: 100 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [volume, setVolume] = useState(80);
  const [mediaFit, setMediaFit] = useState<string>("contain");
  const [bgColor, setBgColor] = useState("#000000");
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadItems = useCallback(async () => {
    if (!playlistId) return;
    const { data: playlistItems } = await supabase
      .from("playlist_items")
      .select("*")
      .eq("playlist_id", playlistId)
      .order("sort_order");

    if (playlistItems) {
      setItems(
        (playlistItems as any[])
          .filter((i) => i.media_type !== "audio")
          .map((i) => ({
            id: i.id,
            media_type: i.media_type,
            media_url: i.media_url,
            duration_seconds: i.duration_seconds,
            transition: i.transition,
            sort_order: i.sort_order,
            slide_data: i.slide_data as SlideData | null,
            rotation: i.rotation || 0,
          }))
      );
    }
  }, [playlistId]);

  const loadPlaylist = useCallback(async () => {
    if (!playlistId) return;
    const { data: playlist, error: plError } = await supabase
      .from("playlists")
      .select("*")
      .eq("id", playlistId)
      .eq("is_active", true)
      .single();

    if (plError || !playlist) {
      setError("Playlist não encontrada ou inativa.");
      setLoaded(true);
      return;
    }

    setOrientation((playlist as any).orientation || "horizontal");
    setVolume((playlist as any).volume ?? 80);
    setMediaFit((playlist as any).media_fit || "contain");
    setBgColor((playlist as any).bg_color || "#000000");
    setLogo({
      logo_url: (playlist as any).logo_url || "",
      logo_position: (playlist as any).logo_position || "top-right",
      logo_size: (playlist as any).logo_size || 80,
      logo_opacity: (playlist as any).logo_opacity ?? 100,
    });
    return playlist;
  }, [playlistId]);

  // Heartbeat — sends every 30s to mark TV units as online
  useEffect(() => {
    if (!playlistId) return;

    const sendHeartbeat = async () => {
      try {
        await supabase.functions.invoke("tv-heartbeat", {
          body: { playlist_id: playlistId },
        });
      } catch (e) {
        console.warn("Heartbeat failed:", e);
      }
    };

    // Send immediately then every 30 seconds
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30_000);

    return () => clearInterval(interval);
  }, [playlistId]);

  // Initial load
  useEffect(() => {
    if (!playlistId) return;

    const init = async () => {
      const playlist = await loadPlaylist();
      if (playlist) await loadItems();
      setLoaded(true);
    };
    init();
  }, [playlistId, loadPlaylist, loadItems]);

  // Realtime subscriptions
  useEffect(() => {
    if (!playlistId) return;

    const channel = supabase
      .channel(`tv-player-${playlistId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlist_items", filter: `playlist_id=eq.${playlistId}` },
        () => { loadItems(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "playlists", filter: `id=eq.${playlistId}` },
        () => { loadPlaylist(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [playlistId, loadItems, loadPlaylist]);

  const advanceToNext = useCallback(() => {
    if (items.length <= 1) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setTransitioning(false);
    }, 700);
  }, [items.length]);

  // Auto-advance (non-video items only)
  useEffect(() => {
    if (items.length <= 1) return;
    const current = items[currentIndex];
    if (!current || current.media_type === "video") return;

    timerRef.current = setTimeout(() => {
      advanceToNext();
    }, current.duration_seconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items, advanceToNext]);

  // Apply volume and unmute after autoplay starts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlaying = () => {
      video.muted = false;
      video.volume = volume / 100;
    };

    video.addEventListener("playing", handlePlaying);
    // If already playing
    if (!video.paused) {
      video.muted = false;
      video.volume = volume / 100;
    }

    return () => {
      video.removeEventListener("playing", handlePlaying);
    };
  }, [volume, currentIndex]);

  if (!loaded) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white/60 text-lg">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white/30 text-sm">
        Nenhuma mídia na playlist
      </div>
    );
  }


  const current = items[currentIndex];
  const transition = current?.transition || "fade";

  const getTransitionStyle = (): React.CSSProperties => {
    if (!transitioning) return { opacity: 1, transform: "scale(1) translateX(0) translateY(0) rotateY(0)", filter: "blur(0)" };
    switch (transition) {
      case "fade": return { opacity: 0 };
      case "slide": return { opacity: 0, transform: "translateX(-100%)" };
      case "slide-up": return { opacity: 0, transform: "translateY(-100%)" };
      case "slide-down": return { opacity: 0, transform: "translateY(100%)" };
      case "zoom": return { opacity: 0, transform: "scale(1.5)" };
      case "zoom-rotate": return { opacity: 0, transform: "scale(1.5) rotate(15deg)" };
      case "flip": return { opacity: 0, transform: "rotateY(90deg)" };
      case "blur": return { opacity: 0, filter: "blur(20px)" };
      case "none": return {};
      default: return { opacity: 0 };
    }
  };

  const renderItem = () => {
    if (!current) return null;
    const rot = current.rotation || 0;

    if (current.media_type === "slide" && current.slide_data) {
      return (
        <SlidePreview
          data={current.slide_data}
          width={window.innerWidth}
          height={window.innerHeight}
          className="w-full h-full"
        />
      );
    }

    const fitClass = mediaFit === "cover" ? "object-cover" : mediaFit === "fill" ? "object-fill" : "object-contain";

    if (current.media_type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={current.media_url}
            alt=""
            className={`w-full h-full ${fitClass}`}
            style={{ transform: `rotate(${rot}deg)` }}
          />
        </div>
      );
    }

    if (current.media_type === "video") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            key={current.id + currentIndex}
            src={current.media_url}
            autoPlay
            muted
            playsInline
            onEnded={advanceToNext}
            className={`w-full h-full ${fitClass}`}
            style={{ transform: `rotate(${rot}deg)` }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-none"
      style={{
        backgroundColor: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="w-full h-full"
        style={{
          ...getTransitionStyle(),
          transition: "all 0.7s ease-in-out",
        }}
      >
        {renderItem()}
      </div>

      {/* Playlist logo overlay */}
      {logo.logo_url && current && current.media_type !== "slide" && (
        <img
          src={logo.logo_url}
          alt="Logo"
          className="fixed z-40 pointer-events-none"
          style={{
            width: logo.logo_size,
            height: "auto",
            opacity: logo.logo_opacity / 100,
            ...logoPositionStyle(logo.logo_position, 20),
          }}
        />
      )}


      {/* Progress bar */}
      {items.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 flex gap-0.5 p-2 z-50">
          {items.map((_, i) => (
            <div key={i} className="h-[2px] flex-1 rounded-full overflow-hidden bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  i < currentIndex
                    ? "w-full bg-white/40"
                    : i === currentIndex
                    ? "w-full bg-white/60 animate-pulse"
                    : "w-0"
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TvPlayerPage;
