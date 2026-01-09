import { createServiceClient } from "@/lib/supabase/service";
import { logEvent } from "@/lib/events";
import {
  getUserSnoozePreferences,
  isWithinWorkingHours,
  isWithinQuietHours,
  isWeekend,
  countRemindersToday,
  adjustToWorkingHours,
  getNextWorkingDay,
  type UserSnoozePreferences,
} from "@/lib/snooze-rules";

// Suppression reason codes matching Milestone 6 spec
export type ReminderSuppressionReason =
  | "QUIET_HOURS" // Maps from quiet_hours
  | "WORKDAY_DISABLED" // Maps from working_hours
  | "DAILY_CAP" // Maps from daily_cap
  | "COOLDOWN_ACTIVE" // Maps from cooldown_active
  | "CATEGORY_DISABLED" // Maps from category_disabled
  | "NOTIFICATION_PERMISSION_DENIED" // Maps from notif_permission_denied
  | "weekend" // Legacy, kept for backward compatibility
  | "DND_ACTIVE" // Do Not Disturb mode active
  | "dnd_active" // Legacy, kept for backward compatibility
  | "other"; // Legacy, kept for backward compatibility


export interface SuppressionCheckResult {
  suppressed: boolean;
  reason?: ReminderSuppressionReason;
  nextAttemptTime?: Date;
  message?: string;
}

/**
 * Check if a reminder should be suppressed based on user preferences
 */
export async function checkReminderSuppression(
  userId: string,
  reminderId: string,
  scheduledTime: Date,
  timezone: string = "UTC"
): Promise<SuppressionCheckResult> {
  try {
    const prefs = await getUserSnoozePreferences(userId);

    // Check quiet hours
    if (isWithinQuietHours(scheduledTime, prefs, timezone)) {
      return {
        suppressed: true,
        reason: "QUIET_HOURS",
        nextAttemptTime: getNextValidTime(scheduledTime, prefs, timezone),
        message: "Reminder suppressed due to quiet hours",
      };
    }

    // Check working hours (if not allowed outside)
    if (!isWithinWorkingHours(scheduledTime, prefs, timezone)) {
      return {
        suppressed: true,
        reason: "WORKDAY_DISABLED",
        nextAttemptTime: getNextValidTime(scheduledTime, prefs, timezone),
        message: "Reminder suppressed - outside working hours",
      };
    }

    // Check weekend
    if (!prefs.allow_weekends && isWeekend(scheduledTime, timezone)) {
      return {
        suppressed: true,
        reason: "WORKDAY_DISABLED", // Weekend is a form of workday disabled
        nextAttemptTime: getNextValidTime(scheduledTime, prefs, timezone),
        message: "Reminder suppressed - weekends not allowed",
      };
    }

    // Check daily cap
    const todayCount = await countRemindersToday(userId, timezone);
    if (todayCount >= prefs.max_reminders_per_day) {
      return {
        suppressed: true,
        reason: "DAILY_CAP",
        nextAttemptTime: getNextValidTime(scheduledTime, prefs, timezone),
        message: `Reminder suppressed - daily cap reached (${prefs.max_reminders_per_day})`,
      };
    }

    // Check cooldown (if cooldown_minutes > 0)
    if (prefs.cooldown_minutes > 0) {
      const cooldownCheck = await checkCooldown(
        userId,
        reminderId,
        prefs.cooldown_minutes,
        timezone
      );
      if (cooldownCheck.inCooldown) {
        return {
          suppressed: true,
          reason: "COOLDOWN_ACTIVE",
          nextAttemptTime: cooldownCheck.nextAttemptTime,
          message: `Reminder suppressed - cooldown active (${prefs.cooldown_minutes} minutes)`,
        };
      }
    }

    // Check DND (if enabled)
    if (prefs.dnd_enabled) {
      const dndCheck = await checkDND(
        userId,
        reminderId,
        prefs.dnd_override_rules
      );
      if (dndCheck.suppressed) {
        return {
          suppressed: true,
          reason: "DND_ACTIVE",
          nextAttemptTime: getNextValidTime(scheduledTime, prefs, timezone),
          message: "Reminder suppressed - Do Not Disturb mode active",
        };
      }
    }

    // Not suppressed
    return {
      suppressed: false,
    };
  } catch (error) {
    console.error("Failed to check reminder suppression:", error);
    return {
      suppressed: false,
    };
  }
}

/**
 * Check if reminder should be suppressed due to DND
 */
async function checkDND(
  userId: string,
  reminderId: string,
  overrideRules: {
    emergency_contacts: string[];
    override_keywords: string[];
  }
): Promise<{ suppressed: boolean }> {
  try {
    const supabase = createServiceClient();

    // Get reminder details
    const { data: reminder } = await supabase
      .from("reminders")
      .select("contact_id, message")
      .eq("id", reminderId)
      .single();

    if (!reminder) {
      return { suppressed: false };
    }

    // Check emergency contacts override
    if (reminder.contact_id && overrideRules.emergency_contacts.includes(reminder.contact_id)) {
      return { suppressed: false }; // Emergency contact, allow through
    }

    // Check override keywords
    if (reminder.message && overrideRules.override_keywords.length > 0) {
      const lowerMessage = reminder.message.toLowerCase();
      const hasKeyword = overrideRules.override_keywords.some((keyword) =>
        lowerMessage.includes(keyword.toLowerCase())
      );
      if (hasKeyword) {
        return { suppressed: false }; // Contains override keyword, allow through
      }
    }

    // DND active, suppress
    return { suppressed: true };
  } catch (error) {
    console.error("Failed to check DND:", error);
    // Fail open - don't suppress if check fails
    return { suppressed: false };
  }
}

