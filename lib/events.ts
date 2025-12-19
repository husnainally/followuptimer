import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type EventType =
  | "reminder_created"
  | "reminder_completed"
  | "reminder_snoozed"
  | "reminder_dismissed"
  | "reminder_missed"
  | "reminder_due"
  | "reminder_scheduled"
  | "task_completed"
  | "popup_shown"
  | "popup_action"
  | "popup_dismissed"
  | "popup_action_clicked"
  | "popup_snoozed"
  | "popup_expired"
  | "inactivity_detected"
  | "streak_achieved"
  | "streak_incremented"
  | "streak_broken"
  | "follow_up_required"
  | "email_opened"
  | "no_reply_after_n_days"
  | "linkedin_profile_viewed"
  | "linkedin_message_sent"
  | "affirmation_shown"
  | "affirmation_suppressed"
  | "affirmation_action_clicked"
  | "snooze_suggested"
  | "snooze_selected"
  | "reminder_deferred_by_rule";

export type EventSource =
  | "app"
  | "scheduler"
  | "extension_gmail"
  | "extension_linkedin";

export interface EventData {
  reminder_id?: string;
  popup_id?: string;
  action?: string;
  duration_minutes?: number;
  streak_count?: number;
  message_id?: string;
  thread_id?: string;
  profile_url?: string;
  email_subject?: string;
  [key: string]: unknown;
}

interface LogEventOptions {
  userId: string;
  eventType: EventType;
  eventData?: EventData;
  source?: EventSource;
  contactId?: string;
  reminderId?: string;
  useServiceClient?: boolean;
}

/**
 * Log a behaviour event to the database
 * @param options - Event logging options
 * @returns Success status and event ID if successful
 */
export async function logEvent({
  userId,
  eventType,
  eventData = {},
  source = "app",
  contactId,
  reminderId,
  useServiceClient = false,
}: LogEventOptions): Promise<{
  success: boolean;
  eventId?: string;
  error?: string;
}> {
  try {
    const supabase = useServiceClient
      ? createServiceClient()
      : await createClient();

    const insertData: Record<string, unknown> = {
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      source: source,
    };

    if (contactId) {
      insertData.contact_id = contactId;
    }

    if (reminderId) {
      insertData.reminder_id = reminderId;
    }

    const { data, error } = await supabase
      .from("events")
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw error;

    return {
      success: true,
      eventId: data.id,
    };
  } catch (error) {
    console.error("Failed to log event:", {
      userId,
      eventType,
      source,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper function to log extension events
 */
export async function logExtensionEvent({
  userId,
  eventType,
  source,
  eventData = {},
  contactId,
}: {
  userId: string;
  eventType:
    | "email_opened"
    | "linkedin_profile_viewed"
    | "linkedin_message_sent";
  source: "extension_gmail" | "extension_linkedin";
  eventData?: EventData;
  contactId?: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  return logEvent({
    userId,
    eventType,
    eventData,
    source,
    contactId,
    useServiceClient: true,
  });
}

/**
 * Query events with filters
 */
export async function queryEvents({
  userId,
  eventType,
  startDate,
  endDate,
  limit = 100,
}: {
  userId: string;
  eventType?: EventType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, events: data };
  } catch (error) {
    console.error("Failed to query events:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      events: [],
    };
  }
}
