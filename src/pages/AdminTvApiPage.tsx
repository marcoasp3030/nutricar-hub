import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Key, Copy, Trash2, Plus, Loader2, Send, Monitor, FileText, RefreshCw, Eye, EyeOff, AlertTriangle, Shield, Activity, Upload, Package, ToggleLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ApiKey {
  id: string;
  api_key: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface TvUnit {
  id: string;
  label: string;
  is_online: boolean;
  store_id: string;
  store_tvs?: { store_name: string } | null;
}

interface TvCommand {
  id: string;
  unit_id: string;
  command: string;
  payload: any;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  store_tv_units?: { label: string } | null;
}

interface TvLog {
  id: string;
  unit_id: string;
  level: string;
  event: string;
  details: any;
  created_at: string;
  store_tv_units?: { label: string } | null;
}

interface RateLimitInfo {
  api_key_id: string;
  request_count: number;
  window_start: string;
  label?: string;
}

interface OtaRelease {
  id: string;
  version: string;
  version_code: number;
  channel: string;
  release_notes: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  checksum_sha256: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  min_version_code: number | null;
  created_at: string;
  updated_at: string;
}

const AdminTvApiPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [units, setUnits] = useState<TvUnit[]>([]);
  const [commands, setCommands] = useState<TvCommand[]>([]);
  const [logs, setLogs] = useState<TvLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimitInfo[]>([]);
  const RATE_LIMIT_MAX = 120;

  // API Key form
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [keyExpiry, setKeyExpiry] = useState("");
  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Command form
  const [sendCommandOpen, setSendCommandOpen] = useState(false);
  const [cmdUnitId, setCmdUnitId] = useState("");
  const [cmdType, setCmdType] = useState("reload");
  const [cmdPayload, setCmdPayload] = useState("");

  // Log filters
  const [logUnitFilter, setLogUnitFilter] = useState("all");
  const [logLevelFilter, setLogLevelFilter] = useState("all");

  // OTA state
  const [otaReleases, setOtaReleases] = useState<OtaRelease[]>([]);
  const [createOtaOpen, setCreateOtaOpen] = useState(false);
  const [otaVersion, setOtaVersion] = useState("");
  const [otaVersionCode, setOtaVersionCode] = useState("");
  const [otaChannel, setOtaChannel] = useState("stable");
  const [otaReleaseNotes, setOtaReleaseNotes] = useState("");
  const [otaFileUrl, setOtaFileUrl] = useState("");
  const [otaFileSize, setOtaFileSize] = useState("");
  const [otaChecksum, setOtaChecksum] = useState("");
  const [otaIsMandatory, setOtaIsMandatory] = useState(false);
  const [otaMinVersionCode, setOtaMinVersionCode] = useState("");
  const [otaChannelFilter, setOtaChannelFilter] = useState("all");
  const [deleteOtaOpen, setDeleteOtaOpen] = useState(false);
  const [selectedOta, setSelectedOta] = useState<OtaRelease | null>(null);

  const fetchApiKeys = useCallback(async () => {
    const { data } = await supabase.from('tv_api_keys').select('*').order('created_at', { ascending: false });
    setApiKeys((data as any) || []);
  }, []);

  const fetchUnits = useCallback(async () => {
    const { data } = await supabase.from('store_tv_units').select('id, label, is_online, store_id, store_tvs(store_name)');
    setUnits((data as any) || []);
  }, []);

  const fetchCommands = useCallback(async () => {
    const { data } = await supabase.from('tv_commands').select('*, store_tv_units(label)').order('created_at', { ascending: false }).limit(100);
    setCommands((data as any) || []);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('tv_logs').select('*, store_tv_units(label)').order('created_at', { ascending: false }).limit(200);
    setLogs((data as any) || []);
  }, []);

  const fetchRateLimits = useCallback(async () => {
    const windowStart = new Date(Date.now() - 60 * 1000).toISOString();
    const { data } = await supabase
      .from('tv_api_rate_limits')
      .select('api_key_id, request_count, window_start')
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false });
    
    // Enrich with key labels
    const enriched: RateLimitInfo[] = ((data as any) || []).map((rl: any) => {
      const key = apiKeys.find(k => k.id === rl.api_key_id);
      return { ...rl, label: key?.label || rl.api_key_id.slice(0, 8) };
    });
    setRateLimits(enriched);
  }, [apiKeys]);

  const fetchOtaReleases = useCallback(async () => {
    const { data } = await supabase.from('tv_ota_releases').select('*').order('version_code', { ascending: false });
    setOtaReleases((data as any) || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchApiKeys(), fetchUnits(), fetchCommands(), fetchLogs(), fetchOtaReleases()])
      .finally(() => setLoading(false));
  }, []);

  // Auto-refresh rate limits every 10s
  useEffect(() => {
    if (apiKeys.length === 0) return;
    fetchRateLimits();
    const interval = setInterval(fetchRateLimits, 10000);
    return () => clearInterval(interval);
  }, [apiKeys, fetchRateLimits]);

  const handleCreateKey = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tv_api_keys').insert({
        label: keyLabel || 'Chave padrão',
        created_by: user!.id,
        expires_at: keyExpiry || null,
      } as any);
      if (error) throw error;
      toast.success("Chave API criada!");
      setCreateKeyOpen(false);
      setKeyLabel("");
      setKeyExpiry("");
      fetchApiKeys();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleKey = async (key: ApiKey) => {
    const { error } = await supabase.from('tv_api_keys').update({ is_active: !key.is_active } as any).eq('id', key.id);
    if (error) toast.error(error.message);
    else {
      toast.success(key.is_active ? "Chave desativada" : "Chave ativada");
      fetchApiKeys();
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;
    const { error } = await supabase.from('tv_api_keys').delete().eq('id', selectedKey.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Chave excluída");
      setDeleteKeyOpen(false);
      fetchApiKeys();
    }
  };

  const handleSendCommand = async () => {
    if (!cmdUnitId) { toast.error("Selecione uma TV"); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let payload = {};
      if (cmdPayload.trim()) {
        try { payload = JSON.parse(cmdPayload); } catch { toast.error("Payload JSON inválido"); setSubmitting(false); return; }
      }

      const targetIds = cmdUnitId === 'all' ? units.map(u => u.id) : [cmdUnitId];

      const { error } = await supabase.from('tv_commands').insert(
        targetIds.map(id => ({
          unit_id: id,
          command: cmdType,
          payload,
          created_by: user!.id,
        } as any))
      );
      if (error) throw error;
      toast.success(`Comando enviado para ${targetIds.length} TV(s)`);
      setSendCommandOpen(false);
      setCmdPayload("");
      fetchCommands();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId); else next.add(keyId);
      return next;
    });
  };

  const handleCreateOta = async () => {
    if (!otaVersion.trim() || !otaVersionCode.trim()) {
      toast.error("Versão e código são obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tv_ota_releases').insert({
        version: otaVersion.trim(),
        version_code: parseInt(otaVersionCode, 10),
        channel: otaChannel,
        release_notes: otaReleaseNotes.trim() || null,
        file_url: otaFileUrl.trim() || null,
        file_size_bytes: otaFileSize ? parseInt(otaFileSize, 10) : null,
        checksum_sha256: otaChecksum.trim() || null,
        is_mandatory: otaIsMandatory,
        min_version_code: otaMinVersionCode ? parseInt(otaMinVersionCode, 10) : 0,
        created_by: user!.id,
      } as any);
      if (error) throw error;
      toast.success("Release OTA criada!");
      setCreateOtaOpen(false);
      resetOtaForm();
      fetchOtaReleases();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetOtaForm = () => {
    setOtaVersion(""); setOtaVersionCode(""); setOtaChannel("stable");
    setOtaReleaseNotes(""); setOtaFileUrl(""); setOtaFileSize("");
    setOtaChecksum(""); setOtaIsMandatory(false); setOtaMinVersionCode("");
  };

  const handleToggleOta = async (release: OtaRelease) => {
    const { error } = await supabase.from('tv_ota_releases').update({ is_active: !release.is_active } as any).eq('id', release.id);
    if (error) toast.error(error.message);
    else {
      toast.success(release.is_active ? "Release desativada" : "Release ativada");
      fetchOtaReleases();
    }
  };

  const handleDeleteOta = async () => {
    if (!selectedOta) return;
    const { error } = await supabase.from('tv_ota_releases').delete().eq('id', selectedOta.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Release excluída");
      setDeleteOtaOpen(false);
      fetchOtaReleases();
    }
  };

  const filteredOtaReleases = otaReleases.filter(r =>
    otaChannelFilter === 'all' || r.channel === otaChannelFilter
  );

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filteredLogs = logs.filter(l => {
    if (logUnitFilter !== 'all' && l.unit_id !== logUnitFilter) return false;
    if (logLevelFilter !== 'all' && l.level !== logLevelFilter) return false;
    return true;
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiBaseUrl = `https://${projectId}.supabase.co/functions/v1/tv-api`;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API TV</h1>
        <p className="text-sm text-muted-foreground">Gerenciar chaves de acesso, comandos e logs do app de TV</p>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys" className="gap-1.5"><Key className="h-3.5 w-3.5" />Chaves API</TabsTrigger>
          <TabsTrigger value="commands" className="gap-1.5"><Send className="h-3.5 w-3.5" />Comandos</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="ota" className="gap-1.5"><Package className="h-3.5 w-3.5" />OTA</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5"><Monitor className="h-3.5 w-3.5" />Documentação</TabsTrigger>
          <TabsTrigger value="ratelimit" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Rate Limit</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => setCreateKeyOpen(true)}>
              <Plus className="h-4 w-4" /> Nova Chave
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Ativa</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Chave</TableHead>
                    <TableHead className="text-xs">Criada em</TableHead>
                    <TableHead className="text-xs">Último uso</TableHead>
                    <TableHead className="text-xs">Expira em</TableHead>
                    <TableHead className="text-xs w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map(k => (
                    <TableRow key={k.id} className={`text-sm ${!k.is_active ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <Switch checked={k.is_active} onCheckedChange={() => handleToggleKey(k)} />
                      </TableCell>
                      <TableCell className="font-medium">{k.label}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] truncate">
                            {visibleKeys.has(k.id) ? k.api_key : '••••••••••••••••'}
                          </code>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyVisibility(k.id)}>
                            {visibleKeys.has(k.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(k.api_key)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('pt-BR') + ' ' + new Date(k.last_used_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {k.expires_at ? new Date(k.expires_at).toLocaleDateString('pt-BR') : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => { setSelectedKey(k); setDeleteKeyOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {apiKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhuma chave API criada. Crie uma para conectar o app de TV.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => setSendCommandOpen(true)}>
              <Send className="h-4 w-4" /> Enviar Comando
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">TV</TableHead>
                    <TableHead className="text-xs">Comando</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Enviado em</TableHead>
                    <TableHead className="text-xs">Confirmado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.map(c => (
                    <TableRow key={c.id} className="text-sm">
                      <TableCell className="font-medium">{c.store_tv_units?.label || c.unit_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.command}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'acknowledged' ? 'default' : c.status === 'pending' ? 'secondary' : 'destructive'}>
                          {c.status === 'pending' ? 'Pendente' : c.status === 'acknowledged' ? 'Confirmado' : c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.acknowledged_at ? new Date(c.acknowledged_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {commands.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum comando enviado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs">TV</Label>
              <Select value={logUnitFilter} onValueChange={setLogUnitFilter}>
                <SelectTrigger className="w-48 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as TVs</SelectItem>
                  {units.map(u => <SelectItem key={u.id} value={u.id}>{u.store_tvs?.store_name} - {u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nível</Label>
              <Select value={logLevelFilter} onValueChange={setLogLevelFilter}>
                <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={fetchLogs}>
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Nível</TableHead>
                    <TableHead className="text-xs">TV</TableHead>
                    <TableHead className="text-xs">Evento</TableHead>
                    <TableHead className="text-xs">Detalhes</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(l => (
                    <TableRow key={l.id} className="text-sm">
                      <TableCell>
                        <Badge variant={l.level === 'error' ? 'destructive' : l.level === 'warn' ? 'secondary' : 'outline'} className="text-[10px]">
                          {l.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs">{l.store_tv_units?.label || l.unit_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{l.event}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {JSON.stringify(l.details)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum log encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OTA Tab */}
        <TabsContent value="ota" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 items-end">
              <div>
                <Label className="text-xs">Canal</Label>
                <Select value={otaChannelFilter} onValueChange={setOtaChannelFilter}>
                  <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={fetchOtaReleases}>
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setCreateOtaOpen(true)}>
              <Upload className="h-4 w-4" /> Nova Release
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Ativa</TableHead>
                    <TableHead className="text-xs">Versão</TableHead>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Canal</TableHead>
                    <TableHead className="text-xs">Tamanho</TableHead>
                    <TableHead className="text-xs">Obrigatória</TableHead>
                    <TableHead className="text-xs">Notas</TableHead>
                    <TableHead className="text-xs">Criada em</TableHead>
                    <TableHead className="text-xs w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOtaReleases.map(r => (
                    <TableRow key={r.id} className={`text-sm ${!r.is_active ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={() => handleToggleOta(r)} />
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{r.version}</TableCell>
                      <TableCell className="font-mono text-xs">{r.version_code}</TableCell>
                      <TableCell>
                        <Badge variant={r.channel === 'stable' ? 'default' : 'secondary'}>
                          {r.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatBytes(r.file_size_bytes)}</TableCell>
                      <TableCell>
                        {r.is_mandatory ? (
                          <Badge variant="destructive" className="text-[10px]">Sim</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.release_notes || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.file_url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(r.file_url!, '_blank')}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => { setSelectedOta(r); setDeleteOtaOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredOtaReleases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        Nenhuma release OTA encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* OTA Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground">Total de releases</div>
                <div className="text-2xl font-bold">{otaReleases.length}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground">Última stable</div>
                <div className="text-lg font-semibold font-mono">
                  {otaReleases.find(r => r.channel === 'stable' && r.is_active)?.version || '—'}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground">Última beta</div>
                <div className="text-lg font-semibold font-mono">
                  {otaReleases.find(r => r.channel === 'beta' && r.is_active)?.version || '—'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rate Limit Tab */}
        <TabsContent value="ratelimit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Uso em tempo real</h3>
              <p className="text-xs text-muted-foreground">Atualiza automaticamente a cada 10 segundos • Limite: {RATE_LIMIT_MAX} req/min por chave</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={fetchRateLimits}>
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma chave API criada.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {apiKeys.map(key => {
                const rl = rateLimits.find(r => r.api_key_id === key.id);
                const count = rl?.request_count || 0;
                const percentage = Math.min((count / RATE_LIMIT_MAX) * 100, 100);
                const isWarning = percentage >= 70;
                const isDanger = percentage >= 90;
                const windowAge = rl ? Math.round((Date.now() - new Date(rl.window_start).getTime()) / 1000) : null;

                return (
                  <Card key={key.id} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Activity className={`h-4 w-4 ${isDanger ? 'text-destructive' : isWarning ? 'text-yellow-500' : 'text-primary'}`} />
                          {key.label}
                        </CardTitle>
                        <Badge variant={!key.is_active ? 'secondary' : isDanger ? 'destructive' : isWarning ? 'secondary' : 'default'}>
                          {!key.is_active ? 'Inativa' : isDanger ? 'Crítico' : isWarning ? 'Alto' : 'Normal'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Requisições / min</span>
                          <span className={`font-mono font-semibold ${isDanger ? 'text-destructive' : isWarning ? 'text-yellow-600' : 'text-foreground'}`}>
                            {count} / {RATE_LIMIT_MAX}
                          </span>
                        </div>
                        <Progress
                          value={percentage}
                          className={`h-2.5 ${isDanger ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-yellow-500' : ''}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="block font-medium text-foreground">Último uso</span>
                          {key.last_used_at
                            ? new Date(key.last_used_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'Nunca'}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Janela ativa</span>
                          {windowAge !== null ? `${windowAge}s atrás` : 'Sem atividade'}
                        </div>
                      </div>
                      {percentage >= 100 && (
                        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Rate limit atingido! Requisições bloqueadas.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Histórico recente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Chave</TableHead>
                    <TableHead className="text-xs">Requisições</TableHead>
                    <TableHead className="text-xs">% Usado</TableHead>
                    <TableHead className="text-xs">Janela</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateLimits.length > 0 ? rateLimits.map((rl, i) => {
                    const pct = Math.min((rl.request_count / RATE_LIMIT_MAX) * 100, 100);
                    return (
                      <TableRow key={i} className="text-sm">
                        <TableCell className="font-medium text-xs">{rl.label}</TableCell>
                        <TableCell className="font-mono text-xs">{rl.request_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className={`h-1.5 w-20 ${pct >= 90 ? '[&>div]:bg-destructive' : pct >= 70 ? '[&>div]:bg-yellow-500' : ''}`} />
                            <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(rl.window_start).toLocaleTimeString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground text-xs">
                        Nenhuma atividade de rate limiting registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Documentação da API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-2">Base URL</h3>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-3 py-2 rounded font-mono break-all">{apiBaseUrl}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(apiBaseUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Autenticação</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Todas as requisições devem incluir os headers:
                </p>
                <pre className="text-xs bg-muted p-3 rounded font-mono overflow-x-auto">
{`x-api-key: <sua_chave_api>
x-unit-id: <id_da_unidade_tv>`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Endpoints</h3>

                {[
                  {
                    method: 'GET', path: '/playlist',
                    desc: 'Buscar a playlist atribuída à TV com todos os itens de mídia.',
                    response: '{ unit: {...}, playlist: { ...playlistData, items: [...] } }',
                  },
                  {
                    method: 'POST', path: '/heartbeat',
                    desc: 'Reportar que a TV está online. Enviar a cada 30 segundos.',
                    body: '{ "metrics": { "cpu": 45, "memory": 60 } }',
                    response: '{ ok: true, server_time: "..." }',
                  },
                  {
                    method: 'GET', path: '/commands',
                    desc: 'Buscar comandos pendentes (reload, change_playlist, restart, etc).',
                    response: '{ commands: [{ id, command, payload, created_at }] }',
                  },
                  {
                    method: 'POST', path: '/commands/ack',
                    desc: 'Confirmar que um comando foi recebido e executado.',
                    body: '{ "command_id": "uuid" }',
                    response: '{ ok: true }',
                  },
                  {
                    method: 'POST', path: '/logs',
                    desc: 'Enviar logs e métricas do app (máx. 50 por requisição).',
                    body: '{ "logs": [{ "level": "info", "event": "playback_start", "details": {} }] }',
                    response: '{ ok: true, count: 1 }',
                  },
                  {
                    method: 'GET', path: '/config',
                    desc: 'Buscar configurações da unidade de TV e dados da loja.',
                    response: '{ unit: { id, label, tv_format, store: { store_name, city } } }',
                  },
                  {
                    method: 'GET', path: '/ota/check',
                    desc: 'Verificar se há atualização OTA disponível. Parâmetros: current_version_code (int), channel (stable|beta).',
                    response: '{ update_available: true, update: { version, version_code, file_url, file_size_bytes, checksum_sha256, is_mandatory, release_notes } }',
                  },
                ].map(ep => (
                  <div key={ep.path} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={ep.method === 'GET' ? 'default' : 'secondary'}>{ep.method}</Badge>
                      <code className="text-sm font-mono font-semibold">{ep.path}</code>
                    </div>
                    <p className="text-xs text-muted-foreground">{ep.desc}</p>
                    {ep.body && (
                      <div>
                        <span className="text-xs font-medium">Body:</span>
                        <pre className="text-xs bg-muted p-2 rounded font-mono mt-1">{ep.body}</pre>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-medium">Response:</span>
                      <pre className="text-xs bg-muted p-2 rounded font-mono mt-1 overflow-x-auto">{ep.response}</pre>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <h3 className="font-semibold text-sm">Comandos Disponíveis</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { cmd: 'reload', desc: 'Recarregar playlist' },
                    { cmd: 'restart', desc: 'Reiniciar o app' },
                    { cmd: 'change_playlist', desc: 'Trocar playlist (payload: { playlist_id })' },
                    { cmd: 'update', desc: 'Atualizar o app' },
                    { cmd: 'screenshot', desc: 'Capturar tela' },
                    { cmd: 'set_volume', desc: 'Alterar volume (payload: { volume: 0-100 })' },
                  ].map(c => (
                    <div key={c.cmd} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className="shrink-0 text-[10px]">{c.cmd}</Badge>
                      <span className="text-muted-foreground">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Key Dialog */}
      <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Chave API</DialogTitle>
            <DialogDescription>Gerar uma nova chave de autenticação para o app de TV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da chave</Label>
              <Input value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="Ex: TV Loja Centro" />
            </div>
            <div>
              <Label>Data de expiração (opcional)</Label>
              <Input type="date" value={keyExpiry} onChange={e => setKeyExpiry(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para chave sem expiração.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateKeyOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateKey} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gerar Chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Confirm */}
      <AlertDialog open={deleteKeyOpen} onOpenChange={setDeleteKeyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chave API?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave <strong>{selectedKey?.label}</strong> será excluída permanentemente. Todos os apps usando esta chave perderão acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create OTA Release Dialog */}
      <Dialog open={createOtaOpen} onOpenChange={setCreateOtaOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Release OTA</DialogTitle>
            <DialogDescription>Publicar uma nova versão para atualização remota das TVs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Versão *</Label>
                <Input value={otaVersion} onChange={e => setOtaVersion(e.target.value)} placeholder="1.2.0" />
              </div>
              <div>
                <Label>Código da versão *</Label>
                <Input type="number" value={otaVersionCode} onChange={e => setOtaVersionCode(e.target.value)} placeholder="120" />
              </div>
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={otaChannel} onValueChange={setOtaChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL do arquivo (APK/bundle)</Label>
              <Input value={otaFileUrl} onChange={e => setOtaFileUrl(e.target.value)} placeholder="https://..." />
              <p className="text-xs text-muted-foreground mt-1">URL pública do arquivo de atualização.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tamanho (bytes)</Label>
                <Input type="number" value={otaFileSize} onChange={e => setOtaFileSize(e.target.value)} placeholder="15000000" />
              </div>
              <div>
                <Label>Versão mínima (código)</Label>
                <Input type="number" value={otaMinVersionCode} onChange={e => setOtaMinVersionCode(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Checksum SHA-256</Label>
              <Input value={otaChecksum} onChange={e => setOtaChecksum(e.target.value)} placeholder="abc123..." className="font-mono text-xs" />
            </div>
            <div>
              <Label>Notas da versão</Label>
              <Textarea value={otaReleaseNotes} onChange={e => setOtaReleaseNotes(e.target.value)} placeholder="Correções de bugs, novas funcionalidades..." rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={otaIsMandatory} onCheckedChange={setOtaIsMandatory} />
              <Label className="text-sm">Atualização obrigatória</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOtaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateOta} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publicar Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete OTA Confirm */}
      <AlertDialog open={deleteOtaOpen} onOpenChange={setDeleteOtaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir release OTA?</AlertDialogTitle>
            <AlertDialogDescription>
              A release <strong>v{selectedOta?.version}</strong> (código {selectedOta?.version_code}) será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Command Dialog */}
      <Dialog open={sendCommandOpen} onOpenChange={setSendCommandOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Comando</DialogTitle>
            <DialogDescription>Enviar um comando para uma ou todas as TVs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>TV de destino</Label>
              <Select value={cmdUnitId} onValueChange={setCmdUnitId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔊 Todas as TVs</SelectItem>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.store_tvs?.store_name} - {u.label} {u.is_online ? '🟢' : '🔴'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comando</Label>
              <Select value={cmdType} onValueChange={setCmdType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reload">Recarregar Playlist</SelectItem>
                  <SelectItem value="restart">Reiniciar App</SelectItem>
                  <SelectItem value="change_playlist">Trocar Playlist</SelectItem>
                  <SelectItem value="update">Atualizar App</SelectItem>
                  <SelectItem value="screenshot">Capturar Tela</SelectItem>
                  <SelectItem value="set_volume">Alterar Volume</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payload JSON (opcional)</Label>
              <Textarea
                value={cmdPayload}
                onChange={e => setCmdPayload(e.target.value)}
                placeholder='{"playlist_id": "uuid"}'
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendCommandOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendCommand} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTvApiPage;
