import { createServiceClient } from "@/lib/supabase/service";
import { format } from "date-fns";
import { getUserTone, getToneMessage } from "./tone-system";

export interface ReminderAuditEvent {
  id: string;
  event_type: string;
  created_at: string;
  event_data: Record<string, unknown>;
  source?: string;
}

export interface SuppressionDetail {
  reason_code: string;
  reason_human: string;
  rule_name: string;
  intended_fire_time: string;
  next_attempt_time?: string;
  evaluated_at: string;
}

/**
 * Get human-readable suppression reason with tone
 */
export async function getSuppressionReasonHuman(
  reasonCode: string,
  userId?: string
): Promise<string> {
  // If userId provided, use tone-aware messages
  if (userId) {
    try {
      const tone = await getUserTone(userId);
      const toneKey = getSuppressionToneKey(reasonCode);
      if (toneKey) {
        return getToneMessage(toneKey, tone);
      }
    } catch (error) {
      console.error("Failed to get tone for suppression reason:", error);
      // Fall through to default messages
    }
  }

  // Fallback to default messages
  const reasonMap: Record<string, string> = {
    QUIET_HOURS: "Quiet hours",
    WORKDAY_DISABLED: "Outside working hours",
    DAILY_CAP: "Daily reminder limit reached",
    COOLDOWN_ACTIVE: "Cooldown period active",
    CATEGORY_DISABLED: "Category disabled",
    NOTIFICATION_PERMISSION_DENIED: "Notification permission denied",
    quiet_hours: "Quiet hours",
    working_hours: "Outside working hours",
    daily_cap: "Daily reminder limit reached",
    cooldown_active: "Cooldown period active",
    category_disabled: "Category disabled",
    notif_permission_denied: "Notification permission denied",
    weekend: "Weekend",
    dnd_active: "Do not disturb active",
    other: "Other",
  };
  return reasonMap[reasonCode] || reasonCode;
}

/**
 * Map suppression reason code to tone copy key
 */
function getSuppressionToneKey(reasonCode: string): string | null {
  const keyMap: Record<string, string> = {
    QUIET_HOURS: "suppression.quiet_hours",
    WORKDAY_DISABLED: "suppression.working_hours",
    DAILY_CAP: "suppression.daily_cap",
    COOLDOWN_ACTIVE: "suppression.cooldown",
    CATEGORY_DISABLED: "suppression.category_disabled",
    quiet_hours: "suppression.quiet_hours",
    working_hours: "suppression.working_hours",
    daily_cap: "suppression.daily_cap",
    cooldown_active: "suppression.cooldown",
    category_disabled: "suppression.category_disabled",
  };
  return keyMap[reasonCode] || null;
}

/**
 * Get rule name from suppression reason
 */
export function getSuppressionRuleName(reasonCode: string): string {
  const ruleMap: Record<string, string> = {
    QUIET_HOURS: "Quiet Hours",
    WORKDAY_DISABLED: "Working Hours",
    DAILY_CAP: "Daily Cap",
    COOLDOWN_ACTIVE: "Cooldown",
    CATEGORY_DISABLED: "Category Settings",
    NOTIFICATION_PERMISSION_DENIED: "Permissions",
    quiet_hours: "Quiet Hours",
    working_hours: "Working Hours",
    daily_cap: "Daily Cap",
    cooldown_active: "Cooldown",
    category_disabled: "Category Settings",
    notif_permission_denied: "Permissions",
    weekend: "Weekend Settings",
    dnd_active: "Do Not Disturb",
    other: "Other",
  };
  return ruleMap[reasonCode] || "Unknown Rule";
}

/**
 * Get audit timeline for a reminder
 */
export async function getReminderAuditTimeline(
  userId: string,
  reminderId: string,
  limit: number = 50
): Promise<ReminderAuditEvent[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .eq("reminder_id", reminderId)
      .in("event_type", [
        "reminder_created",
        "reminder_triggered",
        "reminder_snoozed",
        "reminder_suppressed",
        "reminder_completed",
        "reminder_dismissed",
        "reminder_overdue",
      ])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to fetch reminder audit timeline:", error);
    return [];
  }
}

/**
 * Get suppression details for a reminder
 */
export async function getReminderSuppressionDetails(
  userId: string,
  reminderId: string
): Promise<SuppressionDetail | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .eq("reminder_id", reminderId)
      .eq("event_type", "reminder_suppressed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const eventData = (data.event_data || {}) as Record<string, unknown>;
    const reasonCode = (eventData.reason_code as string) || "other";
    const intendedFireTime = eventData.intended_fire_time as string;
    const nextAttemptTime = eventData.next_attempt_time as string | undefined;
    const evaluatedAt = eventData.evaluated_at as string;

    // Get tone-aware suppression reason
    const reasonHuman = await getSuppressionReasonHuman(reasonCode, userId);

    return {
      reason_code: reasonCode,
      reason_human: reasonHuman,
      rule_name: getSuppressionRuleName(reasonCode),
      intended_fire_time: intendedFireTime,
      next_attempt_time: nextAttemptTime,
      evaluated_at: evaluatedAt || data.created_at,
    };
  } catch (error) {
    console.error("Failed to fetch suppression details:", error);
    return null;
  }
}

/**
 * Get event icon and label for audit timeline
 */
export function getEventDisplayInfo(eventType: string): {
  icon: string;
  label: string;
  description: string;
} {
  const eventMap: Record<
    string,
    { icon: string; label: string; description: string }
  > = {
    reminder_created: {
      icon: "➕",
      label: "Created",
      description: "Reminder was created",
    },
    reminder_triggered: {
      icon: "🔔",
      label: "Triggered",
      description: "Reminder was sent",
    },
    reminder_snoozed: {
      icon: "⏰",
      label: "Snoozed",
      description: "Reminder was snoozed",
    },
    reminder_suppressed: {
      icon: "⏸️",
      label: "Suppressed",
      description: "Reminder was held back",
    },
    reminder_completed: {
      icon: "✅",
      label: "Completed",
      description: "Reminder was completed",
    },
    reminder_dismissed: {
      icon: "❌",
      label: "Dismissed",
      description: "Reminder was dismissed",
    },
    reminder_overdue: {
      icon: "⚠️",
      label: "Overdue",
      description: "Reminder became overdue",
    },
  };

  return (
    eventMap[eventType] || {
      icon: "📝",
      label: eventType.replace("_", " "),
      description: "Event occurred",
    }
  );
}

/**
 * Format timestamp for display
 */
export function formatAuditTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return timestamp;
  }
}
