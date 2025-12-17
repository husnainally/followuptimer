import { createServiceClient } from "@/lib/supabase/service";
import { logEvent, type EventType } from "@/lib/events";

export type PopupTemplateType = "success" | "streak" | "inactivity" | "follow_up_required";

export interface PopupActionData {
  reminder_id?: string;
  action_url?: string;
  [key: string]: unknown;
}

interface CreatePopupOptions {
  userId: string;
  templateType: PopupTemplateType;
  title: string;
  message: string;
  affirmation?: string;
  priority?: number; // 1-10, default 5
  reminderId?: string;
  actionData?: PopupActionData;
}

/**
 * Create a popup in the queue
 */
export async function createPopup({
  userId,
  templateType,
  title,
  message,
  affirmation,
  priority = 5,
  reminderId,
  actionData = {},
}: CreatePopupOptions): Promise<{ success: boolean; popupId?: string; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("popups")
      .insert({
        user_id: userId,
        reminder_id: reminderId,
        template_type: templateType,
        title,
        message,
        affirmation,
        priority: Math.max(1, Math.min(10, priority)), // Clamp between 1-10
        status: "pending",
        action_data: actionData,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Log popup creation event
    await logEvent({
      userId,
      eventType: "popup_shown",
      eventData: {
        popup_id: data.id,
        template_type: templateType,
        reminder_id: reminderId,
      },
      useServiceClient: true,
    });

    return {
      success: true,
      popupId: data.id,
    };
  } catch (error) {
    console.error("Failed to create popup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check trigger rules and create popups based on events
 */
export async function checkTriggerRules(
  userId: string,
  eventType: EventType,
  eventData: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Get enabled behaviour rules for this user and event type
    const { data: rules, error } = await supabase
      .from("behaviour_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("trigger_event_type", eventType)
      .eq("enabled", true);

    if (error) throw error;

    if (!rules || rules.length === 0) {
      // No custom rules, use default triggers
      await applyDefaultTriggers(userId, eventType, eventData);
      return;
    }

    // Apply custom rules
    for (const rule of rules) {
      if (rule.action_type === "popup") {
        const config = rule.action_config as {
          template_type?: PopupTemplateType;
          title?: string;
          message?: string;
          priority?: number;
        };

        await createPopup({
          userId,
          templateType: config.template_type || "success",
          title: config.title || "Notification",
          message: config.message || "You have a new notification",
          priority: config.priority || 5,
          reminderId: eventData.reminder_id as string | undefined,
          actionData: eventData as PopupActionData,
        });
      }
    }
  } catch (error) {
    console.error("Failed to check trigger rules:", error);
  }
}

/**
 * Apply default trigger rules based on event type
 */
async function applyDefaultTriggers(
  userId: string,
  eventType: EventType,
  eventData: Record<string, unknown>
): Promise<void> {
  switch (eventType) {
    case "reminder_completed":
      await createPopup({
        userId,
        templateType: "success",
        title: "Great job!",
        message: "You completed your reminder. Keep up the momentum!",
        affirmation: "Every completed task brings you closer to your goals.",
        priority: 7,
        reminderId: eventData.reminder_id as string | undefined,
      });
      break;

    case "streak_achieved":
      await createPopup({
        userId,
        templateType: "streak",
        title: "Streak Achieved!",
        message: `You've maintained a ${eventData.streak_count || 0} day streak!`,
        affirmation: "Consistency is the key to success.",
        priority: 9,
      });
      break;

    case "inactivity_detected":
      await createPopup({
        userId,
        templateType: "inactivity",
        title: "Time to get back on track",
        message: "You haven't been active lately. Let's create a reminder!",
        affirmation: "Every moment is a fresh start.",
        priority: 6,
      });
      break;

    case "follow_up_required":
      await createPopup({
        userId,
        templateType: "follow_up_required",
        title: "Follow-up needed",
        message: "You have reminders that need attention.",
        affirmation: "Staying on top of follow-ups builds trust.",
        priority: 8,
        reminderId: eventData.reminder_id as string | undefined,
      });
      break;

    default:
      // No default popup for other event types
      break;
  }
}

/**
 * Get next pending popup for user (highest priority first)
 */
export async function getNextPopup(userId: string) {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("popups")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      throw error;
    }

    return { success: true, popup: data || null };
  } catch (error) {
    console.error("Failed to get next popup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      popup: null,
    };
  }
}

/**
 * Check cooldown to prevent popup spam
 * Returns true if enough time has passed since last popup
 */
export async function checkCooldown(
  userId: string,
  cooldownMinutes: number = 5
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const cooldownTime = new Date();
    cooldownTime.setMinutes(cooldownTime.getMinutes() - cooldownMinutes);

    const { data, error } = await supabase
      .from("popups")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", cooldownTime.toISOString())
      .limit(1);

    if (error) throw error;

    // If no popups in cooldown period, allow new popup
    return !data || data.length === 0;
  } catch (error) {
    console.error("Failed to check cooldown:", error);
    // On error, allow popup (fail open)
    return true;
  }
}

