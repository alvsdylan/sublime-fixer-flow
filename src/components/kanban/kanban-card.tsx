import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, ImageIcon, Pencil, Trash2, User, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RepairCard } from "@/lib/repair-types";
import { STATUS_COLOR } from "@/lib/repair-types";

interface Props {
  card: RepairCard;
  onEdit: (c: RepairCard) => void;
  onDelete: (c: RepairCard) => void;
  onViewImage: (url: string) => void;
}

export function KanbanCard({ card, onEdit, onDelete, onViewImage }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    borderLeftColor: STATUS_COLOR[card.status],
  };

  const date = new Date(card.request_date);
  const dateStr = date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border border-l-4 p-3 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{card.client_name}</h3>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-0.5">
            <Hash className="h-2.5 w-2.5" /> {card.order_number}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{card.description}</p>

        {card.image_url && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewImage(card.image_url!); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-2 w-full"
          >
            <img src={card.image_url} alt="" className="w-full h-24 object-cover rounded border" />
          </button>
        )}

        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{card.attendant_name}</span>
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{dateStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
        {card.art_link && (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <a href={card.art_link} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}>
              <ExternalLink className="h-3 w-3 mr-1" /> Arte
            </a>
          </Button>
        )}
        {card.image_url && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); onViewImage(card.image_url!); }}
            onPointerDown={(e) => e.stopPropagation()}>
            <ImageIcon className="h-3 w-3" />
          </Button>
        )}
        <div className="flex-1" />
        <Button size="icon" variant="ghost" className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit(card); }}
          onPointerDown={(e) => e.stopPropagation()}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(card); }}
          onPointerDown={(e) => e.stopPropagation()}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
