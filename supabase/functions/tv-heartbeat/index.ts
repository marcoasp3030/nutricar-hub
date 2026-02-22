import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playlist_id } = await req.json();

    if (!playlist_id) {
      return new Response(JSON.stringify({ error: "playlist_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get units linked to this playlist that were offline (to log them going online)
    const { data: unitsGoingOnline } = await supabase
      .from("store_tv_units")
      .select("id")
      .eq("playlist_id", playlist_id)
      .eq("is_online", false);

    // Update all tv units linked to this playlist
    const { error } = await supabase
      .from("store_tv_units")
      .update({ is_online: true, last_seen_at: new Date().toISOString() })
      .eq("playlist_id", playlist_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log online events
    if (unitsGoingOnline && unitsGoingOnline.length > 0) {
      await supabase.from("tv_connectivity_log").insert(
        unitsGoingOnline.map((u) => ({ unit_id: u.id, status: "online" }))
      );
    }

    // Mark units as offline if last_seen_at > 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // First get units that will go offline (to log them)
    const { data: unitsGoingOffline } = await supabase
      .from("store_tv_units")
      .select("id")
      .eq("is_online", true)
      .lt("last_seen_at", twoMinutesAgo);

    await supabase
      .from("store_tv_units")
      .update({ is_online: false })
      .eq("is_online", true)
      .lt("last_seen_at", twoMinutesAgo);

    // Log offline events
    if (unitsGoingOffline && unitsGoingOffline.length > 0) {
      await supabase.from("tv_connectivity_log").insert(
        unitsGoingOffline.map((u) => ({ unit_id: u.id, status: "offline" }))
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
