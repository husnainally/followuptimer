/**
 * Trigger Manager - Creates and manages behaviour triggers from events
 * Used by Milestone 2 to determine when to show popups and suggestions
 */

import { createServiceClient } from "@/lib/supabase/service";
import { type EventType } from "./events";

export type TriggerType =
  | "show_streak_popup"
  | "show_inactivity_popup"
  | "show_snooze_coaching_popup"
  | "show_followup_popup"
  | "show_missed_reminder_popup";

interface CreateTriggerOptions {
  userId: string;
  triggerType: TriggerType;
  eventId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a behaviour trigger flag
 */
export async function createTrigger({
  userId,
  triggerType,
  eventId,
  metadata = {},
}: CreateTriggerOptions): Promise<{ success: boolean; triggerId?: string; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Check if a pending trigger of this type already exists for this user
    const { data: existing } = await supabase
      .from("behaviour_triggers")
      .select("id")
      .eq("user_id", userId)
      .eq("trigger_type", triggerType)
      .eq("status", "pending")
      .limit(1)
      .single();

    // If pending trigger exists, don't create duplicate
    if (existing) {
      return {
        success: true,
        triggerId: existing.id,
      };
    }

    const { data, error } = await supabase
      .from("behaviour_triggers")
      .insert({
        user_id: userId,
        trigger_type: triggerType,
        event_id: eventId || null,
        status: "pending",
        metadata: metadata,
      })
      .select("id")
      .single();

    if (error) throw error;

    return {
      success: true,
      triggerId: data.id,
    };
  } catch (error) {
    console.error("Failed to create trigger:", {
      userId,
      triggerType,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get pending triggers for a user
 */
export async function getPendingTriggers(
  userId: string,
  triggerType?: TriggerType
): Promise<Array<{ id: string; trigger_type: string; event_id: string | null; metadata: Record<string, unknown>; created_at: string }>> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("behaviour_triggers")
      .select("id, trigger_type, event_id, metadata, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (triggerType) {
      query = query.eq("trigger_type", triggerType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Failed to get pending triggers:", error);
    return [];
  }
}

/**
 * Mark a trigger as consumed
 */
export async function consumeTrigger(
  triggerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("behaviour_triggers")
      .update({
        status: "consumed",
        consumed_at: new Date().toISOString(),
      })
      .eq("id", triggerId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Failed to consume trigger:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process events and create triggers based on event type
 */
export async function processEventForTriggers(
  userId: string,
  eventType: EventType,
  eventId: string,
  eventData: Record<string, unknown>
): Promise<void> {
  try {
    // Streak incremented → show streak popup
    if (eventType === "streak_incremented") {
      await createTrigger({
        userId,
        triggerType: "show_streak_popup",
        eventId,
        metadata: { streak_count: eventData.streak_count },
      });
    }

    // Inactivity detected → show inactivity popup
    if (eventType === "inactivity_detected") {
      await createTrigger({
        userId,
        triggerType: "show_inactivity_popup",
        eventId,
        metadata: { hours_inactive: eventData.hours_inactive },
      });
    }

    // Reminder missed → show missed reminder popup
    if (eventType === "reminder_missed") {
      await createTrigger({
        userId,
        triggerType: "show_missed_reminder_popup",
        eventId,
        metadata: { reminder_id: eventData.reminder_id },
      });
    }

    // Follow up required → show followup popup
    if (eventType === "follow_up_required") {
      await createTrigger({
        userId,
        triggerType: "show_followup_popup",
        eventId,
        metadata: { reminder_id: eventData.reminder_id, contact_id: eventData.contact_id },
      });
    }

    // Check for repeated snooze pattern (if same reminder snoozed multiple times)
    if (eventType === "reminder_snoozed" && eventData.reminder_id) {
      const supabase = createServiceClient();
      const { data: snoozeHistory } = await supabase
        .from("events")
        .select("id")
        .eq("user_id", userId)
        .eq("event_type", "reminder_snoozed")
        .eq("reminder_id", eventData.reminder_id as string)
        .order("created_at", { ascending: false })
        .limit(3);

      // If same reminder snoozed 3+ times, suggest coaching
      if (snoozeHistory && snoozeHistory.length >= 3) {
        await createTrigger({
          userId,
          triggerType: "show_snooze_coaching_popup",
          eventId,
          metadata: {
            reminder_id: eventData.reminder_id,
            snooze_count: snoozeHistory.length,
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to process event for triggers:", error);
  }
}

