import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { CardEditor } from "@/components/kanban/card-editor";
import type { RepairCard, RepairStatus } from "@/lib/repair-types";
import { STATUS_ORDER } from "@/lib/repair-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Consertos de Sublimação" },
      { name: "description", content: "Quadro Kanban para registrar e acompanhar consertos de pedidos de sublimação." },
    ],
  }),
  component: KanbanPage,
});

function KanbanPage() {
  const [cards, setCards] = useState<RepairCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RepairCard | null>(null);
  const [newStatus, setNewStatus] = useState<RepairStatus>("todo");
  const [deleteTarget, setDeleteTarget] = useState<RepairCard | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("repair_cards")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar: " + error.message);
    else setCards((data ?? []) as RepairCard[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel("repair_cards_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "repair_cards" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (q) {
        const hit = c.client_name.toLowerCase().includes(q) || c.order_number.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (dateFilter) {
        const d = new Date(c.request_date).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [cards, search, dateFilter]);

  const byStatus = useMemo(() => {
    const m: Record<RepairStatus, RepairCard[]> = { todo: [], in_progress: [], corrected: [], finished: [] };
    for (const c of filtered) m[c.status].push(c);
    return m;
  }, [filtered]);

  async function handleDragEnd(e: DragEndEvent) {
    const cardId = String(e.active.id);
    const newCol = e.over?.id as RepairStatus | undefined;
    if (!newCol || !STATUS_ORDER.includes(newCol)) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newCol) return;

    // Optimistic
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: newCol } : c)));
    const { error } = await supabase.from("repair_cards").update({ status: newCol }).eq("id", cardId);
    if (error) {
      toast.error("Falha ao mover: " + error.message);
      load();
    }
  }

  function openNew(status: RepairStatus) {
    setEditing(null);
    setNewStatus(status);
    setEditorOpen(true);
  }

  function openEdit(c: RepairCard) {
    setEditing(c);
    setEditorOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("repair_cards").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else {
      toast.success("Cartão excluído");
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors position="top-right" />

      <header className="border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">S</div>
          <div>
            <h1 className="text-base font-bold leading-tight">Consertos de Sublimação</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Acompanhamento rápido dos pedidos</p>
          </div>
        </div>

        <div className="flex-1 flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou pedido…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 w-[160px]"
          />
          {(search || dateFilter) && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setSearch(""); setDateFilter(""); }}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={() => openNew("todo")} className="h-9">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {STATUS_ORDER.map((s) => (
              <KanbanColumn
                key={s}
                status={s}
                cards={byStatus[s]}
                onAdd={openNew}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onViewImage={setPreviewImage}
              />
            ))}
          </div>
        </DndContext>
        {loading && <p className="text-center text-sm text-muted-foreground mt-4">Carregando…</p>}
      </main>

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        card={editing}
        defaultStatus={newStatus}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto removerá o cartão do cliente "{deleteTarget?.client_name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Imagem anexada</DialogTitle></DialogHeader>
          {previewImage && <img src={previewImage} alt="anexo" className="w-full rounded-md" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewImage(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
