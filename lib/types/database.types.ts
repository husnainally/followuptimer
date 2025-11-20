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
          tone_preference: 'motivational' | 'professional' | 'playful' | null;
          push_enabled: boolean;
          email_notifications: boolean;
          push_notifications: boolean;
          in_app_notifications: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          tone_preference?: 'motivational' | 'professional' | 'playful' | null;
          push_enabled?: boolean;
          email_notifications?: boolean;
          push_notifications?: boolean;
          in_app_notifications?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tone_preference?: 'motivational' | 'professional' | 'playful' | null;
          push_enabled?: boolean;
          email_notifications?: boolean;
          push_notifications?: boolean;
          in_app_notifications?: boolean;
          is_admin?: boolean;
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
          tone: 'motivational' | 'professional' | 'playful';
          status: 'pending' | 'sent' | 'snoozed' | 'dismissed';
          notification_method: 'email' | 'push' | 'in_app';
          qstash_message_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          remind_at: string;
          tone?: 'motivational' | 'professional' | 'playful';
          status?: 'pending' | 'sent' | 'snoozed' | 'dismissed';
          notification_method?: 'email' | 'push' | 'in_app';
          qstash_message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          remind_at?: string;
          tone?: 'motivational' | 'professional' | 'playful';
          status?: 'pending' | 'sent' | 'snoozed' | 'dismissed';
          notification_method?: 'email' | 'push' | 'in_app';
          qstash_message_id?: string | null;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      tone_type: 'motivational' | 'professional' | 'playful';
      reminder_status: 'pending' | 'sent' | 'snoozed' | 'dismissed';
      notification_method: 'email' | 'push' | 'in_app';
    };
  };
}
