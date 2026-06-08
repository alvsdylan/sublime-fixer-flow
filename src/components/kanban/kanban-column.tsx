import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "./kanban-card";
import type { RepairCard, RepairStatus } from "@/lib/repair-types";
import { STATUS_LABELS, STATUS_COLOR } from "@/lib/repair-types";

interface Props {
  status: RepairStatus;
  cards: RepairCard[];
  onAdd: (status: RepairStatus) => void;
  onEdit: (c: RepairCard) => void;
  onDelete: (c: RepairCard) => void;
  onViewImage: (url: string) => void;
}

export function KanbanColumn({ status, cards, onAdd, onEdit, onDelete, onViewImage }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = STATUS_COLOR[status];

  return (
    <div className="flex flex-col bg-muted/40 rounded-xl border border-border w-[300px] min-w-[300px] max-h-full">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          <h2 className="font-semibold text-sm">{STATUS_LABELS[status]}</h2>
          <span className="text-xs bg-background px-1.5 py-0.5 rounded-full text-muted-foreground border">
            {cards.length}
          </span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAdd(status)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${isOver ? "bg-accent/40" : ""}`}
      >
        {cards.map((c) => (
          <KanbanCard key={c.id} card={c} onEdit={onEdit} onDelete={onDelete} onViewImage={onViewImage} />
        ))}
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum cartão</p>
        )}
      </div>
    </div>
  );
}
