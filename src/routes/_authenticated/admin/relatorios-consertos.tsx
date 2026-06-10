import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/relatorios-consertos")({
  head: () => ({ meta: [{ title: "Relatórios de Consertos" }] }),
  component: ReportsPage,
});

interface RepairRow {
  id: string;
  client_name: string;
  order_number: string;
  description: string;
  attendant_name: string;
  created_at: string;
}

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number) {
  const d = todayIso();
  d.setDate(d.getDate() - n + 1);
  return d;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function ReportsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<"7" | "30">("7");
  const [attendantFilter, setAttendantFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/", replace: true });
  }, [authLoading, isAdmin, navigate]);

  async function load() {
    setLoading(true);
    const since = daysAgo(30).toISOString();
    const { data, error } = await supabase
      .from("repair_cards")
      .select("id,client_name,order_number,description,attendant_name,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar relatórios");
    else setRows((data ?? []) as RepairRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const attendants = useMemo(
    () => Array.from(new Set(rows.map((r) => r.attendant_name).filter(Boolean))).sort(),
    [rows],
  );
  const clients = useMemo(
    () => Array.from(new Set(rows.map((r) => r.client_name).filter(Boolean))).sort(),
    [rows],
  );

  function inRange(iso: string, days: number) {
    const d = new Date(iso);
    return d >= daysAgo(days);
  }

  const summary7 = useMemo(() => buildSummary(rows, 7), [rows]);
  const summary30 = useMemo(() => buildSummary(rows, 30), [rows]);

  const filtered = useMemo(() => {
    const days = period === "7" ? 7 : 30;
    return rows.filter((r) => {
      if (!inRange(r.created_at, days)) return false;
      if (attendantFilter !== "all" && r.attendant_name !== attendantFilter) return false;
      if (clientFilter !== "all" && r.client_name !== clientFilter) return false;
      return true;
    });
  }, [rows, period, attendantFilter, clientFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortAsc ? da - db : db - da;
      }),
    [filtered, sortAsc],
  );

  const totalsByAttendant = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.attendant_name, (map.get(r.attendant_name) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalsByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.client_name, (map.get(r.client_name) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const perDay = useMemo(() => {
    const days = period === "7" ? 7 : 30;
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of filtered) {
      const k = dayKey(r.created_at);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      count,
    }));
  }, [filtered, period]);

  const totalReg = filtered.length;
  const avgPerDay = (totalReg / (period === "7" ? 7 : 30)).toFixed(1);

  function exportXlsx() {
    const data = sorted.map((r) => ({
      Data: fmtDate(r.created_at),
      Hora: fmtTime(r.created_at),
      Cliente: r.client_name,
      Pedido: r.order_number,
      Conferente: r.attendant_name,
      Descrição: r.description,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consertos");
    XLSX.writeFile(wb, `relatorio-consertos-${period}d.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Relatório de Consertos — Últimos ${period} dias`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Total: ${totalReg} | Média/dia: ${avgPerDay}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Data", "Hora", "Cliente", "Pedido", "Conferente", "Descrição"]],
      body: sorted.map((r) => [
        fmtDate(r.created_at),
        fmtTime(r.created_at),
        r.client_name,
        r.order_number,
        r.attendant_name,
        r.description,
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`relatorio-consertos-${period}d.pdf`);
  }

  if (authLoading || !isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <Toaster richColors position="top-right" />
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-5">
        <header className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Relatórios de Consertos</h1>
        </header>

        {/* Painel resumido */}
        <div className="grid sm:grid-cols-2 gap-3">
          <SummaryCard title="Últimos 7 Dias" s={summary7} />
          <SummaryCard title="Últimos 30 Dias" s={summary30} />
        </div>

        {/* Filtros / período */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={period === "7" ? "default" : "outline"}
              onClick={() => setPeriod("7")}
            >
              Últimos 7 Dias
            </Button>
            <Button
              size="sm"
              variant={period === "30" ? "default" : "outline"}
              onClick={() => setPeriod("30")}
            >
              Últimos 30 Dias
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Select value={attendantFilter} onValueChange={setAttendantFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Conferente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os conferentes</SelectItem>
                {attendants.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button size="sm" variant="outline" onClick={exportXlsx}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={exportPdf}>
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </CardContent>
        </Card>

        {/* KPIs do período filtrado */}
        <div className="grid sm:grid-cols-4 gap-3">
          <KpiCard label="Total de Consertos" value={String(totalReg)} />
          <KpiCard label="Média por Dia" value={avgPerDay} />
          <KpiCard
            label="Conferente Top"
            value={totalsByAttendant[0]?.name ?? "—"}
            sub={totalsByAttendant[0] ? `${totalsByAttendant[0].count} registros` : ""}
          />
          <KpiCard
            label="Cliente Top"
            value={totalsByClient[0]?.name ?? "—"}
            sub={totalsByClient[0] ? `${totalsByClient[0].count} registros` : ""}
          />
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Consertos por Dia</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Consertos por Conferente</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalsByAttendant}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Totais por cliente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total por Cliente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right w-[120px]">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalsByClient.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  totalsByClient.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right font-medium">{c.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lista de consertos */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Lista de Consertos ({sorted.length})</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortAsc((v) => !v)}
              className="h-8"
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              {sortAsc ? "Mais antigo" : "Mais recente"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead className="w-[70px]">Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-[100px]">Pedido</TableHead>
                  <TableHead>Conferente</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{fmtDate(r.created_at)}</TableCell>
                      <TableCell>{fmtTime(r.created_at)}</TableCell>
                      <TableCell>{r.client_name}</TableCell>
                      <TableCell>#{r.order_number}</TableCell>
                      <TableCell>{r.attendant_name}</TableCell>
                      <TableCell className="max-w-[400px] truncate" title={r.description}>
                        {r.description}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface Summary {
  total: number;
  topAttendant: string;
  topClient: string;
}

function buildSummary(rows: RepairRow[], days: number): Summary {
  const since = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days + 1);
    return d;
  })();
  const subset = rows.filter((r) => new Date(r.created_at) >= since);
  const aMap = new Map<string, number>();
  const cMap = new Map<string, number>();
  for (const r of subset) {
    aMap.set(r.attendant_name, (aMap.get(r.attendant_name) ?? 0) + 1);
    cMap.set(r.client_name, (cMap.get(r.client_name) ?? 0) + 1);
  }
  const topA = Array.from(aMap.entries()).sort((a, b) => b[1] - a[1])[0];
  const topC = Array.from(cMap.entries()).sort((a, b) => b[1] - a[1])[0];
  return {
    total: subset.length,
    topAttendant: topA ? `${topA[0]} (${topA[1]})` : "—",
    topClient: topC ? `${topC[0]} (${topC[1]})` : "—",
  };
}

function SummaryCard({ title, s }: { title: string; s: Summary }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{s.total}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Conferente Top</p>
          <p className="font-medium truncate" title={s.topAttendant}>
            {s.topAttendant}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Cliente Top</p>
          <p className="font-medium truncate" title={s.topClient}>
            {s.topClient}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-bold truncate" title={value}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
