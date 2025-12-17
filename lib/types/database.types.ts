export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          tone_preference: 'motivational' | 'professional' | 'playful' | 'simple' | null;
          push_enabled: boolean;
          email_notifications: boolean;
          push_notifications: boolean;
          in_app_notifications: boolean;
          is_admin: boolean;
          affirmation_frequency: 'rare' | 'balanced' | 'frequent' | null;
          smart_snooze_enabled: boolean | null;
          snooze_pattern: Json | null;
          digest_preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          tone_preference?: 'motivational' | 'professional' | 'playful' | 'simple' | null;
          push_enabled?: boolean;
          email_notifications?: boolean;
          push_notifications?: boolean;
          in_app_notifications?: boolean;
          is_admin?: boolean;
          affirmation_frequency?: 'rare' | 'balanced' | 'frequent' | null;
          smart_snooze_enabled?: boolean | null;
          snooze_pattern?: Json | null;
          digest_preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tone_preference?: 'motivational' | 'professional' | 'playful' | 'simple' | null;
          push_enabled?: boolean;
          email_notifications?: boolean;
          push_notifications?: boolean;
          in_app_notifications?: boolean;
          is_admin?: boolean;
          affirmation_frequency?: 'rare' | 'balanced' | 'frequent' | null;
          smart_snooze_enabled?: boolean | null;
          snooze_pattern?: Json | null;
          digest_preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          remind_at: string;
          tone: 'motivational' | 'professional' | 'playful' | 'simple';
          status: 'pending' | 'sent' | 'snoozed' | 'dismissed';
          notification_method: 'email' | 'push' | 'in_app';
          qstash_message_id: string | null;
          affirmation_enabled: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          remind_at: string;
          tone?: 'motivational' | 'professional' | 'playful' | 'simple';
          status?: 'pending' | 'sent' | 'snoozed' | 'dismissed';
          notification_method?: 'email' | 'push' | 'in_app';
          qstash_message_id?: string | null;
          affirmation_enabled?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          remind_at?: string;
          tone?: 'motivational' | 'professional' | 'playful' | 'simple';
          status?: 'pending' | 'sent' | 'snoozed' | 'dismissed';
          notification_method?: 'email' | 'push' | 'in_app';
          qstash_message_id?: string | null;
          affirmation_enabled?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sent_logs: {
        Row: {
          id: string;
          reminder_id: string;
          sent_at: string;
          affirmation_text: string;
          delivery_method: string;
          success: boolean;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          sent_at?: string;
          affirmation_text: string;
          delivery_method: string;
          success?: boolean;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          reminder_id?: string;
          sent_at?: string;
          affirmation_text?: string;
          delivery_method?: string;
          success?: boolean;
          error_message?: string | null;
        };
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
      // Phase 2 Tables
      events: {
        Row: {
          id: string;
          user_id: string;
          event_type: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
          event_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
          event_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
          event_data?: Json;
          created_at?: string;
        };
      };
      behaviour_rules: {
        Row: {
          id: string;
          user_id: string;
          rule_name: string;
          trigger_event_type: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
          conditions: Json;
          action_type: string;
          action_config: Json;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rule_name: string;
          trigger_event_type: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
          conditions?: Json;
          action_type: string;
          action_config?: Json;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_name?: string;
          trigger_event_type?: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
          conditions?: Json;
          action_type?: string;
          action_config?: Json;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      popups: {
        Row: {
          id: string;
          user_id: string;
          reminder_id: string | null;
          template_type: 'success' | 'streak' | 'inactivity' | 'follow_up_required';
          title: string;
          message: string;
          affirmation: string | null;
          priority: number;
          status: 'pending' | 'shown' | 'dismissed' | 'action_taken';
          action_data: Json;
          created_at: string;
          shown_at: string | null;
          dismissed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_id?: string | null;
          template_type: 'success' | 'streak' | 'inactivity' | 'follow_up_required';
          title: string;
          message: string;
          affirmation?: string | null;
          priority?: number;
          status?: 'pending' | 'shown' | 'dismissed' | 'action_taken';
          action_data?: Json;
          created_at?: string;
          shown_at?: string | null;
          dismissed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          reminder_id?: string | null;
          template_type?: 'success' | 'streak' | 'inactivity' | 'follow_up_required';
          title?: string;
          message?: string;
          affirmation?: string | null;
          priority?: number;
          status?: 'pending' | 'shown' | 'dismissed' | 'action_taken';
          action_data?: Json;
          created_at?: string;
          shown_at?: string | null;
          dismissed_at?: string | null;
        };
      };
      popup_actions: {
        Row: {
          id: string;
          popup_id: string;
          user_id: string;
          action_type: string;
          action_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          popup_id: string;
          user_id: string;
          action_type: string;
          action_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          popup_id?: string;
          user_id?: string;
          action_type?: string;
          action_data?: Json;
          created_at?: string;
        };
      };
      snooze_history: {
        Row: {
          id: string;
          user_id: string;
          reminder_id: string | null;
          snooze_duration_minutes: number;
          snooze_reason: 'user_action' | 'smart_suggestion' | 'auto';
          context_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_id?: string | null;
          snooze_duration_minutes: number;
          snooze_reason?: 'user_action' | 'smart_suggestion' | 'auto';
          context_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reminder_id?: string | null;
          snooze_duration_minutes?: number;
          snooze_reason?: 'user_action' | 'smart_suggestion' | 'auto';
          context_data?: Json;
          created_at?: string;
        };
      };
      weekly_digests: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          week_end_date: string;
          stats_data: Json;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          week_end_date: string;
          stats_data: Json;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start_date?: string;
          week_end_date?: string;
          stats_data?: Json;
          sent_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      tone_type: 'motivational' | 'professional' | 'playful' | 'simple';
      reminder_status: 'pending' | 'sent' | 'snoozed' | 'dismissed';
      notification_method: 'email' | 'push' | 'in_app';
      event_type: 'reminder_created' | 'reminder_completed' | 'reminder_snoozed' | 'reminder_dismissed' | 'popup_shown' | 'popup_action' | 'inactivity_detected' | 'streak_achieved' | 'follow_up_required';
      popup_template_type: 'success' | 'streak' | 'inactivity' | 'follow_up_required';
      popup_status: 'pending' | 'shown' | 'dismissed' | 'action_taken';
      snooze_reason: 'user_action' | 'smart_suggestion' | 'auto';
      affirmation_frequency: 'rare' | 'balanced' | 'frequent';
    };
  };
}
