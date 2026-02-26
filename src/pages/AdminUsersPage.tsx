import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Search, Pencil, Trash2, KeyRound, Loader2, X, Plus, Database, Check, Clock, Phone, Mail, UserCheck, UserX, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserData {
  user_id: string;
  full_name: string;
  email: string;
  cnpj: string | null;
  phone: string | null;
  financial_email: string | null;
  fornecedor: string | null;
  fornecedores: string[];
  roles: string[];
  is_active: boolean;
  registration_status: string;
  created_at: string;
  last_sign_in: string | null;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard de Vendas', group: 'Fornecedor' },
  { key: 'produtos', label: 'Produtos', group: 'Fornecedor' },
  { key: 'relatorios', label: 'Relatórios', group: 'Fornecedor' },
  { key: 'contratos', label: 'Mídia TV (Contratos)', group: 'Fornecedor' },
  { key: 'checklists', label: 'Checklists', group: 'Fornecedor' },
  { key: 'meus_dados', label: 'Meus Dados', group: 'Fornecedor' },
  { key: 'portal_promotora', label: 'Portal Promotora', group: 'Fornecedor' },
  { key: 'admin_dashboard', label: 'Dashboard Admin', group: 'Administração' },
  { key: 'admin_usuarios', label: 'Gestão de Usuários', group: 'Administração' },
  { key: 'admin_midia', label: 'Mídia TV (Gestão)', group: 'Administração' },
  { key: 'admin_lojas', label: 'Lojas & TVs', group: 'Administração' },
  { key: 'admin_publicidade', label: 'Publicidade', group: 'Administração' },
  { key: 'admin_checklists', label: 'Checklists (Gestão)', group: 'Administração' },
  { key: 'admin_lgpd', label: 'LGPD', group: 'Administração' },
  { key: 'admin_tv_api', label: 'API TV', group: 'Administração' },
  { key: 'admin_jobs', label: 'Jobs & Promotoras', group: 'Administração' },
];

const PERMISSION_TEMPLATES = [
  {
    label: 'Gerente Completo',
    description: 'Acesso total a todas as páginas',
    permissions: AVAILABLE_PERMISSIONS.map(p => p.key),
  },
  {
    label: 'Apenas Vendas',
    description: 'Dashboard, produtos e relatórios',
    permissions: ['dashboard', 'produtos', 'relatorios'],
  },
  {
    label: 'Gestão Interna',
    description: 'Admin sem gestão de usuários',
    permissions: ['admin_dashboard', 'admin_midia', 'admin_lojas', 'admin_publicidade'],
  },
  {
    label: 'Gestão de Jobs',
    description: 'Jobs, promotoras e checklists',
    permissions: ['admin_jobs', 'admin_checklists'],
  },
  {
    label: 'Apenas Visualização',
    description: 'Somente dashboards',
    permissions: ['dashboard', 'admin_dashboard'],
  },
  {
    label: 'Limpar Tudo',
    description: 'Remover todas as permissões',
    permissions: [] as string[],
  },
];

const AdminUsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [fornecedoresList, setFornecedoresList] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFornecedores, setFormFornecedores] = useState<string[]>([]);
  const [formRole, setFormRole] = useState<string>("fornecedor");
  const [formFornecedorSearch, setFormFornecedorSearch] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formFinancialEmail, setFormFinancialEmail] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Table access management state
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableAccessOpen, setTableAccessOpen] = useState(false);
  const [tableAccessFornecedor, setTableAccessFornecedor] = useState("");
  const [tableAccessSelection, setTableAccessSelection] = useState<string[]>([]);
  const [tableAccessLoading, setTableAccessLoading] = useState(false);
  const [tableAccessSearch, setTableAccessSearch] = useState("");

  // Permissions state
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<UserData | null>(null);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const callAdmin = async (body: any) => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAdmin({ action: 'list' });
      setUsers(res.data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    callAdmin({ action: 'fornecedores' })
      .then(res => setFornecedoresList(res.data || []))
      .catch(() => {});
    callAdmin({ action: 'available-tables' })
      .then(res => setAvailableTables(res.data || []))
      .catch(() => {});
  }, [fetchUsers]);

  const openTableAccess = async (fornecedor: string) => {
    setTableAccessFornecedor(fornecedor);
    setTableAccessSearch("");
    setTableAccessOpen(true);
    setTableAccessLoading(true);
    try {
      const res = await callAdmin({ action: 'get-fornecedor-tables', fornecedor });
      setTableAccessSelection(res.data || []);
    } catch {
      setTableAccessSelection([]);
    } finally {
      setTableAccessLoading(false);
    }
  };

  const handleSaveTableAccess = async () => {
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'set-fornecedor-tables',
        fornecedor: tableAccessFornecedor,
        tables: tableAccessSelection,
      });
      toast.success(`Acesso às bases atualizado para ${tableAccessFornecedor}`);
      setTableAccessOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTableAccess = (tableName: string) => {
    setTableAccessSelection(prev =>
      prev.includes(tableName) ? prev.filter(t => t !== tableName) : [...prev, tableName]
    );
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.fornecedores?.some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSuggestions = fornecedoresList
    .filter(f => f.toLowerCase().includes(formFornecedorSearch.toLowerCase()) && !formFornecedores.includes(f))
    .slice(0, 30);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.replace(/^(\d{0,2})/, '($1');
    if (digits.length <= 6) return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const lookupCnpj = async (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (res.ok) {
        const data = await res.json();
        const razao = data.razao_social || data.nome_fantasia || '';
        if (razao && !formName) {
          setFormName(razao);
          toast.success(`Razão social encontrada: ${razao}`);
        }
      } else {
        toast.error("CNPJ não encontrado");
      }
    } catch {
      toast.error("Erro ao consultar CNPJ");
    } finally {
      setCnpjLoading(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormPassword("");
    setFormFornecedores([]); setFormRole("fornecedor"); setFormFornecedorSearch("");
    setFormCnpj(""); setFormPhone(""); setFormFinancialEmail("");
  };

  const addFornecedor = (f: string) => {
    if (f && !formFornecedores.includes(f)) {
      setFormFornecedores(prev => [...prev, f]);
    }
    setFormFornecedorSearch("");
  };

  const removeFornecedor = (f: string) => {
    setFormFornecedores(prev => prev.filter(x => x !== f));
  };

  const handleCreate = async () => {
    if (!formEmail || !formPassword || !formName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'create',
        email: formEmail,
        password: formPassword,
        full_name: formName,
        fornecedores: formFornecedores,
        role: formRole,
        cnpj: formCnpj.replace(/\D/g, '') || null,
        phone: formPhone || null,
        financial_email: formFinancialEmail || null,
      });
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'update',
        target_user_id: selectedUser.user_id,
        full_name: formName,
        fornecedores: formFornecedores,
        role: formRole,
        cnpj: formCnpj.replace(/\D/g, '') || null,
        phone: formPhone || null,
        financial_email: formFinancialEmail || null,
      });
      toast.success("Usuário atualizado!");
      setEditOpen(false);
      resetForm();
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserData) => {
    try {
      await callAdmin({
        action: 'toggle-active',
        target_user_id: user.user_id,
        is_active: !user.is_active,
      });
      toast.success(user.is_active ? "Acesso desativado" : "Acesso ativado");
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !formPassword) return;
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'reset-password',
        target_user_id: selectedUser.user_id,
        new_password: formPassword,
      });
      toast.success("Senha redefinida!");
      setResetOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'delete',
        target_user_id: selectedUser.user_id,
      });
      toast.success("Usuário excluído!");
      setDeleteOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: UserData) => {
    setSelectedUser(user);
    setFormName(user.full_name);
    setFormFornecedores(user.fornecedores || []);
    setFormRole(user.roles[0] || "fornecedor");
    setFormFornecedorSearch("");
    setFormCnpj(user.cnpj ? formatCnpj(user.cnpj) : "");
    setFormPhone(user.phone || "");
    setFormFinancialEmail(user.financial_email || "");
    setEditOpen(true);
  };

  const openReset = (user: UserData) => {
    setSelectedUser(user);
    setFormPassword("");
    setResetOpen(true);
  };

  const openDelete = (user: UserData) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const openReject = (user: UserData) => {
    setSelectedUser(user);
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'reject',
        target_user_id: selectedUser.user_id,
      });
      toast.success("Cadastro rejeitado");
      setRejectOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPermissions = async (user: UserData) => {
    setPermissionsUser(user);
    setPermissionsOpen(true);
    setPermissionsLoading(true);
    try {
      const res = await callAdmin({ action: 'get-permissions', target_user_id: user.user_id });
      setFormPermissions(res.data || []);
    } catch {
      setFormPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser) return;
    setSubmitting(true);
    try {
      await callAdmin({
        action: 'set-permissions',
        target_user_id: permissionsUser.user_id,
        permissions: formPermissions,
      });
      toast.success("Permissões atualizadas!");
      setPermissionsOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (perm: string) => {
    setFormPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  // Fornecedor input component reused in create/edit
  const FornecedorInput = () => (
    <div>
      <Label>Fornecedores vinculados</Label>
      {formFornecedores.length > 0 && (
        <div className="mt-1 mb-2 flex flex-wrap gap-1.5">
          {formFornecedores.map(f => (
            <Badge key={f} variant="secondary" className="gap-1 text-xs py-1">
              <span className="max-w-[200px] truncate">{f}</span>
              <button onClick={() => removeFornecedor(f)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={formFornecedorSearch}
          onChange={e => setFormFornecedorSearch(e.target.value)}
          placeholder="Buscar fornecedor para adicionar..."
          onKeyDown={e => {
            if (e.key === 'Enter' && formFornecedorSearch) {
              e.preventDefault();
              addFornecedor(formFornecedorSearch);
            }
          }}
        />
        {formFornecedorSearch && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md">
            {filteredSuggestions.map(f => (
              <button
                key={f}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
                onClick={() => addFornecedor(f)}
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{f}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Filtered fornecedores for table access tab
  const filteredFornecedoresForTables = fornecedoresList.filter(f =>
    f.toLowerCase().includes(tableAccessSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="text-sm text-muted-foreground">Gerenciar usuários e acessos</p>
        </div>
      </div>

      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Pendentes
            {users.filter(u => (u.registration_status || 'pending') === 'pending' && !u.roles.includes('admin')).length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {users.filter(u => (u.registration_status || 'pending') === 'pending' && !u.roles.includes('admin')).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejeitados" className="gap-1.5">
            <UserX className="h-3.5 w-3.5" />
            Rejeitados
            {users.filter(u => u.registration_status === 'rejected').length > 0 && (
              <Badge variant="outline" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {users.filter(u => u.registration_status === 'rejected').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="acessos">Últimos Acessos</TabsTrigger>
          <TabsTrigger value="bases">Acesso às Bases</TabsTrigger>
        </TabsList>

        {/* Pendentes Tab */}
        <TabsContent value="pendentes" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Cadastros Pendentes de Aprovação</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Novos usuários que se cadastraram e aguardam aprovação para acessar o portal.
              </p>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (() => {
                const pendingUsers = users.filter(u => (u.registration_status || 'pending') === 'pending' && !u.roles.includes('admin'));
                return pendingUsers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum cadastro pendente de aprovação.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">E-mail</TableHead>
                          <TableHead className="text-xs">CNPJ</TableHead>
                          <TableHead className="text-xs">Telefone</TableHead>
                          <TableHead className="text-xs">Cadastrado em</TableHead>
                          <TableHead className="text-xs w-48">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map(u => (
                          <TableRow key={u.user_id} className="text-sm">
                            <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums">
                              {u.cnpj ? u.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{u.phone || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="gap-1.5 h-8"
                                  onClick={() => handleToggleActive(u)}
                                >
                                  <Check className="h-3.5 w-3.5" /> Aprovar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 h-8"
                                  onClick={() => openEdit(u)}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 h-8 hover:text-destructive"
                                  onClick={() => openReject(u)}
                                >
                                  <UserX className="h-3.5 w-3.5" /> Rejeitar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejeitados Tab */}
        <TabsContent value="rejeitados" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <UserX className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Cadastros Rejeitados</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Usuários cujo cadastro foi rejeitado. Você pode aprovar caso mude de ideia.
              </p>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (() => {
                const rejectedUsers = users.filter(u => u.registration_status === 'rejected');
                return rejectedUsers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <UserX className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum cadastro rejeitado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">E-mail</TableHead>
                          <TableHead className="text-xs">CNPJ</TableHead>
                          <TableHead className="text-xs">Cadastrado em</TableHead>
                          <TableHead className="text-xs w-48">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedUsers.map(u => (
                          <TableRow key={u.user_id} className="text-sm">
                            <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums">
                              {u.cnpj ? u.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="gap-1.5 h-8"
                                  onClick={() => handleToggleActive(u)}
                                >
                                  <Check className="h-3.5 w-3.5" /> Aprovar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 h-8 hover:text-destructive"
                                  onClick={() => openDelete(u)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Últimos Acessos Tab */}
        <TabsContent value="acessos" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Últimos Acessos dos Fornecedores</h2>
              </div>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">E-mail</TableHead>
                        <TableHead className="text-xs">Fornecedores</TableHead>
                        <TableHead className="text-xs">Último Acesso</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...users]
                        .filter(u => !u.roles.includes('admin'))
                        .sort((a, b) => {
                          if (!a.last_sign_in && !b.last_sign_in) return 0;
                          if (!a.last_sign_in) return 1;
                          if (!b.last_sign_in) return -1;
                          return new Date(b.last_sign_in).getTime() - new Date(a.last_sign_in).getTime();
                        })
                        .map(u => (
                          <TableRow key={u.user_id} className={`text-sm ${!u.is_active ? 'opacity-50' : ''}`}>
                            <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[250px]">
                                {u.fornecedores?.length > 0 ? (
                                  u.fornecedores.map(f => (
                                    <Badge key={f} variant="outline" className="text-[10px] py-0 max-w-[200px] truncate">{f}</Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {u.last_sign_in ? (
                                <span className="text-sm tabular-nums">
                                  {new Date(u.last_sign_in).toLocaleDateString('pt-BR')} às {new Date(u.last_sign_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">Nunca acessou</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'secondary'}>
                                {u.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      {users.filter(u => !u.roles.includes('admin')).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            Nenhum fornecedor cadastrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { resetForm(); setCreateOpen(true); }}>
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </Button>
          </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, e-mail ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Ativo</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                     <TableHead className="text-xs">CNPJ</TableHead>
                     <TableHead className="text-xs">E-mail</TableHead>
                     <TableHead className="text-xs">Telefone</TableHead>
                     <TableHead className="text-xs">E-mail Financeiro</TableHead>
                     <TableHead className="text-xs">Fornecedores</TableHead>
                     <TableHead className="text-xs">Papel</TableHead>
                    <TableHead className="text-xs">Último acesso</TableHead>
                    <TableHead className="text-xs w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.user_id} className={`text-sm ${!u.is_active ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <Switch
                          checked={u.is_active}
                          onCheckedChange={() => handleToggleActive(u)}
                          disabled={u.roles.includes('admin') && u.user_id === users.find(x => x.roles.includes('admin'))?.user_id}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {u.cnpj ? u.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.phone || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.financial_email || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {u.fornecedores?.length > 0 ? (
                            u.fornecedores.map(f => (
                              <Badge key={f} variant="outline" className="text-[10px] py-0 max-w-[200px] truncate">
                                {f}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Não vinculado</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.roles.map(r => (
                          <Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'} className="mr-1">
                            {r}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('pt-BR') : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {(u.roles.includes('gerente') || u.roles.includes('funcionario')) && (
                            <Button variant="ghost" size="icon" title="Permissões" onClick={() => openPermissions(u)}>
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Resetar senha" onClick={() => openReset(u)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => openDelete(u)} className="hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="bases" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Defina quais bases de dados cada fornecedor pode acessar. Fornecedores sem permissões configuradas terão acesso a todas as bases.
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar fornecedor..." value={tableAccessSearch} onChange={(e) => setTableAccessSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Fornecedor</TableHead>
                      <TableHead className="text-xs w-40">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFornecedoresForTables.map(f => (
                      <TableRow key={f} className="text-sm">
                        <TableCell className="font-medium">{f}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openTableAccess(f)}>
                            <Database className="h-3.5 w-3.5" /> Configurar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredFornecedoresForTables.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                          Nenhum fornecedor encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Criar uma nova conta de acesso ao portal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo *</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                  <SelectItem value="promotor">Promotor(a)</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formRole === 'fornecedor' || formRole === 'gerente' || formRole === 'admin') && (
              <div>
                <Label>CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    value={formCnpj}
                    onChange={e => setFormCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    onBlur={() => lookupCnpj(formCnpj)}
                  />
                  {cnpjLoading && <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ao preencher o CNPJ, a razão social é buscada automaticamente.</p>
              </div>
            )}
            <div>
              <Label>Nome completo {formRole === 'fornecedor' ? '/ Razão Social' : ''} *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={formRole === 'promotor' || formRole === 'funcionario' ? 'Nome completo' : 'Nome do usuário'} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="usuario@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
            <div>
              <Label>Telefone {(formRole === 'promotor' || formRole === 'funcionario') ? '*' : ''}</Label>
              <Input value={formPhone} onChange={e => setFormPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
            </div>
            {(formRole === 'fornecedor' || formRole === 'gerente' || formRole === 'admin') && (
              <div>
                <Label>E-mail financeiro</Label>
                <Input type="email" value={formFinancialEmail} onChange={e => setFormFinancialEmail(e.target.value)} placeholder="financeiro@email.com" />
              </div>
            )}
            {(formRole === 'fornecedor' || formRole === 'gerente') && (
              <FornecedorInput />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  value={formCnpj}
                  onChange={e => setFormCnpj(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  onBlur={() => lookupCnpj(formCnpj)}
                />
                {cnpjLoading && <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />}
              </div>
            </div>
            <div>
              <Label>Nome completo / Razão Social</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={formPhone} onChange={e => setFormPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
            </div>
            <div>
              <Label>E-mail financeiro</Label>
              <Input type="email" value={formFinancialEmail} onChange={e => setFormFinancialEmail(e.target.value)} placeholder="financeiro@email.com" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                  <SelectItem value="promotor">Promotor(a)</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FornecedorInput />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>Definir nova senha para {selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nova senha</Label>
            <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={submitting || formPassword.length < 6}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              O cadastro de <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}) será marcado como rejeitado. O usuário não será excluído e poderá ser aprovado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={tableAccessOpen} onOpenChange={setTableAccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso às Bases de Dados</DialogTitle>
            <DialogDescription className="truncate">{tableAccessFornecedor}</DialogDescription>
          </DialogHeader>
          {tableAccessLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableTables.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma base de dados disponível.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm font-medium text-foreground">Selecionar bases</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        if (tableAccessSelection.length === availableTables.length) {
                          setTableAccessSelection([]);
                        } else {
                          setTableAccessSelection([...availableTables]);
                        }
                      }}
                    >
                      {tableAccessSelection.length === availableTables.length ? "Desmarcar todas" : "Selecionar todas"}
                    </Button>
                  </div>
                  {availableTables.map(t => (
                    <label key={t} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent cursor-pointer">
                      <Checkbox
                        checked={tableAccessSelection.includes(t)}
                        onCheckedChange={() => toggleTableAccess(t)}
                      />
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{t.replace('vendas_', 'Vendas ')}</span>
                      </div>
                    </label>
                  ))}
                </>
              )}
              {tableAccessSelection.length === 0 && availableTables.length > 0 && (
                <p className="text-xs text-muted-foreground pt-2 italic">
                  Sem seleção = acesso a todas as bases (padrão).
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTableAccessOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTableAccess} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permissões de Acesso</DialogTitle>
            <DialogDescription>
              Definir quais páginas <strong>{permissionsUser?.full_name}</strong> ({permissionsUser?.roles.join(', ')}) pode acessar.
            </DialogDescription>
          </DialogHeader>
          {permissionsLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* Copy from another user */}
              {(() => {
                const staffUsers = users.filter(u =>
                  (u.roles.includes('gerente') || u.roles.includes('funcionario')) &&
                  u.user_id !== permissionsUser?.user_id
                );
                if (staffUsers.length === 0) return null;
                return (
                  <div className="border-b pb-3">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Copiar permissões de</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {staffUsers.map(u => (
                        <Button
                          key={u.user_id}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={async () => {
                            try {
                              const res = await callAdmin({ action: 'get-permissions', target_user_id: u.user_id });
                              setFormPermissions(res.data || []);
                              toast.success(`Permissões copiadas de ${u.full_name}`);
                            } catch {
                              toast.error("Erro ao copiar permissões");
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          {u.full_name || u.email}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Templates */}
              <div className="border-b pb-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Aplicar template</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PERMISSION_TEMPLATES.map(t => (
                    <Button
                      key={t.label}
                      variant={JSON.stringify(formPermissions.sort()) === JSON.stringify([...t.permissions].sort()) ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      title={t.description}
                      onClick={() => {
                        setFormPermissions([...t.permissions]);
                        toast.success(`Template "${t.label}" aplicado`);
                      }}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {['Fornecedor', 'Administração'].map(group => (
                <div key={group}>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{group}</h4>
                  <div className="space-y-1">
                    {AVAILABLE_PERMISSIONS.filter(p => p.group === group).map(perm => (
                      <label key={perm.key} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent cursor-pointer">
                        <Checkbox
                          checked={formPermissions.includes(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {formPermissions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Sem permissões = sem acesso a nenhuma página.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPermissionsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
