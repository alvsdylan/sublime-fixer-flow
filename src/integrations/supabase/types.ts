export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          module: string
          target: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          module: string
          target?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          module?: string
          target?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      production_order_history: {
        Row: {
          changed_at: string
          from_status: Database["public"]["Enums"]["production_status"] | null
          id: string
          order_id: string
          to_status: Database["public"]["Enums"]["production_status"]
        }
        Insert: {
          changed_at?: string
          from_status?: Database["public"]["Enums"]["production_status"] | null
          id?: string
          order_id: string
          to_status: Database["public"]["Enums"]["production_status"]
        }
        Update: {
          changed_at?: string
          from_status?: Database["public"]["Enums"]["production_status"] | null
          id?: string
          order_id?: string
          to_status?: Database["public"]["Enums"]["production_status"]
        }
        Relationships: [
          {
            foreignKeyName: "production_order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          art_link: string | null
          client_name: string
          color_profile: string | null
          created_at: string
          created_by_id: string | null
          created_by_name: string | null
          fabric: string | null
          id: string
          order_number: string
          position: number
          status: Database["public"]["Enums"]["production_status"]
          updated_at: string
        }
        Insert: {
          art_link?: string | null
          client_name: string
          color_profile?: string | null
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          fabric?: string | null
          id?: string
          order_number: string
          position?: number
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
        }
        Update: {
          art_link?: string | null
          client_name?: string
          color_profile?: string | null
          created_at?: string
          created_by_id?: string | null
          created_by_name?: string | null
          fabric?: string | null
          id?: string
          order_number?: string
          position?: number
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      repair_card_history: {
        Row: {
          card_id: string
          changed_at: string
          from_status: Database["public"]["Enums"]["repair_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["repair_status"]
        }
        Insert: {
          card_id: string
          changed_at?: string
          from_status?: Database["public"]["Enums"]["repair_status"] | null
          id?: string
          to_status: Database["public"]["Enums"]["repair_status"]
        }
        Update: {
          card_id?: string
          changed_at?: string
          from_status?: Database["public"]["Enums"]["repair_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["repair_status"]
        }
        Relationships: [
          {
            foreignKeyName: "repair_card_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "repair_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_cards: {
        Row: {
          art_link: string | null
          attendant_name: string
          client_name: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          order_number: string
          position: number
          request_date: string
          status: Database["public"]["Enums"]["repair_status"]
          updated_at: string
        }
        Insert: {
          art_link?: string | null
          attendant_name: string
          client_name: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          order_number: string
          position?: number
          request_date?: string
          status?: Database["public"]["Enums"]["repair_status"]
          updated_at?: string
        }
        Update: {
          art_link?: string | null
          attendant_name?: string
          client_name?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          order_number?: string
          position?: number
          request_date?: string
          status?: Database["public"]["Enums"]["repair_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_username: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      production_status: "molde" | "impresso" | "calandra"
      repair_status: "todo" | "in_progress" | "corrected" | "finished"
      user_role: "admin" | "common"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      production_status: ["molde", "impresso", "calandra"],
      repair_status: ["todo", "in_progress", "corrected", "finished"],
      user_role: ["admin", "common"],
    },
  },
} as const
