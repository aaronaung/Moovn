export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      content: {
        Row: {
          created_at: string | null
          destination_id: string | null
          id: string
          metadata: Json | null
          owner_id: string
          source_data_view: string
          source_id: string
          template_id: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          destination_id?: string | null
          id?: string
          metadata?: Json | null
          owner_id: string
          source_data_view: string
          source_id: string
          template_id?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          destination_id?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string
          source_data_view?: string
          source_id?: string
          template_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_owner_id_foreign"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content_id: string
          created_at: string | null
          hash: string | null
          id: string
          metadata: Json | null
          position: number
          template_item_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          hash?: string | null
          id?: string
          metadata?: Json | null
          position: number
          template_item_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          hash?: string | null
          id?: string
          metadata?: Json | null
          position?: number
          template_item_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedules: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          name: string
          owner_id: string
          published_at: string | null
          result: Json | null
          schedule_expression: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          published_at?: string | null
          result?: Json | null
          schedule_expression: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          published_at?: string | null
          result?: Json | null
          schedule_expression?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_schedules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_schedules_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          created_at: string | null
          id: string
          linked_ig_user_id: string | null
          long_lived_token: string | null
          name: string
          owner_id: string
          token_last_refreshed_at: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          linked_ig_user_id?: string | null
          long_lived_token?: string | null
          name: string
          owner_id: string
          token_last_refreshed_at?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          linked_ig_user_id?: string | null
          long_lived_token?: string | null
          name?: string
          owner_id?: string
          token_last_refreshed_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_owner_id_foreign"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      source_syncs: {
        Row: {
          created_at: string
          duration_ms: number | null
          errors: Json | null
          id: string
          source_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          source_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          source_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_syncs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          settings: Json
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          settings: Json
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_owner_id_foreign"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_instructor_links: {
        Row: {
          created_at: string | null
          id: string
          id_in_source: string | null
          instructor_email: string
          invited_at: string
          source_id: string | null
          status: Database["public"]["Enums"]["link_status"]
          studio_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_in_source?: string | null
          instructor_email: string
          invited_at?: string
          source_id?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          studio_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_in_source?: string | null
          instructor_email?: string
          invited_at?: string
          source_id?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          studio_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_instructor_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      template_item_design_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          owner_id: string
          status: string
          template_item_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          owner_id: string
          status: string
          template_item_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          owner_id?: string
          status?: string
          template_item_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_item_design_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_item_design_requests_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          position: number
          template_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          position: number
          template_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          position?: number
          template_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content_type: string
          created_at: string | null
          id: string
          ig_caption_template: string | null
          is_carousel: boolean
          name: string
          owner_id: string
          source_data_view: string
          updated_at: string | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          id?: string
          ig_caption_template?: string | null
          is_carousel?: boolean
          name: string
          owner_id: string
          source_data_view: string
          updated_at?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          id?: string
          ig_caption_template?: string | null
          is_carousel?: boolean
          name?: string
          owner_id?: string
          source_data_view?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_owner_id_foreign"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          email_verified_at: string | null
          first_name: string | null
          handle: string | null
          id: string
          last_name: string | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          handle?: string | null
          id?: string
          last_name?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          handle?: string | null
          id?: string
          last_name?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_content_items_position: {
        Args: { items: Json }
        Returns: undefined
      }
      update_template_items_position: {
        Args: { items: Json }
        Returns: undefined
      }
    }
    Enums: {
      link_status: "pending" | "accepted" | "denied"
      user_type: "studio" | "instructor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      link_status: ["pending", "accepted", "denied"],
      user_type: ["studio", "instructor"],
    },
  },
} as const
