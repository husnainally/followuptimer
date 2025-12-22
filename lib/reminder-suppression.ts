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

