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
      admin_prospects: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          google_maps_url: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          place_id: string | null
          rating: number | null
          reviews_count: number | null
          search_query: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          search_query?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          place_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          search_query?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          completion_tokens: number
          created_at: string
          id: string
          metadata: Json | null
          model: string | null
          organization_id: string
          prompt_tokens: number
          session_id: string | null
          total_tokens: number
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          organization_id: string
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          organization_id?: string
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
        }
        Relationships: []
      }
      bot_configs: {
        Row: {
          after_hours_message: string
          ask_for_preferred_time: boolean
          booking_link: string | null
          bot_name: string
          business_hours_days: number[]
          business_hours_enabled: boolean
          business_hours_end: string
          business_hours_start: string
          business_hours_timezone: string
          created_at: string
          id: string
          is_active: boolean
          multilingual_enabled: boolean
          organization_id: string
          primary_knowledge: string | null
          sms_alert_phone: string | null
          support_email: string | null
          system_prompt: string | null
          tone: string | null
          updated_at: string
          webhook_secret: string
          webhook_url: string | null
          welcome_message: string | null
        }
        Insert: {
          after_hours_message?: string
          ask_for_preferred_time?: boolean
          booking_link?: string | null
          bot_name?: string
          business_hours_days?: number[]
          business_hours_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          business_hours_timezone?: string
          created_at?: string
          id?: string
          is_active?: boolean
          multilingual_enabled?: boolean
          organization_id: string
          primary_knowledge?: string | null
          sms_alert_phone?: string | null
          support_email?: string | null
          system_prompt?: string | null
          tone?: string | null
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Update: {
          after_hours_message?: string
          ask_for_preferred_time?: boolean
          booking_link?: string | null
          bot_name?: string
          business_hours_days?: number[]
          business_hours_enabled?: boolean
          business_hours_end?: string
          business_hours_start?: string
          business_hours_timezone?: string
          created_at?: string
          id?: string
          is_active?: boolean
          multilingual_enabled?: boolean
          organization_id?: string
          primary_knowledge?: string | null
          sms_alert_phone?: string | null
          support_email?: string | null
          system_prompt?: string | null
          tone?: string | null
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_widget_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_widget_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          organization_id?: string
        }
        Relationships: []
      }
      chat_summaries: {
        Row: {
          created_at: string
          id: string
          message_count_at_summary: number
          model: string | null
          organization_id: string
          session_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count_at_summary?: number
          model?: string | null
          organization_id: string
          session_id: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count_at_summary?: number
          model?: string | null
          organization_id?: string
          session_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          source: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message: string
          source: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string
        }
        Relationships: []
      }
      founder_pending_checkouts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      kb_sources: {
        Row: {
          auto_sync: boolean
          char_count: number
          content: string | null
          created_at: string
          file_path: string | null
          id: string
          kind: Database["public"]["Enums"]["kb_source_kind"]
          label: string
          last_error: string | null
          last_synced_at: string | null
          organization_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          auto_sync?: boolean
          char_count?: number
          content?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind: Database["public"]["Enums"]["kb_source_kind"]
          label: string
          last_error?: string | null
          last_synced_at?: string | null
          organization_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          auto_sync?: boolean
          char_count?: number
          content?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["kb_source_kind"]
          label?: string
          last_error?: string | null
          last_synced_at?: string | null
          organization_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lead_notes: string | null
          message: string | null
          name: string | null
          organization_id: string
          phone: string | null
          preferred_time: string | null
          session_id: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lead_notes?: string | null
          message?: string | null
          name?: string | null
          organization_id: string
          phone?: string | null
          preferred_time?: string | null
          session_id?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lead_notes?: string | null
          message?: string | null
          name?: string | null
          organization_id?: string
          phone?: string | null
          preferred_time?: string | null
          session_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_widget_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allowed_origins: string[]
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan_status: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          primary_color: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[]
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan_status?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[]
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan_status?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          primary_color?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_widget_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_followups: {
        Row: {
          id: string
          organization_id: string
          recipient_email: string
          sent_at: string
          session_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          recipient_email: string
          sent_at?: string
          session_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          recipient_email?: string
          sent_at?: string
          session_id?: string
        }
        Relationships: []
      }
      shared_ai_cache: {
        Row: {
          application_source: string
          created_at: string
          hit_count: number
          id: string
          last_hit_at: string | null
          prompt_text: string
          query_hash: string
          response_text: string
        }
        Insert: {
          application_source: string
          created_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          prompt_text: string
          query_hash: string
          response_text: string
        }
        Update: {
          application_source?: string
          created_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          prompt_text?: string
          query_hash?: string
          response_text?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          organization_id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          status: string
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          organization_id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          organization_id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          bonus_conversations: number
          conversations_count: number
          created_at: string
          id: string
          leads_count: number
          organization_id: string
          period_start: string
          sms_alerts_count: number
          updated_at: string
        }
        Insert: {
          bonus_conversations?: number
          conversations_count?: number
          created_at?: string
          id?: string
          leads_count?: number
          organization_id: string
          period_start: string
          sms_alerts_count?: number
          updated_at?: string
        }
        Update: {
          bonus_conversations?: number
          conversations_count?: number
          created_at?: string
          id?: string
          leads_count?: number
          organization_id?: string
          period_start?: string
          sms_alerts_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "org_widget_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_digests_sent: {
        Row: {
          id: string
          organization_id: string
          recipient_email: string
          sent_at: string
          week_start: string
        }
        Insert: {
          id?: string
          organization_id: string
          recipient_email: string
          sent_at?: string
          week_start: string
        }
        Update: {
          id?: string
          organization_id?: string
          recipient_email?: string
          sent_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      org_widget_info: {
        Row: {
          id: string | null
          name: string | null
          primary_color: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          primary_color?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          primary_color?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_chat_rate_limit: {
        Args: {
          _ip: string
          _max_requests?: number
          _org_id: string
          _window_seconds?: number
        }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_organization: { Args: { _org_id: string }; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_bot_webhook_secret: { Args: { _org_id: string }; Returns: string }
      get_chat_context_and_limits: {
        Args: {
          _ip: string
          _max_requests?: number
          _org_id: string
          _session_id: string
          _window_seconds?: number
        }
        Returns: Json
      }
      get_founder_spots: {
        Args: never
        Returns: {
          is_open: boolean
          remaining: number
          taken: number
          total: number
        }[]
      }
      get_org_billing_status: {
        Args: { _org_id: string }
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          has_subscription: boolean
          plan_status: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          subscription_status: string
        }[]
      }
      get_org_kb_char_cap: { Args: { _org_id: string }; Returns: number }
      get_org_kb_limit: { Args: { _org_id: string }; Returns: number }
      get_org_lead_quota: { Args: { _org_id: string }; Returns: number }
      get_org_leads_usage: { Args: { _org_id: string }; Returns: number }
      get_org_quota: { Args: { _org_id: string }; Returns: number }
      get_org_seat_limit: { Args: { _org_id: string }; Returns: number }
      get_org_seats: {
        Args: { _org_id: string }
        Returns: {
          seat_limit: number
          used: number
        }[]
      }
      get_org_sms_cap: { Args: { _org_id: string }; Returns: number }
      get_org_sms_usage: { Args: { _org_id: string }; Returns: number }
      get_org_trial_status: {
        Args: { _org_id: string }
        Returns: {
          days_remaining: number
          expired: boolean
          is_trial: boolean
          trial_ends_at: string
        }[]
      }
      get_org_usage: { Args: { _org_id: string }; Returns: number }
      get_session_summaries: {
        Args: { _limit?: number; _offset?: number; _org_id: string }
        Returns: {
          associated_lead_email: string
          first_message_at: string
          first_message_content: string
          last_message_at: string
          message_count: number
          session_id: string
          total_count: number
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      grant_conversation_topup: {
        Args: { _amount: number; _org_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_org_leads: { Args: { _org_id: string }; Returns: undefined }
      increment_org_sms_alerts: {
        Args: { _org_id: string }
        Returns: undefined
      }
      increment_org_usage: {
        Args: { _org_id: string; _session_id: string }
        Returns: undefined
      }
      increment_shared_ai_cache_hit: {
        Args: { _id: string }
        Returns: undefined
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      org_has_feature: {
        Args: { _feature: string; _org_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      release_founder_spot: {
        Args: { _reservation_id: string }
        Returns: undefined
      }
      reserve_founder_spot: {
        Args: { _org_id: string; _ttl_minutes?: number; _user_id: string }
        Returns: {
          reservation_id: string
          reserved: boolean
          taken: number
          total: number
        }[]
      }
      rotate_bot_webhook_secret: { Args: { _org_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "member"
      kb_source_kind: "website" | "file"
      plan_tier: "trial" | "essential" | "growth" | "premium" | "founder"
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
      app_role: ["admin", "member"],
      kb_source_kind: ["website", "file"],
      plan_tier: ["trial", "essential", "growth", "premium", "founder"],
    },
  },
} as const