/**
 * Check if reminder is in cooldown period
 */
async function checkCooldown(
  userId: string,
  reminderId: string,
  cooldownMinutes: number,
  timezone: string
): Promise<{
  inCooldown: boolean;
  nextAttemptTime?: Date;
}> {
  try {
    const supabase = createServiceClient();

    // Get reminder to check contact_id
    const { data: reminder } = await supabase
      .from("reminders")
      .select("contact_id")
      .eq("id", reminderId)
      .single();

    if (!reminder) {
      return { inCooldown: false };
    }

    // Determine entity key (contact_id or entity_type)
    const contactId = reminder.contact_id;
    const entityType = contactId ? null : "generic";

    // Query cooldown tracking
    let query = supabase
      .from("reminder_cooldown_tracking")
      .select("last_reminder_at")
      .eq("user_id", userId);

    if (contactId) {
      query = query.eq("contact_id", contactId).is("entity_type", null);
    } else {
      query = query.is("contact_id", null).eq("entity_type", entityType);
    }

    const { data: tracking } = await query.single();

    if (!tracking || !tracking.last_reminder_at) {
      return { inCooldown: false };
    }

    // Check if cooldown period has passed
    const lastReminderAt = new Date(tracking.last_reminder_at);
    const now = new Date();
    const minutesSince = (now.getTime() - lastReminderAt.getTime()) / (1000 * 60);

    if (minutesSince < cooldownMinutes) {
      // Still in cooldown
      const minutesRemaining = cooldownMinutes - minutesSince;
      const nextAttemptTime = new Date(
        lastReminderAt.getTime() + cooldownMinutes * 60 * 1000
      );
      return {
        inCooldown: true,
        nextAttemptTime,
      };
    }

    return { inCooldown: false };
  } catch (error) {
    console.error("Failed to check cooldown:", error);
    // Fail open - don't suppress if check fails
    return { inCooldown: false };
  }
}

/**
 * Get next valid time for a suppressed reminder
 */
function getNextValidTime(
  time: Date,
  prefs: UserSnoozePreferences,
  timezone: string
): Date {
  // Adjust to next valid time based on preferences
  let nextTime = new Date(time);
  
  // If in quiet hours, move to after quiet hours
  if (isWithinQuietHours(nextTime, prefs, timezone)) {
    nextTime = adjustToWorkingHours(nextTime, prefs, timezone);
  }
  
  // If outside working hours, adjust
  if (!isWithinWorkingHours(nextTime, prefs, timezone)) {
    nextTime = adjustToWorkingHours(nextTime, prefs, timezone);
  }
  
  // If weekend and not allowed, move to next working day
  if (!prefs.allow_weekends && isWeekend(nextTime, timezone)) {
    nextTime = getNextWorkingDay(nextTime, prefs, timezone);
    const [startHour, startMin] = prefs.working_hours_start.split(":").map(Number);
    nextTime.setHours(startHour, startMin, 0, 0);
  }
  
  return nextTime;
}

/**
 * Record cooldown tracking after reminder is sent
 */
export async function recordCooldownTracking(
  userId: string,
  reminderId: string,
  contactId?: string | null
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Determine entity key
    const entityType = contactId ? null : "generic";
    const now = new Date();

    // Upsert cooldown tracking (update if exists, insert if not)
    await supabase
      .from("reminder_cooldown_tracking")
      .upsert(
        {
          user_id: userId,
          contact_id: contactId || null,
          entity_type: entityType,
          last_reminder_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          onConflict: "user_id,contact_id,entity_type",
        }
      );
  } catch (error) {
    console.error("Failed to record cooldown tracking:", error);
    // Fail silently - cooldown tracking is non-critical
  }
}

/**
 * Log reminder suppression event with Trust-Lite metadata
 * Stores: reason_code, intended_fire_time, evaluated_at
 */
export async function logReminderSuppression(
  userId: string,
  reminderId: string,
  reason: ReminderSuppressionReason,
  scheduledTime: Date,
  nextAttemptTime?: Date,
  additionalData?: Record<string, unknown>
): Promise<void> {
  try {
    const evaluatedAt = new Date();
    await logEvent({
      userId,
      eventType: "reminder_suppressed",
      eventData: {
        reminder_id: reminderId,
        reason_code: reason, // Spec-compliant reason code
        intended_fire_time: scheduledTime.toISOString(), // When reminder was supposed to fire
        evaluated_at: evaluatedAt.toISOString(), // When suppression check was performed
        next_attempt_time: nextAttemptTime?.toISOString(),
        ...additionalData,
      },
      source: "app",
      reminderId,
      useServiceClient: true,
    });
  } catch (error) {
    console.error("Failed to log reminder suppression:", error);
    // Fail silently - suppression logging is non-critical
  }
}

