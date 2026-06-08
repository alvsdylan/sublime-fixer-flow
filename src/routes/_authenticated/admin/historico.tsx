import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, X, History as HistoryIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/historico")({
  head: () => ({ meta: [{ title: "Histórico do Sistema" }] }),
  component: HistoryPage,
});

interface AuditRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  module: string;
  action: string;
  target: string | null;
  created_at: string;
}

function HistoryPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/", replace: true });
  }, [authLoading, isAdmin, navigate]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Erro ao carregar histórico");
    else setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const users = useMemo(
    () => Array.from(new Set(rows.map((r) => r.user_name).filter(Boolean))) as string[],
    [rows],
  );
  const modules = useMemo(
    () => Array.from(new Set(rows.map((r) => r.module))),
    [rows],
  );
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const first = r.action.split(" ")[0];
      set.add(first);
    }
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (userFilter !== "all" && r.user_name !== userFilter) return false;
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (actionFilter !== "all" && !r.action.startsWith(actionFilter)) return false;
      if (dateFilter) {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      if (q) {
        const hay = `${r.user_name ?? ""} ${r.module} ${r.action} ${r.target ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, userFilter, moduleFilter, actionFilter, dateFilter]);

  function clearFilters() {
    setSearch("");
    setUserFilter("all");
    setModuleFilter("all");
    setActionFilter("all");
    setDateFilter("");
  }

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-base font-bold leading-tight inline-flex items-center gap-1.5">
            <HistoryIcon className="h-4 w-4" /> Histórico do Sistema
          </h1>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Auditoria completa de ações
          </p>
        </div>
      </header>

      <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-2 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos usuários</SelectItem>
            {users.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos módulos</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            {actionTypes.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 w-[160px]"
        />
        {(search ||
          userFilter !== "all" ||
          moduleFilter !== "all" ||
          actionFilter !== "all" ||
          dateFilter) && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} registro(s)
        </span>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Hora</th>
                <th className="text-left px-3 py-2">Usuário</th>
                <th className="text-left px-3 py-2">Módulo</th>
                <th className="text-left px-3 py-2">Ação</th>
                <th className="text-left px-3 py-2">Registro</th>
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
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground p-4">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const d = new Date(r.created_at);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {d.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {d.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.user_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {r.module}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.action}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.target ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
