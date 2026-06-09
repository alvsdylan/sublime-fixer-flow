import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  X,
  ExternalLink,
  Hash,
  Calendar,
  Clock,
  Trash2,
  Pencil,
  Eye,
  History as HistoryIcon,
  Loader2,
  User as UserIcon,
  Shirt,
  Palette,
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
import type {
  ProductionOrder,
  ProductionAuditEntry,
  ProductionStatus,
} from "@/lib/production-types";
import {
  PROD_STATUS_LABELS,
  PROD_STATUS_ORDER,
  PROD_STATUS_COLOR,
} from "@/lib/production-types";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Controle de Produção" },
      {
        name: "description",
        content: "Quadro Kanban para acompanhar a produção de pedidos.",
      },
    ],
  }),
  component: ProductionPage,
});

const FABRIC_SUGGESTIONS = ["Dry Fit", "PV", "Helanca", "Poliéster", "Tactel", "Algodão", "Outro"];
const COLOR_SUGGESTIONS = ["RGB", "CMYK", "Pantone", "Sublimação", "Outro"];

type StatusFilter = ProductionStatus | "all";

function ProductionPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionOrder | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ProductionStatus>("molde");
  const [detail, setDetail] = useState<ProductionOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrder | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("production_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar: " + error.message);
    else setOrders((data ?? []) as ProductionOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("production_orders_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_orders" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (q) {
        const hit =
          o.client_name.toLowerCase().includes(q) ||
          o.order_number.toLowerCase().includes(q) ||
          (o.fabric ?? "").toLowerCase().includes(q) ||
          (o.art_link ?? "").toLowerCase().includes(q) ||
          (o.color_profile ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (dateFilter) {
        const d = new Date(o.created_at).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [orders, search, dateFilter]);

  const byStatus = useMemo(() => {
    const m: Record<ProductionStatus, ProductionOrder[]> = {
      molde: [],
      impresso: [],
      calandra: [],
    };
    for (const o of filtered) m[o.status].push(o);
    return m;
  }, [filtered]);

  async function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const newCol = e.over?.id as ProductionStatus | undefined;
    if (!newCol || !PROD_STATUS_ORDER.includes(newCol)) return;
    const order = orders.find((o) => o.id === id);
    if (!order || order.status === newCol) return;

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newCol } : o)),
    );
    const { error } = await supabase
      .from("production_orders")
      .update({ status: newCol })
      .eq("id", id);
    if (error) {
      toast.error("Falha ao mover: " + error.message);
      load();
    }
  }

  function openNew(status: ProductionStatus) {
    setEditing(null);
    setDefaultStatus(status);
    setEditorOpen(true);
  }

  function openEdit(o: ProductionOrder) {
    setEditing(o);
    setEditorOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("production_orders")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else {
      toast.success("Pedido excluído");
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      if (detail?.id === deleteTarget.id) setDetail(null);
    }
    setDeleteTarget(null);
  }

  const hasFilters =
    !!search || !!dateFilter || statusFilter !== "all" || !!clientFilter || !!orderFilter || !!fabricFilter;

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors position="top-right" />

      <header className="border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-base font-bold leading-tight">Controle de Produção</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Acompanhamento de pedidos em produção
            </p>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, pedido ou tecido…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button onClick={() => openNew("molde")} className="h-9">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Pedido
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {PROD_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{PROD_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Cliente"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
          <Input
            placeholder="Nº pedido"
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="h-8 w-[120px] text-xs"
          />
          <Input
            placeholder="Tecido"
            value={fabricFilter}
            onChange={(e) => setFabricFilter(e.target.value)}
            className="h-8 w-[120px] text-xs"
          />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 w-[150px] text-xs"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setStatusFilter("all");
                setClientFilter("");
                setOrderFilter("");
                setFabricFilter("");
              }}
            >
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {PROD_STATUS_ORDER.map((s) => (
              <ProductionColumn
                key={s}
                status={s}
                orders={byStatus[s]}
                onAdd={openNew}
                onOpen={setDetail}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </DndContext>
        {loading && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Carregando…
          </p>
        )}
      </main>

      <OrderEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        defaultStatus={defaultStatus}
        order={editing}
        onSaved={load}
      />

      <OrderDetail
        order={detail}
        onClose={() => setDetail(null)}
        onEdit={(o) => {
          setDetail(null);
          openEdit(o);
        }}
        onDelete={(o) => setDeleteTarget(o)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto removerá o pedido do cliente "{deleteTarget?.client_name}"
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Column ---------------- */

function ProductionColumn({
  status,
  orders,
  onAdd,
  onOpen,
  onEdit,
  onDelete,
}: {
  status: ProductionStatus;
  orders: ProductionOrder[];
  onAdd: (s: ProductionStatus) => void;
  onOpen: (o: ProductionOrder) => void;
  onEdit: (o: ProductionOrder) => void;
  onDelete: (o: ProductionOrder) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = PROD_STATUS_COLOR[status];

  return (
    <div className="flex flex-col bg-muted/40 rounded-xl border border-border w-[300px] min-w-[300px] max-h-full">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: accent }}
          />
          <h2 className="font-semibold text-sm">{PROD_STATUS_LABELS[status]}</h2>
          <span className="text-xs bg-background px-1.5 py-0.5 rounded-full text-muted-foreground border">
            {orders.length}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onAdd(status)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${
          isOver ? "bg-accent/40" : ""
        }`}
      >
        {orders.map((o) => (
          <ProductionCard
            key={o.id}
            order={o}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {orders.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhum pedido
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */

function ProductionCard({
  order,
  onOpen,
  onEdit,
  onDelete,
}: {
  order: ProductionOrder;
  onOpen: (o: ProductionOrder) => void;
  onEdit: (o: ProductionOrder) => void;
  onDelete: (o: ProductionOrder) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: order.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    borderLeftColor: PROD_STATUS_COLOR[order.status],
  };

  const d = new Date(order.created_at);
  const dateStr = d.toLocaleDateString("pt-BR");
  const timeStr = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border border-l-4 p-3 group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">
            {order.client_name}
          </h3>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-0.5">
            <Hash className="h-2.5 w-2.5" /> {order.order_number}
          </span>
        </div>

        {(order.fabric || order.color_profile) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {order.fabric && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                <Shirt className="h-2.5 w-2.5" /> {order.fabric}
              </span>
            )}
            {order.color_profile && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                <Palette className="h-2.5 w-2.5" /> {order.color_profile}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeStr}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
        {order.art_link && (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <a
              href={order.art_link}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Arte
            </a>
          </Button>
        )}
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Visualizar"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(order);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Eye className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Editar"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(order);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Excluir"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(order);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Editor ---------------- */

function OrderEditor({
  open,
  onOpenChange,
  defaultStatus,
  order,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultStatus: ProductionStatus;
  order: ProductionOrder | null;
  onSaved: () => void;
}) {
  const [clientName, setClientName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [artLink, setArtLink] = useState("");
  const [fabric, setFabric] = useState("");
  const [colorProfile, setColorProfile] = useState("");
  const [status, setStatus] = useState<ProductionStatus>(defaultStatus);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientName(order?.client_name ?? "");
      setOrderNumber(order?.order_number ?? "");
      setArtLink(order?.art_link ?? "");
      setFabric(order?.fabric ?? "");
      setColorProfile(order?.color_profile ?? "");
      setStatus(order?.status ?? defaultStatus);
    }
  }, [open, order, defaultStatus]);

  async function handleSave() {
    if (!clientName || !orderNumber) {
      toast.error("Preencha cliente e número do pedido");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_name: clientName,
        order_number: orderNumber,
        art_link: artLink || null,
        fabric: fabric || null,
        color_profile: colorProfile || null,
        status,
      };
      if (order) {
        const { error } = await supabase
          .from("production_orders")
          .update(payload)
          .eq("id", order.id);
        if (error) throw error;
        toast.success("Pedido atualizado");
      } else {
        const { error } = await supabase.from("production_orders").insert(payload);
        if (error) throw error;
        toast.success("Pedido criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Editar Pedido" : "Novo Pedido de Produção"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do Cliente *</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div>
            <Label>Número do Pedido *</Label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>
          <div>
            <Label>Arte (link)</Label>
            <Input
              value={artLink}
              onChange={(e) => setArtLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Tecido</Label>
            <Input
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              placeholder="Dry Fit, PV, Helanca, Poliéster, Tactel, Algodão…"
              list="fabric-suggestions"
            />
            <datalist id="fabric-suggestions">
              {FABRIC_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Perfil de Cores</Label>
            <Input
              value={colorProfile}
              onChange={(e) => setColorProfile(e.target.value)}
              placeholder="RGB, CMYK, Pantone, Sublimação…"
              list="color-suggestions"
            />
            <datalist id="color-suggestions">
              {COLOR_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>{order ? "Status" : "Status Inicial"}</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProductionStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROD_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

/* ---------------- Detail ---------------- */

function OrderDetail({
  order,
  onClose,
  onEdit,
  onDelete,
}: {
  order: ProductionOrder | null;
  onClose: () => void;
  onEdit: (o: ProductionOrder) => void;
  onDelete: (o: ProductionOrder) => void;
}) {
  const [history, setHistory] = useState<ProductionAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!order) return;
    setLoading(true);
    supabase
      .from("audit_log")
      .select("id,user_name,action,created_at,details")
      .eq("module", "Produção")
      .contains("details", { id: order.id })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar histórico");
        else setHistory((data ?? []) as ProductionAuditEntry[]);
        setLoading(false);
      });
  }, [order]);

  if (!order) return null;
  const d = new Date(order.created_at);

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Row label="Cliente" value={order.client_name} />
          <Row label="Nº do Pedido" value={order.order_number} />
          <Row
            label="Arte"
            value={
              order.art_link ? (
                <a
                  href={order.art_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Abrir arte <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <Row label="Tecido" value={order.fabric || <span className="text-muted-foreground">—</span>} />
          <Row label="Perfil de Cores" value={order.color_profile || <span className="text-muted-foreground">—</span>} />
          <Row
            label="Status Atual"
            value={
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  background: `color-mix(in oklab, ${PROD_STATUS_COLOR[order.status]} 18%, transparent)`,
                  color: PROD_STATUS_COLOR[order.status],
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: PROD_STATUS_COLOR[order.status] }}
                />
                {PROD_STATUS_LABELS[order.status]}
              </span>
            }
          />
          <Row label="Data de criação" value={d.toLocaleDateString("pt-BR")} />
          <Row
            label="Horário de criação"
            value={d.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          />
          <Row
            label="Usuário responsável"
            value={
              order.created_by_name ? (
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="h-3 w-3" /> {order.created_by_name}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />

          <div className="pt-3 border-t border-border">
            <p className="text-xs font-semibold inline-flex items-center gap-1.5 mb-2">
              <HistoryIcon className="h-3.5 w-3.5" /> Histórico de Movimentações
            </p>
            {loading && (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            )}
            {!loading && history.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem movimentações.</p>
            )}
            <ul className="space-y-1.5">
              {history.map((h) => {
                const hd = new Date(h.created_at);
                return (
                  <li
                    key={h.id}
                    className="text-xs flex flex-wrap items-center gap-1.5 bg-muted/50 rounded px-2 py-1.5"
                  >
                    <span className="font-mono text-muted-foreground">
                      {hd.toLocaleDateString("pt-BR")}{" "}
                      {hd.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium">{h.user_name ?? "—"}</span>
                    <span>{h.action}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => onDelete(order)}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Excluir
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => onEdit(order)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
