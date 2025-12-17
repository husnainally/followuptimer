import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type EventType =
  | "reminder_created"
  | "reminder_completed"
  | "reminder_snoozed"
  | "reminder_dismissed"
  | "popup_shown"
  | "popup_action"
  | "inactivity_detected"
  | "streak_achieved"
  | "follow_up_required";

export interface EventData {
  reminder_id?: string;
  popup_id?: string;
  action?: string;
  duration_minutes?: number;
  streak_count?: number;
  [key: string]: unknown;
}

interface LogEventOptions {
  userId: string;
  eventType: EventType;
  eventData?: EventData;
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
  useServiceClient = false,
}: LogEventOptions): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const supabase = useServiceClient
      ? createServiceClient()
      : await createClient();

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
      })
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
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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

