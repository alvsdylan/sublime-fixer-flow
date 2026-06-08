export type ProductionStatus = "molde" | "impresso" | "calandra";

export interface ProductionOrder {
  id: string;
  client_name: string;
  order_number: string;
  art_link: string | null;
  status: ProductionStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionHistory {
  id: string;
  order_id: string;
  from_status: ProductionStatus | null;
  to_status: ProductionStatus;
  changed_at: string;
}

export const PROD_STATUS_LABELS: Record<ProductionStatus, string> = {
  molde: "Molde",
  impresso: "Impresso",
  calandra: "Calandra",
};

export const PROD_STATUS_ORDER: ProductionStatus[] = ["molde", "impresso", "calandra"];

export const PROD_STATUS_COLOR: Record<ProductionStatus, string> = {
  molde: "var(--col-molde)",
  impresso: "var(--col-impresso)",
  calandra: "var(--col-calandra)",
};
