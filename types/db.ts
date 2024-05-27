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
      availability_schedules: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slot_overrides: {
        Row: {
          availability_schedule_id: string
          created_at: string
          date: string
          end: number
          id: string
          start: number
        }
        Insert: {
          availability_schedule_id: string
          created_at?: string
          date: string
          end: number
          id?: string
          start: number
        }
        Update: {
          availability_schedule_id?: string
          created_at?: string
          date?: string
          end?: number
          id?: string
          start?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_slot_overrides_availability_schedule_id_fkey"
            columns: ["availability_schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_weekly_slots: {
        Row: {
          availability_schedule_id: string
          created_at: string
          day: string
          end: number
          id: string
          start: number
          updated_at: string | null
        }
        Insert: {
          availability_schedule_id: string
          created_at?: string
          day: string
          end: number
          id?: string
          start: number
          updated_at?: string | null
        }
        Update: {
          availability_schedule_id?: string
          created_at?: string
          day?: string
          end?: number
          id?: string
          start?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_weekly_slots_availability_schedule_id_fkey"
            columns: ["availability_schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booker_id: string
          business_id: string
          chat_room_id: string
          created_at: string | null
          end: string
          id: string
          service_event_id: string | null
          service_id: string
          start: string
          status: string
          updated_at: string | null
        }
        Insert: {
          booker_id: string
          business_id: string
          chat_room_id: string
          created_at?: string | null
          end: string
          id?: string
          service_event_id?: string | null
          service_id: string
          start: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          booker_id?: string
          business_id?: string
          chat_room_id?: string
          created_at?: string | null
          end?: string
          id?: string
          service_event_id?: string | null
          service_id?: string
          start?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_event_id_fkey"
            columns: ["service_event_id"]
            isOneToOne: false
            referencedRelation: "service_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          city: string | null
          country_code: string | null
          cover_photo_url: string | null
          created_at: string | null
          current_plan: string | null
          description: string | null
          email: string
          facebook_link: string | null
          handle: string
          id: string
          inactive: boolean | null
          instagram_handle: string | null
          logo_url: string | null
          owner_id: string
          phone: string | null
          state: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_default_payment_method_id: string | null
          stripe_subscription_id: string | null
          tiktok_handle: string | null
          title: string
          updated_at: string | null
          verified: boolean | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country_code?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          current_plan?: string | null
          description?: string | null
          email: string
          facebook_link?: string | null
          handle: string
          id?: string
          inactive?: boolean | null
          instagram_handle?: string | null
          logo_url?: string | null
          owner_id: string
          phone?: string | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_default_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          tiktok_handle?: string | null
          title: string
          updated_at?: string | null
          verified?: boolean | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country_code?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          current_plan?: string | null
          description?: string | null
          email?: string
          facebook_link?: string | null
          handle?: string
          id?: string
          inactive?: boolean | null
          instagram_handle?: string | null
          logo_url?: string | null
          owner_id?: string
          phone?: string | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_default_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          tiktok_handle?: string | null
          title?: string
          updated_at?: string | null
          verified?: boolean | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          room_id: string
          sender_business_id: string | null
          sender_user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          room_id: string
          sender_business_id?: string | null
          sender_user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          room_id?: string
          sender_business_id?: string | null
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_business_id_fkey"
            columns: ["sender_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_participants: {
        Row: {
          business_id: string
          created_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_participants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          business_id: string
          created_at: string | null
          delisted: boolean | null
          description: string | null
          difficulty: string
          id: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          delisted?: boolean | null
          description?: string | null
          difficulty: string
          id?: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          delisted?: boolean | null
          description?: string | null
          difficulty?: string
          id?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      question_answers: {
        Row: {
          booking_id: string
          bool_answer: boolean | null
          created_at: string | null
          multiselect_answer: string[] | null
          question_id: string
          select_answer: string | null
          text_answer: string | null
        }
        Insert: {
          booking_id: string
          bool_answer?: boolean | null
          created_at?: string | null
          multiselect_answer?: string[] | null
          question_id: string
          select_answer?: string | null
          text_answer?: string | null
        }
        Update: {
          booking_id?: string
          bool_answer?: boolean | null
          created_at?: string | null
          multiselect_answer?: string[] | null
          question_id?: string
          select_answer?: string | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          business_id: string
          created_at: string | null
          enabled: boolean | null
          id: string
          options: string[] | null
          question: string
          required: boolean | null
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          options?: string[] | null
          question: string
          required?: boolean | null
          type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          options?: string[] | null
          question?: string
          required?: boolean | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      review_services: {
        Row: {
          business_id: string
          created_at: string | null
          enabled: boolean
          id: string
          price: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          price?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          price?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      review_submissions: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          instructor_comment: string | null
          status: string
          student_comment: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          instructor_comment?: string | null
          status?: string
          student_comment?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          instructor_comment?: string | null
          status?: string
          student_comment?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_submissions_classes_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_submissions_users_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_event_live_streams: {
        Row: {
          created_at: string
          id: string
          join_url: string | null
          password: string | null
          service_event_id: string | null
          start: string
          start_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          join_url?: string | null
          password?: string | null
          service_event_id?: string | null
          start: string
          start_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          join_url?: string | null
          password?: string | null
          service_event_id?: string | null
          start?: string
          start_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_event_live_streams_service_event_id_fkey"
            columns: ["service_event_id"]
            isOneToOne: false
            referencedRelation: "service_events"
            referencedColumns: ["id"]
          },
        ]
      }
      service_events: {
        Row: {
          availability_schedule_id: string | null
          created_at: string | null
          end: string
          id: string
          recurrence_count: number | null
          recurrence_interval: number | null
          recurrence_start: string | null
          service_id: string
          start: string
          updated_at: string | null
        }
        Insert: {
          availability_schedule_id?: string | null
          created_at?: string | null
          end: string
          id?: string
          recurrence_count?: number | null
          recurrence_interval?: number | null
          recurrence_start?: string | null
          service_id: string
          start: string
          updated_at?: string | null
        }
        Update: {
          availability_schedule_id?: string | null
          created_at?: string | null
          end?: string
          id?: string
          recurrence_count?: number | null
          recurrence_interval?: number | null
          recurrence_start?: string | null
          service_id?: string
          start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_events_availability_schedule_id_fkey"
            columns: ["availability_schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_events_staffs: {
        Row: {
          service_event_id: string
          staff_id: string
        }
        Insert: {
          service_event_id: string
          staff_id: string
        }
        Update: {
          service_event_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_events_staffs_service_event_id_fkey"
            columns: ["service_event_id"]
            isOneToOne: false
            referencedRelation: "service_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_events_staffs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staffs"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          availability_schedule_id: string | null
          booking_limit: number | null
          business_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          duration: number
          id: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          availability_schedule_id?: string | null
          booking_limit?: number | null
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          availability_schedule_id?: string | null
          booking_limit?: number | null
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_availability_schedule_id_fkey"
            columns: ["availability_schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      services_questions: {
        Row: {
          question_id: string
          service_id: string
        }
        Insert: {
          question_id: string
          service_id: string
        }
        Update: {
          question_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_questions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      staffs: {
        Row: {
          business_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          instagram_handle: string | null
          last_name: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          instagram_handle?: string | null
          last_name?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          instagram_handle?: string | null
          last_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staffs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stripe_products: {
        Row: {
          created_at: string | null
          quantity: number
          stripe_product_id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          quantity: number
          stripe_product_id: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          quantity?: number
          stripe_product_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stripe_products_user_id_fkey"
            columns: ["user_id"]
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
      can_user_request_review_from_business: {
        Args: {
          business_id_param: string
          user_id_param: string
        }
        Returns: boolean
      }
      get_business_data: {
        Args: {
          business_handle: string
        }
        Returns: Json
      }
      get_classes_not_owned_by_authed_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          business_id: string
          business: Json
          created_at: string
          updated_at: string
          title: string
          description: string
          price: number
          stripe_product_id: string
          stripe_price_id: string
          difficulty: string
        }[]
      }
      get_classes_owned_by_authed_user: {
        Args: {
          business_id_param?: string
        }
        Returns: {
          id: string
          business_id: string
          business: Json
          created_at: string
          updated_at: string
          title: string
          description: string
          price: number
          stripe_product_id: string
          stripe_price_id: string
          difficulty: string
        }[]
      }
      get_scheduled_events_in_time_range: {
        Args: {
          business_handle: string
          start_time: string
          end_time: string
          availability_schedule_id_arg?: string
        }
        Returns: Json
      }
      get_user_review_ownership: {
        Args: {
          business_id_param: string
          user_id_param: string
        }
        Returns: number
      }
      request_review: {
        Args: {
          id_param: string
          user_id_param: string
          class_id_param: string
          business_id_param: string
          student_comment_param?: string
        }
        Returns: string
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

