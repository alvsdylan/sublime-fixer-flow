export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type RepairStatus = "todo" | "in_progress" | "corrected" | "finished"

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      repair_cards: {
        Row: {
          id: string; client_name: string; order_number: string; description: string;
          art_link: string | null; attendant_name: string; image_url: string | null;
          status: RepairStatus; position: number; request_date: string;
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; client_name: string; order_number: string; description: string;
          art_link?: string | null; attendant_name: string; image_url?: string | null;
          status?: RepairStatus; position?: number; request_date?: string;
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; client_name?: string; order_number?: string; description?: string;
          art_link?: string | null; attendant_name?: string; image_url?: string | null;
          status?: RepairStatus; position?: number; request_date?: string;
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      repair_card_history: {
        Row: { id: string; card_id: string; from_status: RepairStatus | null; to_status: RepairStatus; changed_at: string }
        Insert: { id?: string; card_id: string; from_status?: RepairStatus | null; to_status: RepairStatus; changed_at?: string }
        Update: { id?: string; card_id?: string; from_status?: RepairStatus | null; to_status?: RepairStatus; changed_at?: string }
        Relationships: [{ foreignKeyName: "repair_card_history_card_id_fkey"; columns: ["card_id"]; isOneToOne: false; referencedRelation: "repair_cards"; referencedColumns: ["id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { repair_status: RepairStatus }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Row: infer R } ? R : never
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: { Enums: { repair_status: ["todo", "in_progress", "corrected", "finished"] } },
} as const
