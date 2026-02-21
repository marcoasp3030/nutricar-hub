import { useState, useEffect, useRef } from "react";
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

const TvPlayerPage = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playlistId) return;

    const load = async () => {
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
      setLoaded(true);
    };

    load();
  }, [playlistId]);

  // Auto-advance
  useEffect(() => {
    if (items.length <= 1) return;
    const current = items[currentIndex];
    if (!current) return;

    timerRef.current = setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setTransitioning(false);
      }, 700);
    }, current.duration_seconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items]);

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
    if (!transitioning) return { opacity: 1, transform: "scale(1) translateX(0)" };
    switch (transition) {
      case "fade":
        return { opacity: 0 };
      case "slide":
        return { opacity: 0, transform: "translateX(-100%)" };
      case "zoom":
        return { opacity: 0, transform: "scale(1.5)" };
      default:
        return { opacity: 0 };
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

    if (current.media_type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={current.media_url}
            alt=""
            className="max-w-full max-h-full object-contain"
            style={{ transform: `rotate(${rot}deg)` }}
          />
        </div>
      );
    }

    if (current.media_type === "video") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <video
            src={current.media_url}
            autoPlay
            muted
            className="max-w-full max-h-full object-contain"
            style={{ transform: `rotate(${rot}deg)` }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden cursor-none"
      style={{
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
