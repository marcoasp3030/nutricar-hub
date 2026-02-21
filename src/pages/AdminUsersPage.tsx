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
import { UserPlus, Search, Pencil, Trash2, KeyRound, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface UserData {
  user_id: string;
  full_name: string;
  email: string;
  fornecedor: string | null;
  fornecedores: string[];
  roles: string[];
  is_active: boolean;
  created_at: string;
  last_sign_in: string | null;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [fornecedoresList, setFornecedoresList] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFornecedores, setFormFornecedores] = useState<string[]>([]);
  const [formRole, setFormRole] = useState<string>("fornecedor");
  const [formFornecedorSearch, setFormFornecedorSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  }, [fetchUsers]);

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.fornecedores?.some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSuggestions = fornecedoresList
    .filter(f => f.toLowerCase().includes(formFornecedorSearch.toLowerCase()) && !formFornecedores.includes(f))
    .slice(0, 30);

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormPassword("");
    setFormFornecedores([]); setFormRole("fornecedor"); setFormFornecedorSearch("");
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
        </div>
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
                    <TableHead className="text-xs">E-mail</TableHead>
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
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
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
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Criar uma nova conta de acesso ao portal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome do usuário" />
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
              <Label>Papel</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FornecedorInput />
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
              <Label>Nome completo</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>Papel</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
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
              Tem certeza que deseja excluir <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})? Esta ação não pode ser desfeita.
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
    </div>
  );
};

export default AdminUsersPage;
