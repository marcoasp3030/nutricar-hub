import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-unit-id',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const supabase = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Validate API key and return unit info
async function authenticate(req: Request): Promise<{ unitId: string; keyId: string } | Response> {
  const apiKey = req.headers.get('x-api-key');
  const unitId = req.headers.get('x-unit-id');

  if (!apiKey || !unitId) {
    return json({ error: 'Missing x-api-key or x-unit-id headers' }, 401);
  }

  const db = supabase();

  // Validate API key
  const { data: keyData, error: keyError } = await db
    .from('tv_api_keys')
    .select('id, is_active, expires_at')
    .eq('api_key', apiKey)
    .single();

  if (keyError || !keyData || !keyData.is_active) {
    return json({ error: 'Invalid or inactive API key' }, 401);
  }

  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return json({ error: 'API key expired' }, 401);
  }

  // Validate unit exists
  const { data: unit, error: unitError } = await db
    .from('store_tv_units')
    .select('id')
    .eq('id', unitId)
    .single();

  if (unitError || !unit) {
    return json({ error: 'TV unit not found' }, 404);
  }

  // Update last_used_at on the key
  await db.from('tv_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);

  return { unitId, keyId: keyData.id };
}

// GET /playlist - Fetch assigned playlist with all items
async function handleGetPlaylist(unitId: string) {
  const db = supabase();

  const { data: unit } = await db
    .from('store_tv_units')
    .select('playlist_id, tv_format, label, store_id')
    .eq('id', unitId)
    .single();

  if (!unit?.playlist_id) {
    return json({ error: 'No playlist assigned to this unit', playlist: null }, 200);
  }

  const { data: playlist } = await db
    .from('playlists')
    .select('*')
    .eq('id', unit.playlist_id)
    .eq('is_active', true)
    .single();

  if (!playlist) {
    return json({ error: 'Playlist not found or inactive', playlist: null }, 200);
  }

  const { data: items } = await db
    .from('playlist_items')
    .select('*')
    .eq('playlist_id', playlist.id)
    .order('sort_order', { ascending: true });

  return json({
    unit: { id: unitId, label: unit.label, format: unit.tv_format, store_id: unit.store_id },
    playlist: {
      ...playlist,
      items: items || [],
    },
  });
}

// POST /heartbeat - Report online status
async function handleHeartbeat(unitId: string, body: any) {
  const db = supabase();
  const now = new Date().toISOString();

  // Check if unit was offline before
  const { data: currentUnit } = await db
    .from('store_tv_units')
    .select('is_online')
    .eq('id', unitId)
    .single();

  // Update unit status
  await db.from('store_tv_units').update({
    is_online: true,
    last_seen_at: now,
  }).eq('id', unitId);

  // Log online transition
  if (currentUnit && !currentUnit.is_online) {
    await db.from('tv_connectivity_log').insert({ unit_id: unitId, status: 'online' });
  }

  // Mark stale units as offline (2 min timeout)
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: goingOffline } = await db
    .from('store_tv_units')
    .select('id')
    .eq('is_online', true)
    .lt('last_seen_at', twoMinAgo)
    .neq('id', unitId);

  if (goingOffline?.length) {
    await db.from('store_tv_units').update({ is_online: false })
      .eq('is_online', true).lt('last_seen_at', twoMinAgo).neq('id', unitId);
    await db.from('tv_connectivity_log').insert(
      goingOffline.map(u => ({ unit_id: u.id, status: 'offline' }))
    );
  }

  // If client sent metrics, log them
  if (body?.metrics) {
    await db.from('tv_logs').insert({
      unit_id: unitId,
      level: 'info',
      event: 'heartbeat',
      details: body.metrics,
    });
  }

  return json({ ok: true, server_time: now });
}

// GET /commands - Poll for pending commands
async function handleGetCommands(unitId: string) {
  const db = supabase();

  const { data: commands } = await db
    .from('tv_commands')
    .select('id, command, payload, created_at')
    .eq('unit_id', unitId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  return json({ commands: commands || [] });
}

// POST /commands/ack - Acknowledge a command
async function handleAckCommand(unitId: string, body: any) {
  const db = supabase();
  const { command_id } = body;

  if (!command_id) {
    return json({ error: 'command_id is required' }, 400);
  }

  const { error } = await db
    .from('tv_commands')
    .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', command_id)
    .eq('unit_id', unitId)
    .eq('status', 'pending');

  if (error) {
    return json({ error: error.message }, 400);
  }

  return json({ ok: true });
}

// POST /logs - Send logs and metrics
async function handlePostLogs(unitId: string, body: any) {
  const db = supabase();
  const { logs } = body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return json({ error: 'logs array is required' }, 400);
  }

  // Limit batch size
  const batch = logs.slice(0, 50).map((log: any) => ({
    unit_id: unitId,
    level: (['info', 'warn', 'error'].includes(log.level) ? log.level : 'info'),
    event: String(log.event || 'unknown').slice(0, 200),
    details: log.details || {},
  }));

  const { error } = await db.from('tv_logs').insert(batch);

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, count: batch.length });
}

// GET /config - Get TV unit configuration
async function handleGetConfig(unitId: string) {
  const db = supabase();

  const { data: unit } = await db
    .from('store_tv_units')
    .select(`
      id, label, tv_format, tv_inches, tv_model, notes, playlist_id,
      store_id
    `)
    .eq('id', unitId)
    .single();

  if (!unit) {
    return json({ error: 'Unit not found' }, 404);
  }

  // Get store info
  const { data: store } = await db
    .from('store_tvs')
    .select('store_name, city, address')
    .eq('id', unit.store_id)
    .single();

  return json({
    unit: { ...unit, store: store || null },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Extract route: /tv-api/playlist → "playlist"
    const pathParts = url.pathname.split('/').filter(Boolean);
    const route = pathParts[pathParts.length - 1] || '';
    // For /commands/ack, check second-to-last
    const isAck = pathParts.length >= 2 && pathParts[pathParts.length - 2] === 'commands' && route === 'ack';
    const effectiveRoute = isAck ? 'commands-ack' : route;

    // Authenticate
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;

    const { unitId } = auth;

    // Route handling
    switch (req.method + ':' + effectiveRoute) {
      case 'GET:playlist':
        return await handleGetPlaylist(unitId);

      case 'POST:heartbeat': {
        const body = await req.json().catch(() => ({}));
        return await handleHeartbeat(unitId, body);
      }

      case 'GET:commands':
        return await handleGetCommands(unitId);

      case 'POST:commands-ack': {
        const body = await req.json();
        return await handleAckCommand(unitId, body);
      }

      case 'POST:logs': {
        const body = await req.json();
        return await handlePostLogs(unitId, body);
      }

      case 'GET:config':
        return await handleGetConfig(unitId);

      default:
        return json({
          error: 'Unknown endpoint',
          available_endpoints: [
            'GET /tv-api/playlist',
            'POST /tv-api/heartbeat',
            'GET /tv-api/commands',
            'POST /tv-api/commands/ack',
            'POST /tv-api/logs',
            'GET /tv-api/config',
          ],
        }, 404);
    }
  } catch (e) {
    console.error('TV API Error:', e);
    return json({ error: 'Internal server error' }, 500);
  }
});
