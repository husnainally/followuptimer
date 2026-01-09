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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      behaviour_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          conditions: Json | null
          created_at: string
          enabled: boolean | null
          id: string
          rule_name: string
          trigger_event_type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          conditions?: Json | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          rule_name: string
          trigger_event_type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          conditions?: Json | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          rule_name?: string
          trigger_event_type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviour_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behaviour_triggers: {
        Row: {
          consumed_at: string | null
          created_at: string
          event_id: string | null
          id: string
          metadata: Json | null
          status: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          trigger_type: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviour_triggers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviour_triggers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          contact_id: string | null
          created_at: string
          event_data: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          reminder_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          reminder_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          reminder_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          affirmation: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          reminder_id: string
          title: string
          user_id: string
        }
        Insert: {
          affirmation: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reminder_id: string
          title: string
          user_id: string
        }
        Update: {
          affirmation?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reminder_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          id: string
          popup_id: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          id?: string
          popup_id: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          popup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_actions_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "popups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popup_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_rules: {
        Row: {
          conditions: Json | null
          cooldown_seconds: number
          created_at: string
          enabled: boolean
          id: string
          max_per_day: number | null
          priority: number
          rule_name: string
          template_key: string
          trigger_event_type: Database["public"]["Enums"]["event_type"]
          ttl_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          conditions?: Json | null
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          id?: string
          max_per_day?: number | null
          priority?: number
          rule_name: string
          template_key: string
          trigger_event_type: Database["public"]["Enums"]["event_type"]
          ttl_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          conditions?: Json | null
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          id?: string
          max_per_day?: number | null
          priority?: number
          rule_name?: string
          template_key?: string
          trigger_event_type?: Database["public"]["Enums"]["event_type"]
          ttl_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_rules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          action_data: Json | null
          action_taken: string | null
          affirmation: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string
          dedupe_hash: string | null
          dismissed_at: string | null
          displayed_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          message: string
          payload: Json | null
          priority: number
          queued_at: string | null
          reminder_id: string | null
          rule_id: string | null
          shown_at: string | null
          snooze_until: string | null
          source_event_id: string | null
          status: Database["public"]["Enums"]["popup_status"]
          template_type: Database["public"]["Enums"]["popup_template_type"]
          title: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_taken?: string | null
          affirmation?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          dedupe_hash?: string | null
          dismissed_at?: string | null
          displayed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          message: string
          payload?: Json | null
          priority?: number
          queued_at?: string | null
          reminder_id?: string | null
          rule_id?: string | null
          shown_at?: string | null
          snooze_until?: string | null
          source_event_id?: string | null
          status?: Database["public"]["Enums"]["popup_status"]
          template_type: Database["public"]["Enums"]["popup_template_type"]
          title: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_taken?: string | null
          affirmation?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          dedupe_hash?: string | null
          dismissed_at?: string | null
          displayed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          payload?: Json | null
          priority?: number
          queued_at?: string | null
          reminder_id?: string | null
          rule_id?: string | null
          shown_at?: string | null
          snooze_until?: string | null
          source_event_id?: string | null
          status?: Database["public"]["Enums"]["popup_status"]
          template_type?: Database["public"]["Enums"]["popup_template_type"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popups_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popups_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "popup_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popups_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affirmation_frequency:
            | Database["public"]["Enums"]["affirmation_frequency"]
            | null
          created_at: string
          data_collection: boolean
          digest_preferences: Json | null
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          in_app_notifications: boolean | null
          is_admin: boolean
          is_premium: boolean | null
          marketing_emails: boolean
          plan_status: Database["public"]["Enums"]["plan_status"] | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          push_enabled: boolean | null
          push_notifications: boolean | null
          reminder_before_minutes: number | null
          smart_snooze_enabled: boolean | null
          snooze_pattern: Json | null
          tone_preference: Database["public"]["Enums"]["tone_type"] | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          affirmation_frequency?:
            | Database["public"]["Enums"]["affirmation_frequency"]
            | null
          created_at?: string
          data_collection?: boolean
          digest_preferences?: Json | null
          email: string
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          in_app_notifications?: boolean | null
          is_admin?: boolean
          is_premium?: boolean | null
          marketing_emails?: boolean
          plan_status?: Database["public"]["Enums"]["plan_status"] | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          push_enabled?: boolean | null
          push_notifications?: boolean | null
          reminder_before_minutes?: number | null
          smart_snooze_enabled?: boolean | null
          snooze_pattern?: Json | null
          tone_preference?: Database["public"]["Enums"]["tone_type"] | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          affirmation_frequency?:
            | Database["public"]["Enums"]["affirmation_frequency"]
            | null
          created_at?: string
          data_collection?: boolean
          digest_preferences?: Json | null
          email?: string
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          in_app_notifications?: boolean | null
          is_admin?: boolean
          is_premium?: boolean | null
          marketing_emails?: boolean
          plan_status?: Database["public"]["Enums"]["plan_status"] | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          push_enabled?: boolean | null
          push_notifications?: boolean | null
          reminder_before_minutes?: number | null
          smart_snooze_enabled?: boolean | null
          snooze_pattern?: Json | null
          tone_preference?: Database["public"]["Enums"]["tone_type"] | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          affirmation_enabled: boolean | null
          completion_context: string | null
          contact_id: string | null
          created_at: string
          id: string
          last_interaction_at: string | null
          linked_entities: Json | null
          message: string
          notification_method: Database["public"]["Enums"]["notification_method"]
          qstash_message_id: string | null
          remind_at: string
          status: Database["public"]["Enums"]["reminder_status"]
          tone: Database["public"]["Enums"]["tone_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          affirmation_enabled?: boolean | null
          completion_context?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          linked_entities?: Json | null
          message: string
          notification_method?: Database["public"]["Enums"]["notification_method"]
          qstash_message_id?: string | null
          remind_at: string
          status?: Database["public"]["Enums"]["reminder_status"]
          tone?: Database["public"]["Enums"]["tone_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          affirmation_enabled?: boolean | null
          completion_context?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          linked_entities?: Json | null
          message?: string
          notification_method?: Database["public"]["Enums"]["notification_method"]
          qstash_message_id?: string | null
          remind_at?: string
          status?: Database["public"]["Enums"]["reminder_status"]
          tone?: Database["public"]["Enums"]["tone_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_logs: {
        Row: {
          affirmation: string
          delivery_method: string
          error_message: string | null
          id: string
          reminder_id: string
          sent_at: string
          status: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          affirmation: string
          delivery_method: string
          error_message?: string | null
          id?: string
          reminder_id: string
          sent_at?: string
          status?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          affirmation?: string
          delivery_method?: string
          error_message?: string | null
          id?: string
          reminder_id?: string
          sent_at?: string
          status?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snooze_history: {
        Row: {
          context_data: Json | null
          created_at: string
          id: string
          reminder_id: string | null
          snooze_duration_minutes: number
          snooze_reason: Database["public"]["Enums"]["snooze_reason"]
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          id?: string
          reminder_id?: string | null
          snooze_duration_minutes: number
          snooze_reason?: Database["public"]["Enums"]["snooze_reason"]
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          id?: string
          reminder_id?: string | null
          snooze_duration_minutes?: number
          snooze_reason?: Database["public"]["Enums"]["snooze_reason"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snooze_history_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snooze_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      weekly_digests: {
        Row: {
          created_at: string
          id: string
          sent_at: string | null
          stats_data: Json
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          sent_at?: string | null
          stats_data: Json
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          sent_at?: string | null
          stats_data?: Json
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_digests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      affirmation_frequency: "rare" | "balanced" | "frequent"
      event_type:
        | "reminder_created"
        | "reminder_completed"
        | "reminder_snoozed"
        | "reminder_dismissed"
        | "popup_shown"
        | "popup_action"
        | "inactivity_detected"
        | "streak_achieved"
        | "follow_up_required"
        | "reminder_missed"
        | "streak_incremented"
        | "streak_broken"
        | "email_opened"
        | "linkedin_profile_viewed"
        | "linkedin_message_sent"
        | "popup_dismissed"
        | "popup_action_clicked"
        | "popup_snoozed"
        | "popup_expired"
        | "reminder_scheduled"
        | "task_completed"
        | "reminder_due"
        | "no_reply_after_n_days"
      notification_method: "email" | "push" | "in_app"
      plan_status: "active" | "trial" | "cancelled" | "expired"
      plan_type: "free" | "pro" | "enterprise"
      popup_status:
        | "pending"
        | "shown"
        | "dismissed"
        | "action_taken"
        | "queued"
        | "displayed"
        | "acted"
        | "expired"
      popup_template_type:
        | "success"
        | "streak"
        | "inactivity"
        | "follow_up_required"
      reminder_status: "pending" | "sent" | "snoozed" | "dismissed"
      snooze_reason: "user_action" | "smart_suggestion" | "auto"
      tone_type: "motivational" | "professional" | "playful" | "simple"
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
      affirmation_frequency: ["rare", "balanced", "frequent"],
      event_type: [
        "reminder_created",
        "reminder_completed",
        "reminder_snoozed",
        "reminder_dismissed",
        "popup_shown",
        "popup_action",
        "inactivity_detected",
        "streak_achieved",
        "follow_up_required",
        "reminder_missed",
        "streak_incremented",
        "streak_broken",
        "email_opened",
        "linkedin_profile_viewed",
        "linkedin_message_sent",
        "popup_dismissed",
        "popup_action_clicked",
        "popup_snoozed",
        "popup_expired",
        "reminder_scheduled",
        "task_completed",
        "reminder_due",
        "no_reply_after_n_days",
      ],
      notification_method: ["email", "push", "in_app"],
      plan_status: ["active", "trial", "cancelled", "expired"],
      plan_type: ["free", "pro", "enterprise"],
      popup_status: [
        "pending",
        "shown",
        "dismissed",
        "action_taken",
        "queued",
        "displayed",
        "acted",
        "expired",
      ],
      popup_template_type: [
        "success",
        "streak",
        "inactivity",
        "follow_up_required",
      ],
      reminder_status: ["pending", "sent", "snoozed", "dismissed"],
      snooze_reason: ["user_action", "smart_suggestion", "auto"],
      tone_type: ["motivational", "professional", "playful", "simple"],
    },
  },
} as const
