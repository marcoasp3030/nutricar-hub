import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, FileText, Package, CheckCircle, Clock, XCircle, BarChart3, Filter, History, Users, Search, Copy, LayoutTemplate, Eye, Monitor, CalendarDays, Tv, Play, Grid3X3, Link2, ToggleLeft, ToggleRight, ShoppingBag, Download, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { exportToXLSX, exportToPDF, type ExportColumn } from "@/lib/exportUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FornecedorSelector = ({ fornecedores, selected, onChange }: { fornecedores: string[]; selected: string[]; onChange: (v: string[]) => void }) => {
  const [search, setSearch] = useState("");
  const filtered = fornecedores.filter(f => f.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <Label className="flex items-center gap-1.5 mb-2"><Users className="h-4 w-4" /> Fornecedores Atribuídos</Label>
      <p className="text-xs text-muted-foreground mb-2">Selecione os fornecedores que terão acesso a este pacote. Se nenhum for selecionado, ficará disponível para todos.</p>
      {fornecedores.length > 5 && (
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Buscar fornecedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}
      <div className="max-h-44 overflow-y-auto border rounded-md p-2 space-y-0.5">
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{fornecedores.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum resultado"}</p>}
        {filtered.map(f => (
          <label key={f} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
            <Checkbox
              checked={selected.includes(f)}
              onCheckedChange={(checked) => onChange(checked ? [...selected, f] : selected.filter(x => x !== f))}
            />
            <span className="text-sm truncate">{f}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{selected.length} selecionado(s)</Badge>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onChange([])}>Limpar</Button>
        </div>
      )}
    </div>
  );
};

interface FieldDefinition {
  id: string;
  name: string;
  field_type: string;
  options: string[];
  applies_to: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface LocalCustomFieldDefinition {
  id: string;
  name: string;
  field_type: "text" | "number" | "select";
  options: string[];
  is_required: boolean;
}

interface AdPackage {
  id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  duration_months: number;
  display_frequency: string;
  playlist_id: string | null;
  is_active: boolean;
  created_at: string;
  custom_fields?: any;
}

interface AdPackageTemplate {
  id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  duration_months: number;
  display_frequency: string;
  media_type: string | null;
  screen_position: string | null;
  display_schedule: string | null;
  content_format: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  custom_fields?: any;
}

// Built-in fields available for templates and packages
type BuiltinField = { key: string; label: string; type: "text" | "number" | "select" | "textarea"; options?: { value: string; label: string }[] };
const BUILTIN_FIELDS: BuiltinField[] = [
  { key: "description", label: "Descrição", type: "textarea" },
  { key: "monthly_value", label: "Valor Mensal (R$)", type: "number" },
  { key: "duration_months", label: "Duração (meses)", type: "number" },
  { key: "display_frequency", label: "Frequência de Exibição", type: "text" },
  { key: "media_type", label: "Tipo de Mídia", type: "select", options: [{ value: "video", label: "Vídeo" }, { value: "banner", label: "Banner" }, { value: "slide", label: "Slide" }, { value: "institucional", label: "Institucional" }] },
  { key: "screen_position", label: "Posição na Tela", type: "select", options: [{ value: "tela_cheia", label: "Tela Cheia" }, { value: "rodape", label: "Rodapé" }, { value: "lateral", label: "Lateral" }, { value: "topo", label: "Topo" }] },
  { key: "display_schedule", label: "Horário de Exibição", type: "select", options: [{ value: "integral", label: "Integral" }, { value: "manha", label: "Manhã" }, { value: "tarde", label: "Tarde" }, { value: "noite", label: "Noite" }, { value: "horario_comercial", label: "Horário Comercial" }] },
  { key: "content_format", label: "Formato do Conteúdo", type: "select", options: [{ value: "16:9", label: "16:9 (Paisagem)" }, { value: "9:16", label: "9:16 (Retrato)" }, { value: "1:1", label: "1:1 (Quadrado)" }, { value: "4:3", label: "4:3" }] },
  { key: "playlist_id", label: "Playlist Vinculada", type: "select" },
  { key: "tags", label: "Tags", type: "text" },
];
// Alias for backward compat
const BUILTIN_TPL_FIELDS = BUILTIN_FIELDS;

interface AdContract {
  id: string;
  fornecedor: string;
  package_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  ad_packages?: AdPackage;
}

interface AdPayment {
  id: string;
  contract_id: string;
  month_ref: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  ad_contracts?: AdContract;
}

interface Playlist {
  id: string;
  name: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  active: { label: "Ativo", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  expired: { label: "Expirado", variant: "secondary" },
};

const PAY_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

const AdminAdvertisingPage = () => {
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [contracts, setContracts] = useState<AdContract[]>([]);
  const [payments, setPayments] = useState<AdPayment[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [packageFornecedores, setPackageFornecedores] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AdPackageTemplate[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([]);
  const [fieldDefDialog, setFieldDefDialog] = useState(false);
  const [editingFieldDef, setEditingFieldDef] = useState<FieldDefinition | null>(null);
  const [fieldDefForm, setFieldDefForm] = useState({ name: "", field_type: "text", options: "", applies_to: "both", is_required: false, sort_order: "0" });
  const [pkgCustomFields, setPkgCustomFields] = useState<Record<string, any>>({});
  const [tplCustomFields, setTplCustomFields] = useState<Record<string, any>>({});
  const [tplCustomFieldDefs, setTplCustomFieldDefs] = useState<LocalCustomFieldDefinition[]>([]);
  const [tplNewCustomField, setTplNewCustomField] = useState({ name: "", field_type: "text" as "text" | "number" | "select", options: "", is_required: false });

  // Template form - dynamic fields
  const [tplDialog, setTplDialog] = useState(false);
  const [editingTpl, setEditingTpl] = useState<AdPackageTemplate | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplIsActive, setTplIsActive] = useState(true);
  const [tplEnabledFields, setTplEnabledFields] = useState<string[]>([]);
  const [tplFieldValues, setTplFieldValues] = useState<Record<string, any>>({});

  // Package form - dynamic fields (same pattern as templates)
  const [pkgDialog, setPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<AdPackage | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [pkgEnabledFields, setPkgEnabledFields] = useState<string[]>([]);
  const [pkgFieldValues, setPkgFieldValues] = useState<Record<string, any>>({});
  const [pkgSelectedFornecedores, setPkgSelectedFornecedores] = useState<string[]>([]);

  // Contract form
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<AdContract | null>(null);
  const [contractForm, setContractForm] = useState({ fornecedor: "", package_id: "", status: "pending", start_date: "", end_date: "", notes: "" });

  // Payment form
  const [payDialog, setPayDialog] = useState(false);
  const [editingPay, setEditingPay] = useState<AdPayment | null>(null);
  const [payForm, setPayForm] = useState({ contract_id: "", month_ref: "", amount: "", status: "pending", payment_method: "pix", notes: "", paid_at: "" });

  // Period filter
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Payment filters
  const [payFilterFornecedor, setPayFilterFornecedor] = useState("__all__");
  const [payFilterStatus, setPayFilterStatus] = useState("__all__");
  const [payFilterMethod, setPayFilterMethod] = useState("__all__");
  const [payFilterFrom, setPayFilterFrom] = useState("__all__");
  const [payFilterTo, setPayFilterTo] = useState("__all__");

  // Tag filter for packages
  const [filterTag, setFilterTag] = useState<string>("__all__");

  // History
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [pkgRes, contractRes, payRes, playlistRes, fornRes, pkgFornRes, tplRes, fdRes] = await Promise.all([
      supabase.from("ad_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_contracts").select("*, ad_packages(*)").order("created_at", { ascending: false }),
      supabase.from("ad_payments").select("*, ad_contracts(*, ad_packages(*))").order("created_at", { ascending: false }),
      supabase.from("playlists").select("id, name").order("name"),
      supabase.from("user_fornecedores").select("fornecedor"),
      supabase.from("ad_package_fornecedores").select("*"),
      supabase.from("ad_package_templates").select("*").order("name"),
      supabase.from("ad_field_definitions").select("*").order("sort_order"),
    ]);
    setPackages(pkgRes.data as any || []);
    setContracts(contractRes.data as any || []);
    setPayments(payRes.data as any || []);
    setPlaylists(playlistRes.data || []);
    const uniqueF = [...new Set((fornRes.data || []).map((f: any) => f.fornecedor))].filter(f => f && f.trim() !== "");
    setFornecedores(uniqueF);
    const pfMap: Record<string, string[]> = {};
    (pkgFornRes.data || []).forEach((pf: any) => {
      if (!pfMap[pf.package_id]) pfMap[pf.package_id] = [];
      pfMap[pf.package_id].push(pf.fornecedor);
    });
    setPackageFornecedores(pfMap);
    setTemplates((tplRes.data || []) as AdPackageTemplate[]);
    setFieldDefs((fdRes.data || []) as FieldDefinition[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // === Field Definition CRUD ===
  const openFieldDefCreate = () => {
    setEditingFieldDef(null);
    setFieldDefForm({ name: "", field_type: "text", options: "", applies_to: "both", is_required: false, sort_order: "0" });
    setFieldDefDialog(true);
  };
  const openFieldDefEdit = (fd: FieldDefinition) => {
    setEditingFieldDef(fd);
    setFieldDefForm({ name: fd.name, field_type: fd.field_type, options: (fd.options || []).join(", "), applies_to: fd.applies_to, is_required: fd.is_required, sort_order: String(fd.sort_order) });
    setFieldDefDialog(true);
  };
  const saveFieldDef = async () => {
    if (!fieldDefForm.name.trim()) { toast.error("Nome do campo é obrigatório"); return; }
    const optionsArr = fieldDefForm.field_type === "select" ? fieldDefForm.options.split(",").map(o => o.trim()).filter(Boolean) : [];
    const payload = { name: fieldDefForm.name, field_type: fieldDefForm.field_type, options: optionsArr, applies_to: fieldDefForm.applies_to, is_required: fieldDefForm.is_required, sort_order: parseInt(fieldDefForm.sort_order) || 0, is_active: true };
    if (editingFieldDef) {
      const { error } = await supabase.from("ad_field_definitions").update(payload).eq("id", editingFieldDef.id);
      if (error) { toast.error("Erro ao atualizar campo"); return; }
    } else {
      const { error } = await supabase.from("ad_field_definitions").insert(payload);
      if (error) { toast.error("Erro ao criar campo"); return; }
    }
    toast.success(editingFieldDef ? "Campo atualizado" : "Campo criado");
    setFieldDefDialog(false);
    fetchAll();
  };
  const deleteFieldDef = async (id: string) => {
    if (!confirm("Excluir este campo personalizado?")) return;
    await supabase.from("ad_field_definitions").delete().eq("id", id);
    toast.success("Campo excluído");
    fetchAll();
  };

  // Helper: get field defs for a target
  const getFieldsFor = (target: "packages" | "templates") => fieldDefs.filter(fd => fd.is_active && (fd.applies_to === "both" || fd.applies_to === target));

  // === Package CRUD (dynamic fields) ===
  const detectPkgEnabledFields = (pkg: any) => {
    const enabled: string[] = [];
    const values: Record<string, any> = {};
    for (const bf of BUILTIN_FIELDS) {
      const val = pkg[bf.key];
      if (bf.key === "tags") {
        const tags = pkg.tags || [];
        if (tags.length > 0) { enabled.push(bf.key); values[bf.key] = tags.join(", "); }
      } else if (bf.key === "playlist_id") {
        if (val) { enabled.push(bf.key); values[bf.key] = val; }
      } else if (val !== null && val !== undefined && String(val).trim() !== "" && val !== 0) {
        enabled.push(bf.key);
        values[bf.key] = String(val);
      }
    }
    return { enabled, values };
  };

  const openPkgCreate = () => {
    setEditingPkg(null);
    setPkgName("");
    setPkgIsActive(true);
    setPkgEnabledFields([]);
    setPkgFieldValues({});
    setPkgSelectedFornecedores([]);
    setPkgCustomFields({});
    setPkgDialog(true);
  };
  const openPkgEdit = (pkg: AdPackage) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgIsActive(pkg.is_active);
    const { enabled, values } = detectPkgEnabledFields(pkg);
    setPkgEnabledFields(enabled);
    setPkgFieldValues(values);
    setPkgSelectedFornecedores(packageFornecedores[pkg.id] || []);
    setPkgCustomFields((pkg as any).custom_fields || {});
    setPkgDialog(true);
  };
  const addPkgField = (key: string) => {
    if (!pkgEnabledFields.includes(key)) setPkgEnabledFields(prev => [...prev, key]);
  };
  const removePkgField = (key: string) => {
    setPkgEnabledFields(prev => prev.filter(k => k !== key));
    setPkgFieldValues(prev => { const n = { ...prev }; delete n[key]; return n; });
  };
  const savePkg = async () => {
    if (!pkgName.trim()) { toast.error("Nome é obrigatório"); return; }
    // Validate required custom fields
    const requiredPkgFields = getFieldsFor("packages").filter(fd => fd.is_required);
    const missingPkg = requiredPkgFields.filter(fd => !pkgCustomFields[fd.id] || String(pkgCustomFields[fd.id]).trim() === "");
    if (missingPkg.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missingPkg.map(f => f.name).join(", ")}`);
      return;
    }
    const v = pkgFieldValues;
    const tagsArr = v.tags ? String(v.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    const payload: any = {
      name: pkgName,
      description: v.description || null,
      monthly_value: parseFloat(v.monthly_value) || 0,
      duration_months: parseInt(v.duration_months) || 1,
      display_frequency: v.display_frequency || "30s a cada 5 min",
      playlist_id: v.playlist_id || null,
      is_active: pkgIsActive,
      media_type: v.media_type || null,
      screen_position: v.screen_position || null,
      display_schedule: v.display_schedule || null,
      content_format: v.content_format || null,
      tags: tagsArr,
      custom_fields: pkgCustomFields,
    };
    let pkgId = editingPkg?.id;
    if (editingPkg) {
      const { error } = await supabase.from("ad_packages").update(payload).eq("id", editingPkg.id);
      if (error) { toast.error("Erro ao atualizar pacote"); return; }
    } else {
      const { data, error } = await supabase.from("ad_packages").insert(payload).select("id").single();
      if (error || !data) { toast.error("Erro ao criar pacote"); return; }
      pkgId = data.id;
    }
    // Sync fornecedor assignments
    if (pkgId) {
      await supabase.from("ad_package_fornecedores").delete().eq("package_id", pkgId);
      if (pkgSelectedFornecedores.length > 0) {
        await supabase.from("ad_package_fornecedores").insert(
          pkgSelectedFornecedores.map(f => ({ package_id: pkgId!, fornecedor: f }))
        );
      }
    }
    toast.success(editingPkg ? "Pacote atualizado" : "Pacote criado");
    setPkgDialog(false);
    fetchAll();
  };
  const deletePkg = async (id: string) => {
    if (!confirm("Excluir este pacote?")) return;
    await supabase.from("ad_packages").delete().eq("id", id);
    toast.success("Pacote excluído");
    fetchAll();
  };

  // === Template CRUD ===
  const openTplCreate = () => {
    setEditingTpl(null);
    setTplName("");
    setTplIsActive(true);
    setTplEnabledFields([]);
    setTplFieldValues({});
    setTplCustomFields({});
    setTplCustomFieldDefs([]);
    setTplNewCustomField({ name: "", field_type: "text", options: "", is_required: false });
    setTplDialog(true);
  };
  const openTplEdit = (tpl: AdPackageTemplate) => {
    setEditingTpl(tpl);
    setTplName(tpl.name);
    setTplIsActive(tpl.is_active);
    const cf = { ...((tpl as any).custom_fields || {}) };
    const storedBuiltinEnabled: string[] = cf._enabled_fields || [];
    const storedAllEnabled: string[] = cf._enabled_fields_all || storedBuiltinEnabled;
    delete cf._enabled_fields;
    delete cf._enabled_fields_all;
    
    // Use stored enabled fields; for old templates without _enabled_fields, start empty
    const enabled: string[] = [...storedAllEnabled];
    const vals: Record<string, any> = {};
    for (const key of storedAllEnabled) {
      if (key.startsWith("custom_")) continue; // custom fields handled via tplCustomFields
      if (key === "description" && tpl.description) vals.description = tpl.description;
      else if (key === "monthly_value") vals.monthly_value = String(tpl.monthly_value);
      else if (key === "duration_months") vals.duration_months = String(tpl.duration_months);
      else if (key === "tags" && tpl.tags?.length) vals.tags = tpl.tags.join(", ");
      else if ((tpl as any)[key]) vals[key] = (tpl as any)[key];
    }
    setTplEnabledFields(enabled);
    setTplFieldValues(vals);
    setTplCustomFields(cf);
    setTplDialog(true);
  };
  const addTplField = (key: string) => {
    if (!tplEnabledFields.includes(key)) {
      setTplEnabledFields(prev => [...prev, key]);
    }
  };
  const removeTplField = (key: string) => {
    setTplEnabledFields(prev => prev.filter(k => k !== key));
    if (key.startsWith("custom_")) {
      const fdId = key.replace("custom_", "");
      setTplCustomFields((prev: Record<string, any>) => { const n = { ...prev }; delete n[fdId]; return n; });
    } else {
      setTplFieldValues((prev: Record<string, any>) => { const n = { ...prev }; delete n[key]; return n; });
    }
  };
  const moveTplField = (index: number, direction: "up" | "down") => {
    setTplEnabledFields(prev => {
      const arr = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return arr;
    });
  };
  const saveTpl = async () => {
    if (!tplName.trim()) { toast.error("Nome é obrigatório"); return; }
    // Validate required custom fields that are enabled
    const requiredTplFields = fieldDefs.filter(fd => fd.is_required && fd.is_active && (fd.applies_to === "both" || fd.applies_to === "templates") && tplEnabledFields.includes(`custom_${fd.id}`));
    const missingTpl = requiredTplFields.filter(fd => !tplCustomFields[fd.id] || String(tplCustomFields[fd.id]).trim() === "");
    if (missingTpl.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missingTpl.map(f => f.name).join(", ")}`);
      return;
    }
    const v = tplFieldValues;
    const tagsArr = v.tags ? String(v.tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    const payload: any = {
      name: tplName,
      description: v.description || null,
      monthly_value: parseFloat(v.monthly_value) || 0,
      duration_months: parseInt(v.duration_months) || 1,
      display_frequency: v.display_frequency || "30s a cada 5 min",
      media_type: v.media_type || null,
      screen_position: v.screen_position || null,
      display_schedule: v.display_schedule || null,
      content_format: v.content_format || null,
      tags: tagsArr,
      is_active: tplIsActive,
     custom_fields: { ...tplCustomFields, _enabled_fields: tplEnabledFields.filter(k => !k.startsWith("custom_")), _enabled_fields_all: [...tplEnabledFields] },
    };
    // Set non-enabled built-in fields to null so they don't get auto-detected
    const builtinKeys = ["monthly_value", "duration_months", "display_frequency", "media_type", "screen_position", "display_schedule", "content_format", "description", "tags"];
    for (const bk of builtinKeys) {
      if (!tplEnabledFields.includes(bk)) {
        if (bk === "monthly_value") payload[bk] = 0;
        else if (bk === "duration_months") payload[bk] = 1;
        else if (bk === "display_frequency") payload[bk] = "30s a cada 5 min";
        else if (bk === "tags") payload[bk] = [];
        else payload[bk] = null;
      }
    }
    if (editingTpl) {
      const { error } = await supabase.from("ad_package_templates").update(payload).eq("id", editingTpl.id);
      if (error) { toast.error("Erro ao atualizar template"); return; }
    } else {
      const { error } = await supabase.from("ad_package_templates").insert(payload);
      if (error) { console.error("Erro ao criar template:", error); toast.error("Erro ao criar template"); return; }
    }
    toast.success(editingTpl ? "Template atualizado" : "Template criado");
    setTplDialog(false);
    fetchAll();
  };
  const deleteTpl = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    await supabase.from("ad_package_templates").delete().eq("id", id);
    toast.success("Template excluído");
    fetchAll();
  };
  const createPkgFromTemplate = (tpl: AdPackageTemplate) => {
    setEditingPkg(null);
    setPkgName(tpl.name);
    setPkgIsActive(true);
    const cf = { ...((tpl as any).custom_fields || {}) };
    const storedAllEnabled: string[] = cf._enabled_fields_all || cf._enabled_fields || [];
    delete cf._enabled_fields;
    delete cf._enabled_fields_all;
    
    const builtinEnabled: string[] = [];
    const values: Record<string, any> = {};
    for (const key of storedAllEnabled) {
      if (key.startsWith("custom_")) continue;
      const bf = BUILTIN_FIELDS.find(b => b.key === key);
      if (bf) {
        builtinEnabled.push(key);
        const val = (tpl as any)[key];
        if (key === "tags") {
          const tags = (tpl as any).tags || [];
          if (tags.length > 0) values[key] = tags.join(", ");
        } else if (val !== null && val !== undefined) {
          values[key] = String(val);
        }
      }
    }
    setPkgEnabledFields(builtinEnabled);
    setPkgFieldValues(values);
    setPkgSelectedFornecedores([]);
    setPkgCustomFields(cf);
    setPkgDialog(true);
    toast.info("Pacote pré-preenchido a partir do template");
  };

  // === Contract CRUD ===
  const openContractCreate = () => {
    setEditingContract(null);
    setContractForm({ fornecedor: "", package_id: "", status: "pending", start_date: "", end_date: "", notes: "" });
    setContractDialog(true);
  };
  const openContractEdit = (c: AdContract) => {
    setEditingContract(c);
    setContractForm({ fornecedor: c.fornecedor, package_id: c.package_id, status: c.status, start_date: c.start_date || "", end_date: c.end_date || "", notes: c.notes || "" });
    setContractDialog(true);
  };
  const saveContract = async () => {
    const payload = { fornecedor: contractForm.fornecedor, package_id: contractForm.package_id, status: contractForm.status, start_date: contractForm.start_date || null, end_date: contractForm.end_date || null, notes: contractForm.notes || null };
    if (editingContract) {
      const { error } = await supabase.from("ad_contracts").update(payload).eq("id", editingContract.id);
      if (error) { toast.error("Erro ao atualizar contrato"); return; }
      toast.success("Contrato atualizado");
    } else {
      const { error } = await supabase.from("ad_contracts").insert(payload);
      if (error) { toast.error("Erro ao criar contrato"); return; }
      toast.success("Contrato criado");
    }
    setContractDialog(false);
    fetchAll();
  };
  const deleteContract = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    await supabase.from("ad_contracts").delete().eq("id", id);
    toast.success("Contrato excluído");
    fetchAll();
  };

  const openHistory = async (contractId: string) => {
    setHistoryContractId(contractId);
    setHistoryDialog(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from("ad_contract_history")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    setHistoryData(data || []);
    setHistoryLoading(false);
  };

  // === Payment CRUD ===
  const openPayCreate = () => {
    setEditingPay(null);
    setPayForm({ contract_id: "", month_ref: "", amount: "", status: "pending", payment_method: "pix", notes: "", paid_at: "" });
    setPayDialog(true);
  };
  const openPayEdit = (pay: AdPayment) => {
    setEditingPay(pay);
    setPayForm({
      contract_id: pay.contract_id,
      month_ref: pay.month_ref,
      amount: String(pay.amount),
      status: pay.status,
      payment_method: (pay as any).payment_method || "pix",
      notes: (pay as any).notes || "",
      paid_at: pay.paid_at ? pay.paid_at.slice(0, 10) : "",
    });
    setPayDialog(true);
  };
  const savePayment = async () => {
    const payload: any = {
      contract_id: payForm.contract_id,
      month_ref: payForm.month_ref,
      amount: parseFloat(payForm.amount) || 0,
      status: payForm.status,
      payment_method: payForm.payment_method,
      notes: payForm.notes || null,
      paid_at: payForm.status === "paid" ? (payForm.paid_at ? new Date(payForm.paid_at).toISOString() : new Date().toISOString()) : null,
    };
    if (editingPay) {
      const { error } = await supabase.from("ad_payments").update(payload).eq("id", editingPay.id);
      if (error) { toast.error("Erro ao atualizar pagamento"); return; }
      toast.success("Pagamento atualizado");
    } else {
      const { error } = await supabase.from("ad_payments").insert(payload);
      if (error) { toast.error("Erro ao registrar pagamento"); return; }
      toast.success("Pagamento registrado");
    }
    setPayDialog(false);
    fetchAll();
  };
  const togglePayStatus = async (pay: AdPayment) => {
    const newStatus = pay.status === "paid" ? "pending" : "paid";
    await supabase.from("ad_payments").update({ status: newStatus, paid_at: newStatus === "paid" ? new Date().toISOString() : null }).eq("id", pay.id);
    toast.success(`Pagamento marcado como ${newStatus === "paid" ? "pago" : "pendente"}`);
    fetchAll();
  };
  const deletePayment = async (id: string) => {
    if (!confirm("Excluir este pagamento?")) return;
    await supabase.from("ad_payments").delete().eq("id", id);
    toast.success("Pagamento excluído");
    fetchAll();
  };

  // === Filtered payments ===
  const filteredPayments = payments.filter(p => {
    if (payFilterFrom !== "__all__" && p.month_ref < payFilterFrom) return false;
    if (payFilterTo !== "__all__" && p.month_ref > payFilterTo) return false;
    if (payFilterFornecedor !== "__all__" && p.ad_contracts?.fornecedor !== payFilterFornecedor) return false;
    if (payFilterStatus !== "__all__" && p.status !== payFilterStatus) return false;
    if (payFilterMethod !== "__all__" && (p as any).payment_method !== payFilterMethod) return false;
    return true;
  });

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalMonthlyRevenue = activeContracts.reduce((sum, c) => sum + (c.ad_packages?.monthly_value || 0), 0);
  const totalPaid = filteredPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filteredPayments.filter(p => p.status !== "paid").reduce((sum, p) => sum + p.amount, 0);

  // === Chart data ===
  const revenueByMonth: Record<string, { paid: number; pending: number }> = {};
  filteredPayments.forEach(p => {
    if (!revenueByMonth[p.month_ref]) revenueByMonth[p.month_ref] = { paid: 0, pending: 0 };
    if (p.status === "paid") revenueByMonth[p.month_ref].paid += p.amount;
    else revenueByMonth[p.month_ref].pending += p.amount;
  });
  const chartData = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, paid: vals.paid, pending: vals.pending }));

  // === Available months for filter ===
  const allMonths = [...new Set(payments.map(p => p.month_ref))].filter(m => m && m.trim() !== "").sort();

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // === Dynamic custom fields renderer ===
  const renderCustomFields = (target: "packages" | "templates", values: Record<string, any>, onChange: (vals: Record<string, any>) => void) => {
    const fields = getFieldsFor(target);
    if (fields.length === 0) return null;
    return (
      <div className="space-y-3 border-t border-border pt-3">
        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Campos Personalizados</Label>
        {fields.map(fd => (
          <div key={fd.id}>
            <Label>{fd.name}{fd.is_required && <span className="text-destructive ml-0.5">*</span>}</Label>
            {fd.field_type === "text" && (
              <Input value={values[fd.id] || ""} onChange={e => onChange({ ...values, [fd.id]: e.target.value })} />
            )}
            {fd.field_type === "number" && (
              <Input type="number" step="any" value={values[fd.id] || ""} onChange={e => onChange({ ...values, [fd.id]: e.target.value })} />
            )}
            {fd.field_type === "select" && (
              <Select value={values[fd.id] || "__none__"} onValueChange={v => onChange({ ...values, [fd.id]: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Selecionar —</SelectItem>
                  {(fd.options || []).filter(o => o && o.trim() !== "").map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Publicidade</h1>
        {allMonths.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterFrom || "all"} onValueChange={v => setFilterFrom(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="De" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Início</SelectItem>
                {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">até</span>
            <Select value={filterTo || "all"} onValueChange={v => setFilterTo(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Até" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Fim</SelectItem>
                {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterFrom || filterTo) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFrom(""); setFilterTo(""); }}>Limpar</Button>
            )}
          </div>
        )}
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeContracts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalMonthlyRevenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalPaid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalPending)}</p></CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Receita Mensal por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} className="text-xs fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="paid" name="Recebido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pendente" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="packages" className="w-full">
        <TabsList>
          <TabsTrigger value="packages"><ShoppingBag className="h-4 w-4 mr-1" /> Produtos & Serviços</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="h-4 w-4 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="contracts"><FileText className="h-4 w-4 mr-1" /> Contratos</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> Pagamentos</TabsTrigger>
        </TabsList>

        {/* ===== PACOTES / PRODUTOS & SERVIÇOS ===== */}
        <TabsContent value="packages" className="space-y-4">
          {(() => {
            const allTags = [...new Set(packages.flatMap(p => (p as any).tags || []))].filter(t => t && t.trim() !== "").sort();
            const filtered = filterTag === "__all__" ? packages : packages.filter(p => ((p as any).tags || []).includes(filterTag));
            
            const MEDIA_LABELS: Record<string, string> = { video: "Vídeo", banner: "Banner", slide: "Slide", institucional: "Institucional" };
            const POSITION_LABELS: Record<string, string> = { tela_cheia: "Tela Cheia", rodape: "Rodapé", lateral: "Lateral", topo: "Topo" };
            const SCHEDULE_LABELS: Record<string, string> = { integral: "Integral", manha: "Manhã", tarde: "Tarde", noite: "Noite", horario_comercial: "Horário Comercial" };

            return (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {filtered.length} produto(s) cadastrado(s) • {filtered.filter(p => p.is_active).length} ativo(s)
                    </p>
                    {allTags.length > 0 && (
                      <>
                        <span className="text-border">|</span>
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={filterTag} onValueChange={setFilterTag}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Filtrar por tag" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas as tags</SelectItem>
                            {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  <Button onClick={openPkgCreate}><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map(pkg => {
                    const pkgContracts = contracts.filter(c => c.package_id === pkg.id);
                    const activeCount = pkgContracts.filter(c => c.status === "active").length;
                    const pkgPayments = payments.filter(p => p.ad_contracts?.package_id === pkg.id);
                    const totalRevenue = pkgPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
                    const pendingRevenue = pkgPayments.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
                    const assignedF = packageFornecedores[pkg.id] || [];
                    const mediaType = (pkg as any).media_type || "video";
                    const screenPos = (pkg as any).screen_position || "tela_cheia";
                    const schedule = (pkg as any).display_schedule || "integral";
                    const contentFmt = (pkg as any).content_format || "16:9";
                    const tags = (pkg as any).tags || [];

                    return (
                      <Card key={pkg.id} className={`relative overflow-hidden ${!pkg.is_active ? "opacity-60" : ""}`}>
                        {/* Status indicator stripe */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${pkg.is_active ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        
                        <CardHeader className="pb-3 pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{pkg.name}</CardTitle>
                              {pkg.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                              )}
                            </div>
                            <Badge variant={pkg.is_active ? "default" : "secondary"} className="shrink-0">
                              {pkg.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-0">
                          {/* Pricing */}
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary">{fmt(pkg.monthly_value)}</span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                            <span className="text-xs text-muted-foreground ml-1">• {pkg.duration_months} mês(es)</span>
                          </div>

                          {/* Specs grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Tv className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Mídia:</span>
                              <span className="font-medium">{MEDIA_LABELS[mediaType] || mediaType}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Posição:</span>
                              <span className="font-medium">{POSITION_LABELS[screenPos] || screenPos}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Horário:</span>
                              <span className="font-medium">{SCHEDULE_LABELS[schedule] || schedule}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Formato:</span>
                              <span className="font-medium">{contentFmt}</span>
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">Frequência:</span>
                              <span className="font-medium">{pkg.display_frequency}</span>
                            </div>
                            {pkg.playlist_id && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Playlist:</span>
                                <span className="font-medium truncate">{playlists.find(p => p.id === pkg.playlist_id)?.name || "—"}</span>
                              </div>
                            )}
                          </div>

                          {/* Revenue metrics */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-muted/50 p-2 text-center">
                              <p className="text-lg font-bold">{activeCount}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">Contratos Ativos</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2 text-center">
                              <p className="text-sm font-bold text-primary">{fmt(totalRevenue)}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">Recebido</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2 text-center">
                              <p className="text-sm font-bold">{fmt(pendingRevenue)}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">Pendente</p>
                            </div>
                          </div>

                          {/* Custom fields */}
                          {(() => {
                            const cf = (pkg as any).custom_fields || {};
                            const entries = Object.entries(cf).filter(([, v]) => v !== "" && v !== null && v !== undefined);
                            if (entries.length === 0) return null;
                            return (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border rounded-md p-2 bg-muted/30">
                                {entries.map(([k, v]) => {
                                  const fd = fieldDefs.find(f => f.id === k);
                                  return (
                                    <div key={k} className="flex flex-col">
                                      <span className="text-muted-foreground text-[10px] font-medium">{fd?.name || k}</span>
                                      <span className="font-medium truncate">{String(v)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                            </div>
                          )}

                          {/* Fornecedores */}
                          <div className="text-xs">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">
                                Fornecedores: {assignedF.length === 0 ? "Todos" : `${assignedF.length} atribuído(s)`}
                              </span>
                            </div>
                            {assignedF.length > 0 && (
                              <div className="flex gap-1 flex-wrap max-h-16 overflow-y-auto">
                                {assignedF.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1 border-t border-border">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => openPkgEdit(pkg)}>
                              <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              // Duplicate package
                              setEditingPkg(null);
                              setPkgName(`${pkg.name} (Cópia)`);
                              setPkgIsActive(true);
                              const { enabled, values } = detectPkgEnabledFields(pkg);
                              setPkgEnabledFields(enabled);
                              setPkgFieldValues(values);
                              setPkgSelectedFornecedores(assignedF);
                              setPkgCustomFields((pkg as any).custom_fields || {});
                              setPkgDialog(true);
                            }}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deletePkg(pkg.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="col-span-full text-center py-16">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground font-medium">Nenhum produto cadastrado</p>
                      <p className="text-xs text-muted-foreground mt-1">Crie produtos e serviços para oferecer aos fornecedores</p>
                      <Button className="mt-4" onClick={openPkgCreate}><Plus className="h-4 w-4 mr-1" /> Criar Primeiro Produto</Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </TabsContent>

        {/* ===== TEMPLATES ===== */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Templates pré-configurados para criar pacotes rapidamente.</p>
            <Button onClick={openTplCreate}><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => (
              <Card key={tpl.id} className={!tpl.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <Badge variant={tpl.is_active ? "default" : "secondary"}>{tpl.is_active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {tpl.description && <p className="text-xs text-muted-foreground">{tpl.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Valor:</span> {fmt(tpl.monthly_value)}/mês</div>
                    <div><span className="text-muted-foreground">Duração:</span> {tpl.duration_months} mês(es)</div>
                    <div><span className="text-muted-foreground">Mídia:</span> <span className="capitalize">{tpl.media_type || "—"}</span></div>
                    <div><span className="text-muted-foreground">Posição:</span> <span className="capitalize">{(tpl.screen_position || "—").replace("_", " ")}</span></div>
                    <div><span className="text-muted-foreground">Formato:</span> {tpl.content_format || "—"}</div>
                    <div><span className="text-muted-foreground">Horário:</span> <span className="capitalize">{(tpl.display_schedule || "—").replace("_", " ")}</span></div>
                  </div>
                  {tpl.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {tpl.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => createPkgFromTemplate(tpl)}>
                      <Copy className="h-3 w-3 mr-1" /> Usar Template
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openTplEdit(tpl)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteTpl(tpl.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-12">
                <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum template criado</p>
                <p className="text-xs text-muted-foreground mt-1">Crie templates para agilizar a criação de pacotes</p>
              </div>
            )}
          </div>

          {/* === Campos Personalizados === */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Campos Personalizados</CardTitle>
                <Button size="sm" onClick={openFieldDefCreate}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Campo</Button>
              </div>
              <p className="text-xs text-muted-foreground">Defina campos extras que aparecerão nos formulários de Pacote e Template.</p>
            </CardHeader>
            <CardContent>
              {fieldDefs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo personalizado criado ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Opções</TableHead>
                      <TableHead>Aplica-se a</TableHead>
                      <TableHead>Obrigatório</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldDefs.map(fd => (
                      <TableRow key={fd.id}>
                        <TableCell className="font-medium">{fd.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {fd.field_type === "text" ? "Texto" : fd.field_type === "number" ? "Número" : "Lista Suspensa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {fd.field_type === "select" ? (fd.options || []).join(", ") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {fd.applies_to === "both" ? "Pacotes & Templates" : fd.applies_to === "packages" ? "Pacotes" : "Templates"}
                        </TableCell>
                        <TableCell>{fd.is_required ? <CheckCircle className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground text-xs">Não</span>}</TableCell>
                        <TableCell className="text-xs">{fd.sort_order}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openFieldDefEdit(fd)}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteFieldDef(fd.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openContractCreate}><Plus className="h-4 w-4 mr-1" /> Novo Contrato</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.fornecedor}</TableCell>
                      <TableCell>{c.ad_packages?.name || "—"}</TableCell>
                      <TableCell>{fmt(c.ad_packages?.monthly_value || 0)}/mês</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-xs">{c.start_date || "—"}</TableCell>
                      <TableCell className="text-xs">{c.end_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openHistory(c.id)} title="Histórico"><History className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openContractEdit(c)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteContract(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum contrato cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== PAGAMENTOS ===== */}
        <TabsContent value="payments" className="space-y-4">
          {(() => {
            const METHOD_LABELS: Record<string, string> = { pix: "PIX", transferencia: "Transferência", boleto: "Boleto", dinheiro: "Dinheiro", outro: "Outro" };
            const payFornecedores = [...new Set(payments.map(p => p.ad_contracts?.fornecedor).filter(Boolean))].sort() as string[];
            const payMethods = [...new Set(payments.map(p => (p as any).payment_method).filter(Boolean))].filter(m => m && m.trim() !== "").sort() as string[];

            const PAY_EXPORT_COLUMNS: ExportColumn[] = [
              { key: "fornecedor", label: "Fornecedor" },
              { key: "pacote", label: "Pacote" },
              { key: "month_ref", label: "Mês Ref." },
              { key: "amount", label: "Valor (R$)", format: "currency" },
              { key: "method", label: "Método" },
              { key: "status", label: "Status" },
              { key: "paid_at", label: "Pago em" },
              { key: "notes", label: "Observações" },
            ];

            const exportData = filteredPayments.map(p => ({
              fornecedor: p.ad_contracts?.fornecedor || "—",
              pacote: p.ad_contracts?.ad_packages?.name || "—",
              month_ref: p.month_ref,
              amount: p.amount,
              method: METHOD_LABELS[(p as any).payment_method] || (p as any).payment_method || "—",
              status: (PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending).label,
              paid_at: p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—",
              notes: (p as any).notes || "",
            }));

            const clearPayFilters = () => {
              setPayFilterFornecedor("__all__");
              setPayFilterStatus("__all__");
              setPayFilterMethod("__all__");
              setPayFilterFrom("__all__");
              setPayFilterTo("__all__");
            };

            const hasActiveFilters = payFilterFornecedor !== "__all__" || payFilterStatus !== "__all__" || payFilterMethod !== "__all__" || payFilterFrom !== "__all__" || payFilterTo !== "__all__";

            return (
              <>
                {/* Filters & Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex flex-wrap items-end gap-2 flex-1">
                    <div className="min-w-[150px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Fornecedor</Label>
                      <Select value={payFilterFornecedor} onValueChange={setPayFilterFornecedor}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {payFornecedores.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[120px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                      <Select value={payFilterStatus} onValueChange={setPayFilterStatus}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {Object.entries(PAY_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[120px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Método</Label>
                      <Select value={payFilterMethod} onValueChange={setPayFilterMethod}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos</SelectItem>
                          {payMethods.map(m => <SelectItem key={m} value={m}>{METHOD_LABELS[m] || m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[120px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Período de</Label>
                      <Select value={payFilterFrom} onValueChange={setPayFilterFrom}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Início</SelectItem>
                          {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[120px]">
                      <Label className="text-xs text-muted-foreground mb-1 block">Período até</Label>
                      <Select value={payFilterTo} onValueChange={setPayFilterTo}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Fim</SelectItem>
                          {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearPayFilters} className="text-xs h-9">
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Limpar filtros
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{filteredPayments.length} registro(s)</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => exportToXLSX(exportData, PAY_EXPORT_COLUMNS, "pagamentos-publicidade")}>
                        <Download className="h-3.5 w-3.5 mr-1" /> XLSX
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => exportToPDF(exportData, PAY_EXPORT_COLUMNS, "pagamentos-publicidade", "Pagamentos — Publicidade")}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                    </div>
                    <Button onClick={openPayCreate} size="sm" className="h-9">
                      <Plus className="h-4 w-4 mr-1" /> Registrar
                    </Button>
                  </div>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Pacote</TableHead>
                        <TableHead>Mês Ref.</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pago em</TableHead>
                        <TableHead>Obs.</TableHead>
                        <TableHead className="w-28">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map(p => {
                        const st = PAY_STATUS_MAP[p.status] || PAY_STATUS_MAP.pending;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.ad_contracts?.fornecedor || "—"}</TableCell>
                            <TableCell>{p.ad_contracts?.ad_packages?.name || "—"}</TableCell>
                            <TableCell>{p.month_ref}</TableCell>
                            <TableCell>{fmt(p.amount)}</TableCell>
                            <TableCell className="text-xs">{METHOD_LABELS[(p as any).payment_method] || (p as any).payment_method || "—"}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate" title={(p as any).notes || ""}>{(p as any).notes || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => togglePayStatus(p)} title={p.status === "paid" ? "Marcar pendente" : "Marcar pago"}>
                                  {p.status === "paid" ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => openPayEdit(p)} title="Editar"><Edit className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => deletePayment(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredPayments.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* === Package Dialog (dynamic fields) === */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{editingPkg ? "Editar Pacote" : "Novo Pacote"}</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <div><Label>Nome *</Label><Input value={pkgName} onChange={e => setPkgName(e.target.value)} /></div>

            {/* Dynamic built-in fields */}
            {pkgEnabledFields.map(key => {
              const bf = BUILTIN_FIELDS.find(f => f.key === key);
              if (!bf) return null;
              // Special handling for playlist_id
              if (bf.key === "playlist_id") {
                return (
                  <div key={key} className="relative group">
                    <Label>{bf.label}</Label>
                    <Select value={pkgFieldValues[key] || "none"} onValueChange={v => setPkgFieldValues(prev => ({ ...prev, [key]: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar playlist" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button type="button" className="absolute top-0 right-0 text-muted-foreground hover:text-destructive" onClick={() => removePkgField(key)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              }
              return (
                <div key={key} className="relative group">
                  <Label>{bf.label}</Label>
                  {bf.type === "textarea" ? (
                    <Textarea value={pkgFieldValues[key] || ""} onChange={e => setPkgFieldValues(prev => ({ ...prev, [key]: e.target.value }))} rows={2} />
                  ) : bf.type === "select" && bf.options ? (
                    <Select value={pkgFieldValues[key] || ""} onValueChange={v => setPkgFieldValues(prev => ({ ...prev, [key]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {bf.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input type={bf.type === "number" ? "number" : "text"} step={bf.type === "number" ? "0.01" : undefined} value={pkgFieldValues[key] || ""} onChange={e => setPkgFieldValues(prev => ({ ...prev, [key]: e.target.value }))} placeholder={bf.key === "tags" ? "Ex: destaque, premium (separadas por vírgula)" : undefined} />
                  )}
                  <button type="button" className="absolute top-0 right-0 text-muted-foreground hover:text-destructive" onClick={() => removePkgField(key)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}

            {/* Add field dropdown */}
            {(() => {
              const available = BUILTIN_FIELDS.filter(bf => !pkgEnabledFields.includes(bf.key));
              if (available.length === 0) return null;
              return (
                <Select value="" onValueChange={v => addPkgField(v)}>
                  <SelectTrigger className="border-dashed"><Plus className="h-4 w-4 mr-1" /><SelectValue placeholder="Adicionar campo" /></SelectTrigger>
                  <SelectContent>
                    {available.map(bf => <SelectItem key={bf.key} value={bf.key}>{bf.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              );
            })()}

            {renderCustomFields("packages", pkgCustomFields, setPkgCustomFields)}
            <FornecedorSelector
              fornecedores={fornecedores}
              selected={pkgSelectedFornecedores}
              onChange={setPkgSelectedFornecedores}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={pkgIsActive} onChange={e => setPkgIsActive(e.target.checked)} id="pkg-active" />
              <Label htmlFor="pkg-active">Ativo</Label>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={savePkg}>{editingPkg ? "Salvar" : "Criar"}</Button>
        </DialogContent>
      </Dialog>

      {/* === Contract Dialog === */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fornecedor</Label>
              <Select value={contractForm.fornecedor} onValueChange={v => setContractForm(f => ({ ...f, fornecedor: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pacote</Label>
              <Select value={contractForm.package_id} onValueChange={v => setContractForm(f => ({ ...f, package_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar pacote" /></SelectTrigger>
                <SelectContent>
                  {packages.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {fmt(p.monthly_value)}/mês</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={contractForm.status} onValueChange={v => setContractForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>Fim</Label><Input type="date" value={contractForm.end_date} onChange={e => setContractForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button className="w-full" onClick={saveContract}>{editingContract ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Payment Dialog === */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingPay ? "Editar Pagamento" : "Registrar Pagamento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Contrato</Label>
              <Select value={payForm.contract_id} onValueChange={v => {
                const c = contracts.find(c => c.id === v);
                setPayForm(f => ({ ...f, contract_id: v, amount: String(c?.ad_packages?.monthly_value || "") }));
              }} disabled={!!editingPay}>
                <SelectTrigger><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
                <SelectContent>
                  {contracts.filter(c => c.status === "active" || c.id === payForm.contract_id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.fornecedor} — {c.ad_packages?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mês Referência</Label><Input value={payForm.month_ref} onChange={e => setPayForm(f => ({ ...f, month_ref: e.target.value }))} placeholder="Ex: 02/2026" /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={payForm.status} onValueChange={v => setPayForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAY_STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {payForm.status === "paid" && (
              <div>
                <Label>Data do Pagamento</Label>
                <Input type="date" value={payForm.paid_at} onChange={e => setPayForm(f => ({ ...f, paid_at: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Observações</Label>
              <Textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex: Comprovante recebido via WhatsApp" />
            </div>
            <Button className="w-full" onClick={savePayment}>{editingPay ? "Salvar" : "Registrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico do Contrato</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : historyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum registro de histórico</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {historyData.map(h => {
                const oldSt = h.old_status ? (STATUS_MAP[h.old_status]?.label || h.old_status) : "—";
                const newSt = STATUS_MAP[h.new_status]?.label || h.new_status;
                return (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 text-sm">
                      <p>
                        {h.old_status ? (
                          <><span className="text-muted-foreground">{oldSt}</span> → <span className="font-medium">{newSt}</span></>
                        ) : (
                          <>Criado como <span className="font-medium">{newSt}</span></>
                        )}
                      </p>
                      {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Template Dialog === */}
      <Dialog open={tplDialog} onOpenChange={setTplDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{editingTpl ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <div><Label>Nome *</Label><Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Ex: Premium Tela Cheia" /></div>

            {/* Enabled fields */}
            {tplEnabledFields.map((key, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === tplEnabledFields.length - 1;
              const moveButtons = (
                <div className="flex gap-0.5 absolute top-1 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isFirst} onClick={() => moveTplField(idx, "up")}><ArrowUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isLast} onClick={() => moveTplField(idx, "down")}><ArrowDown className="h-3 w-3" /></Button>
                </div>
              );
              // Check if it's a custom field
              if (key.startsWith("custom_")) {
                const fdId = key.replace("custom_", "");
                const fd = fieldDefs.find(f => f.id === fdId);
                if (!fd) return null;
                return (
                  <div key={key} className="relative group border rounded-md p-3 bg-muted/30">
                    {moveButtons}
                    <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full" onClick={() => removeTplField(key)}><Trash2 className="h-3 w-3" /></Button>
                    <div className="flex items-center gap-1.5 mb-1"><GripVertical className="h-3.5 w-3.5 text-muted-foreground" /><Label>{fd.name}</Label></div>
                    {fd.field_type === "select" ? (
                      <Select value={tplCustomFields[fdId] || ""} onValueChange={v => setTplCustomFields((prev: Record<string, any>) => ({ ...prev, [fdId]: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{(fd.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input type={fd.field_type === "number" ? "number" : "text"} value={tplCustomFields[fdId] || ""} onChange={e => setTplCustomFields((prev: Record<string, any>) => ({ ...prev, [fdId]: e.target.value }))} />
                    )}
                  </div>
                );
              }
              // Built-in field
              const fieldDef = BUILTIN_TPL_FIELDS.find(f => f.key === key);
              if (!fieldDef) return null;
              return (
                <div key={key} className="relative group border rounded-md p-3 bg-muted/30">
                  {moveButtons}
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full" onClick={() => removeTplField(key)}><Trash2 className="h-3 w-3" /></Button>
                  <div className="flex items-center gap-1.5 mb-1"><GripVertical className="h-3.5 w-3.5 text-muted-foreground" /><Label>{fieldDef.label}</Label></div>
                  {fieldDef.type === "textarea" ? (
                    <Textarea value={tplFieldValues[key] || ""} onChange={e => setTplFieldValues(prev => ({ ...prev, [key]: e.target.value }))} rows={2} />
                  ) : fieldDef.type === "select" ? (
                    <Select value={tplFieldValues[key] || ""} onValueChange={v => setTplFieldValues(prev => ({ ...prev, [key]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{fieldDef.options!.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input type={fieldDef.type === "number" ? "number" : "text"} step={key === "monthly_value" ? "0.01" : undefined} value={tplFieldValues[key] || ""} onChange={e => setTplFieldValues(prev => ({ ...prev, [key]: e.target.value }))} />
                  )}
                </div>
              );
            })}

            {tplEnabledFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                Template em branco. Use o botão abaixo para adicionar campos.
              </p>
            )}

            {/* Add field dropdown */}
            {(() => {
              const availableBuiltin = BUILTIN_TPL_FIELDS.filter(f => !tplEnabledFields.includes(f.key));
              const availableCustom = fieldDefs.filter(fd => fd.is_active && (fd.applies_to === "both" || fd.applies_to === "templates") && !tplEnabledFields.includes(`custom_${fd.id}`));
              const hasAvailable = availableBuiltin.length > 0 || availableCustom.length > 0;
              if (!hasAvailable) return null;
              return (
                <Select value="" onValueChange={v => addTplField(v)}>
                  <SelectTrigger className="border-dashed">
                    <div className="flex items-center gap-2 text-muted-foreground"><Plus className="h-4 w-4" /> Adicionar campo</div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuiltin.length > 0 && availableBuiltin.map(f => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                    {availableCustom.length > 0 && (
                      <>
                        {availableBuiltin.length > 0 && <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Campos Personalizados</div>}
                        {availableCustom.map(fd => (
                          <SelectItem key={`custom_${fd.id}`} value={`custom_${fd.id}`}>{fd.name}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              );
            })()}

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={tplIsActive} onChange={e => setTplIsActive(e.target.checked)} id="tpl-active" />
              <Label htmlFor="tpl-active">Ativo</Label>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={saveTpl}>{editingTpl ? "Salvar" : "Criar"}</Button>
        </DialogContent>
      </Dialog>

      {/* === Field Definition Dialog === */}
      <Dialog open={fieldDefDialog} onOpenChange={setFieldDefDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingFieldDef ? "Editar Campo" : "Novo Campo Personalizado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome do Campo</Label><Input value={fieldDefForm.name} onChange={e => setFieldDefForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Resolução do Vídeo" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={fieldDefForm.field_type} onValueChange={v => setFieldDefForm(f => ({ ...f, field_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto Livre</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="select">Lista Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fieldDefForm.field_type === "select" && (
              <div>
                <Label>Opções da Lista</Label>
                <Input value={fieldDefForm.options} onChange={e => setFieldDefForm(f => ({ ...f, options: e.target.value }))} placeholder="Opção 1, Opção 2, Opção 3 (separadas por vírgula)" />
                <p className="text-xs text-muted-foreground mt-1">Separe as opções por vírgula</p>
              </div>
            )}
            <div>
              <Label>Aplica-se a</Label>
              <Select value={fieldDefForm.applies_to} onValueChange={v => setFieldDefForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Pacotes & Templates</SelectItem>
                  <SelectItem value="packages">Apenas Pacotes</SelectItem>
                  <SelectItem value="templates">Apenas Templates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Ordem de Exibição</Label><Input type="number" value={fieldDefForm.sort_order} onChange={e => setFieldDefForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={fieldDefForm.is_required} onChange={e => setFieldDefForm(f => ({ ...f, is_required: e.target.checked }))} id="fd-required" />
              <Label htmlFor="fd-required">Campo Obrigatório</Label>
            </div>
            <Button className="w-full" onClick={saveFieldDef}>{editingFieldDef ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdvertisingPage;
