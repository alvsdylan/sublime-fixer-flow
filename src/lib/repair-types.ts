export type RepairStatus = "todo" | "in_progress" | "corrected" | "finished";

export interface RepairCard {
  id: string;
  client_name: string;
  order_number: string;
  description: string;
  art_link: string | null;
  attendant_name: string;
  image_url: string | null;
  status: RepairStatus;
  position: number;
  request_date: string;
  created_at: string;
  updated_at: string;
}

export interface RepairHistory {
  id: string;
  card_id: string;
  from_status: RepairStatus | null;
  to_status: RepairStatus;
  changed_at: string;
}

export const STATUS_LABELS: Record<RepairStatus, string> = {
  todo: "A Fazer",
  in_progress: "Em Correção",
  corrected: "Corrigidos",
  finished: "Finalizados",
};

export const STATUS_ORDER: RepairStatus[] = ["todo", "in_progress", "corrected", "finished"];

export const STATUS_COLOR: Record<RepairStatus, string> = {
  todo: "var(--col-todo)",
  in_progress: "var(--col-progress)",
  corrected: "var(--col-corrected)",
  finished: "var(--col-finished)",
};
