import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Pencil,
  Trash2,
  Key,
  Loader2,
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários" }] }),
  component: UsersPage,
});

interface ProfileRow {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "common";
  active: boolean;
  created_at: string;
}

function UsersPage() {
  const navigate = useNavigate();
  const { isAdmin, user: me, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [resetTarget, setResetTarget] = useState<ProfileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);

  const createFn = createUser;
  const updateFn = updateUser;
  const resetFn = resetUserPassword;
  const deleteFn = deleteUser;

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/", replace: true });
  }, [authLoading, isAdmin, navigate]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar usuários");
    else setUsers((data ?? []) as ProfileRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function toggleActive(u: ProfileRow) {
    try {
      await updateFn({ data: { id: u.id, active: !u.active, username: u.username } });
      toast.success(u.active ? "Usuário desativado" : "Usuário ativado");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold leading-tight">Usuários</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Gerenciamento de acessos
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          className="h-9"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo Usuário
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Nome</th>
                <th className="text-left px-3 py-2">Usuário</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">E-mail</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground p-4">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground p-4">
                    Nenhum usuário
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{u.name || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                  <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="px-3 py-2">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        <ShieldCheck className="h-3 w-3" /> Administrador
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                        <UserIcon className="h-3 w-3" /> Usuário Comum
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Editar"
                      onClick={() => {
                        setEditing(u);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Redefinir senha"
                      onClick={() => setResetTarget(u)}
                    >
                      <Key className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      title={u.active ? "Desativar" : "Ativar"}
                      onClick={() => toggleActive(u)}
                      disabled={u.id === me?.id}
                    >
                      {u.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Excluir"
                      onClick={() => setDeleteTarget(u)}
                      disabled={u.id === me?.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <UserEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        user={editing}
        onSaved={load}
        createFn={createFn}
        updateFn={updateFn}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        onSaved={load}
        resetFn={resetFn}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto removerá permanentemente "{deleteTarget?.username}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteFn({ data: { id: deleteTarget.id } });
                  toast.success("Usuário excluído");
                  setDeleteTarget(null);
                  load();
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserEditor({
  open,
  onOpenChange,
  user,
  onSaved,
  createFn,
  updateFn,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: ProfileRow | null;
  onSaved: () => void;
  createFn: any;
  updateFn: any;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "common">("common");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setUsername(user?.username ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setRole(user?.role ?? "common");
    }
  }, [open, user]);

  async function handleSave() {
    setSaving(true);
    try {
      if (user) {
        await updateFn({ data: { id: user.id, name, username, email, role } });
        toast.success("Usuário atualizado");
      } else {
        await createFn({
          data: { name, username, email, password, role },
        });
        toast.success("Usuário criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Usuário *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Usuário Comum</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {!user && (
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  target,
  onClose,
  resetFn,
}: {
  target: ProfileRow | null;
  onClose: () => void;
  onSaved: () => void;
  resetFn: any;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) setPassword("");
  }, [target]);

  if (!target) return null;
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redefinir senha de {target.username}</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Nova senha</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await resetFn({ data: { id: target.id, password } });
                toast.success("Senha redefinida");
                onClose();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
