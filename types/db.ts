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
      carousel_items: {
        Row: {
          carousel_id: string | null
          content: string | null
          created_at: string | null
          id: string
          position: number
        }
        Insert: {
          carousel_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          position: number
        }
        Update: {
          carousel_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "carousel_items_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "carousels"
            referencedColumns: ["id"]
          },
        ]
      }
      carousels: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          created_at: string | null
          data_hash: string | null
          destination_id: string
          id: string
          metadata: Json | null
          owner_id: string
          source_data_view: string
          source_id: string
          template_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_hash?: string | null
          destination_id: string
          id?: string
          metadata?: Json | null
          owner_id: string
          source_data_view: string
          source_id: string
          template_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_hash?: string | null
          destination_id?: string
          id?: string
          metadata?: Json | null
          owner_id?: string
          source_data_view?: string
          source_id?: string
          template_id?: string
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
          schedule_expression: string
          updated_at: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          schedule_expression: string
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          schedule_expression?: string
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
      published_content: {
        Row: {
          content_id: string | null
          id: string
          ig_media_id: string | null
          ig_media_url: string | null
          ig_permalink: string | null
          owner_id: string
          published_at: string | null
          schedule_id: string | null
        }
        Insert: {
          content_id?: string | null
          id?: string
          ig_media_id?: string | null
          ig_media_url?: string | null
          ig_permalink?: string | null
          owner_id: string
          published_at?: string | null
          schedule_id?: string | null
        }
        Update: {
          content_id?: string | null
          id?: string
          ig_media_id?: string | null
          ig_media_url?: string | null
          ig_permalink?: string | null
          owner_id?: string
          published_at?: string | null
          schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "published_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_content_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_content_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "content_schedules"
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
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_content_template_links: {
        Args: {
          arg_content_id: string
          new_template_ids: string[]
        }
        Returns: undefined
      }
      update_content_items_position: {
        Args: {
          items: Json
        }
        Returns: undefined
      }
      update_template_items_position: {
        Args: {
          items: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
