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
      history: {
        Row: {
          created_at: string
          id: string
          input: string
          kind: Database["public"]["Enums"]["generation_kind"]
          meta: Json
          output: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input: string
          kind: Database["public"]["Enums"]["generation_kind"]
          meta?: Json
          output: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: string
          kind?: Database["public"]["Enums"]["generation_kind"]
          meta?: Json
          output?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activated_at: string | null
          activated_by_admin: string | null
          created_at: string
          email: string | null
          id: string
          is_premium: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          premium_expires_at: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by_admin?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_premium?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          premium_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by_admin?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_premium?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          premium_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_audit: {
        Row: {
          action: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          generations: number
          id: string
          period_start: string
          regenerations: number
          updated_at: string
          user_id: string
        }
        Insert: {
          generations?: number
          id?: string
          period_start: string
          regenerations?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          generations?: number
          id?: string
          period_start?: string
          regenerations?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          activated_at: string
          email: string
          is_premium: boolean
          month_generations: number
          month_regenerations: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          premium_expires_at: string
          signed_up_at: string
          subscription_status: string
          user_id: string
        }[]
      }
      admin_reset_usage: { Args: { _user_id: string }; Returns: undefined }
      admin_set_plan: {
        Args: {
          _expires_at: string
          _notes?: string
          _plan: Database["public"]["Enums"]["subscription_plan"]
          _status?: string
          _user_id: string
        }
        Returns: undefined
      }
      admin_set_premium: {
        Args: { _expires_at: string; _is_premium: boolean; _user_id: string }
        Returns: undefined
      }
      admin_stats: {
        Args: never
        Returns: {
          free_users: number
          month_generations: number
          month_regenerations: number
          premium_users: number
          total_users: number
        }[]
      }
      current_period_start: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { _is_regen: boolean; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      generation_kind: "email" | "message" | "reply"
      subscription_plan: "free" | "starter" | "pro" | "premium" | "business"
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
      app_role: ["admin", "user"],
      generation_kind: ["email", "message", "reply"],
      subscription_plan: ["free", "starter", "pro", "premium", "business"],
    },
  },
} as const
