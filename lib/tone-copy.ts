import { ToneStyle } from "./user-preferences";

/**
 * Tone-specific copy dictionary
 * Each key maps to different copy based on tone style
 */
export const toneCopy: Record<ToneStyle, Record<string, string>> = {
  neutral: {
    "snooze.success": "Reminder snoozed until {time}.",
    "snooze.confirmation": "Reminder snoozed until {time}.",
    "completion.success": "Reminder completed.",
    "completion.confirmation": "Reminder marked as completed.",
    "suppression.quiet_hours": "Reminder suppressed due to quiet hours.",
    "suppression.working_hours": "Reminder suppressed - outside working hours.",
    "suppression.daily_cap": "Reminder suppressed - daily limit reached.",
    "suppression.cooldown": "Reminder suppressed - cooldown period active.",
    "suppression.category_disabled": "Reminder suppressed - category disabled.",
    "empty.no_reminders": "No reminders scheduled.",
    "empty.no_completed": "No completed reminders.",
    "empty.no_overdue": "No overdue reminders.",
    "status.scheduled": "Scheduled for {time}.",
    "status.snoozed": "Snoozed until {time}.",
    "status.overdue": "Overdue since {time}.",
    "status.completed": "Completed.",
    "toast.saved": "Settings saved.",
    "toast.error": "An error occurred.",
  },
  supportive: {
    "snooze.success": "All set — we'll remind you again at {time}.",
    "snooze.confirmation": "Got it! We'll remind you again at {time}.",
    "completion.success": "Great job! Reminder completed.",
    "completion.confirmation": "Well done! Your reminder is marked as completed.",
    "suppression.quiet_hours": "We held this reminder back because it's during your quiet hours.",
    "suppression.working_hours": "We're waiting until your working hours to send this reminder.",
    "suppression.daily_cap": "We're taking it easy today — you've reached your daily reminder limit.",
    "suppression.cooldown": "We're giving you a moment — cooldown period is active.",
    "suppression.category_disabled": "This reminder category is currently disabled in your settings.",
    "empty.no_reminders": "You're all caught up! No reminders scheduled.",
    "empty.no_completed": "No completed reminders yet. You've got this!",
    "empty.no_overdue": "Excellent! No overdue reminders.",
    "status.scheduled": "Scheduled for {time}. We've got you covered!",
    "status.snoozed": "Snoozed until {time}. We'll remind you then.",
    "status.overdue": "This reminder is overdue since {time}. No worries — you can still complete it!",
    "status.completed": "Completed. Great work!",
    "toast.saved": "Settings saved successfully!",
    "toast.error": "Oops! Something went wrong. Please try again.",
  },
  direct: {
    "snooze.success": "Snoozed to {time}.",
    "snooze.confirmation": "Snoozed until {time}.",
    "completion.success": "Completed.",
    "completion.confirmation": "Reminder completed.",
    "suppression.quiet_hours": "Suppressed: quiet hours.",
    "suppression.working_hours": "Suppressed: outside working hours.",
    "suppression.daily_cap": "Suppressed: daily limit reached.",
    "suppression.cooldown": "Suppressed: cooldown active.",
    "suppression.category_disabled": "Suppressed: category disabled.",
    "empty.no_reminders": "No reminders.",
    "empty.no_completed": "No completed reminders.",
    "empty.no_overdue": "No overdue reminders.",
    "status.scheduled": "Scheduled: {time}.",
    "status.snoozed": "Snoozed: {time}.",
    "status.overdue": "Overdue: {time}.",
    "status.completed": "Completed.",
    "toast.saved": "Saved.",
    "toast.error": "Error occurred.",
  },
  motivational: {
    "snooze.success": "Reminder rescheduled to {time}. Stay on track!",
    "snooze.confirmation": "Perfect! We'll remind you at {time}. Keep going!",
    "completion.success": "Excellent! Reminder completed. You're making progress!",
    "completion.confirmation": "Outstanding! Your reminder is complete. Keep up the momentum!",
    "suppression.quiet_hours": "We're respecting your quiet hours. This reminder will come at a better time!",
    "suppression.working_hours": "We're waiting for your working hours so you can take action right away!",
    "suppression.daily_cap": "You've been productive today! We're pacing your reminders to keep you focused.",
    "suppression.cooldown": "Taking a brief pause to keep you in the zone. We'll be back soon!",
    "suppression.category_disabled": "This category is paused in your settings. You're in control!",
    "empty.no_reminders": "You're ahead of the game! No reminders scheduled.",
    "empty.no_completed": "No completed reminders yet. Every journey starts with a single step!",
    "empty.no_overdue": "Fantastic! You're staying on top of everything.",
    "status.scheduled": "Scheduled for {time}. You've got this!",
    "status.snoozed": "Snoozed until {time}. We'll be here when you're ready!",
    "status.overdue": "This reminder is overdue since {time}. Time to get back on track!",
    "status.completed": "Completed. You're doing great!",
    "toast.saved": "Settings saved! You're all set.",
    "toast.error": "Something went wrong. Don't worry — try again!",
  },
  minimal: {
    "snooze.success": "{time}",
    "snooze.confirmation": "{time}",
    "completion.success": "Done.",
    "completion.confirmation": "Done.",
    "suppression.quiet_hours": "Quiet hours",
    "suppression.working_hours": "Outside hours",
    "suppression.daily_cap": "Limit reached",
    "suppression.cooldown": "Cooldown",
    "suppression.category_disabled": "Disabled",
    "empty.no_reminders": "None",
    "empty.no_completed": "None",
    "empty.no_overdue": "None",
    "status.scheduled": "{time}",
    "status.snoozed": "{time}",
    "status.overdue": "{time}",
    "status.completed": "Done",
    "toast.saved": "Saved",
    "toast.error": "Error",
  },
};

/**
 * Get tone-specific copy with variable substitution
 */
export function getToneCopy(
  key: string,
  tone: ToneStyle,
  context?: Record<string, string | number>
): string {
  const copy = toneCopy[tone]?.[key] || toneCopy.neutral[key] || key;

  if (!context) {
    return copy;
  }

  // Replace {variable} placeholders with context values
  return copy.replace(/\{(\w+)\}/g, (match, varName) => {
    const value = context[varName];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Format time for tone copy
 */
export function formatTimeForTone(
  date: Date | string,
  tone: ToneStyle
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  switch (tone) {
    case "direct":
    case "minimal":
      // 24-hour format: 14:30
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    case "supportive":
    case "motivational":
      // Friendly format: 2:30 PM
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    case "neutral":
    default:
      // Standard format: 2:30 PM
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
  }
}

