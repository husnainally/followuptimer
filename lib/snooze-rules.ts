import { createServiceClient } from "@/lib/supabase/service";

export interface UserSnoozePreferences {
  working_hours_start: string; // "09:00:00"
  working_hours_end: string; // "17:30:00"
  working_days: number[]; // [1,2,3,4,5] for Mon-Fri
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_reminders_per_day: number;
  allow_weekends: boolean;
  default_snooze_options: {
    later_today?: boolean;
    tomorrow_morning?: boolean;
    next_working_day?: boolean;
    in_3_days?: boolean;
    next_week?: boolean;
    pick_a_time?: boolean;
  };
  follow_up_cadence: "fast" | "balanced" | "light_touch";
  smart_suggestions_enabled: boolean;
}

/**
 * Check if a time is within working hours
 */
export function isWithinWorkingHours(
  time: Date,
  prefs: UserSnoozePreferences,
  timezone: string = "UTC"
): boolean {
  const timeInTZ = new Date(
    time.toLocaleString("en-US", { timeZone: timezone })
  );
  const hour = timeInTZ.getHours();
  const minute = timeInTZ.getMinutes();
  const dayOfWeek = timeInTZ.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Check if it's a working day
  if (!prefs.working_days.includes(dayOfWeek)) {
    return false;
  }

  // Parse working hours
  const [startHour, startMin] = prefs.working_hours_start
    .split(":")
    .map(Number);
  const [endHour, endMin] = prefs.working_hours_end.split(":").map(Number);

  const timeMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Check if a time is within quiet hours
 */
export function isWithinQuietHours(
  time: Date,
  prefs: UserSnoozePreferences,
  timezone: string = "UTC"
): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }

  const timeInTZ = new Date(
    time.toLocaleString("en-US", { timeZone: timezone })
  );
  const hour = timeInTZ.getHours();
  const minute = timeInTZ.getMinutes();

  const [startHour, startMin] = prefs.quiet_hours_start.split(":").map(Number);
  const [endHour, endMin] = prefs.quiet_hours_end.split(":").map(Number);

  const timeMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle quiet hours that span midnight
  if (startMinutes > endMinutes) {
    return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
  }

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Check if a time is on a weekend
 */
export function isWeekend(time: Date, timezone: string = "UTC"): boolean {
  const timeInTZ = new Date(
    time.toLocaleString("en-US", { timeZone: timezone })
  );
  const dayOfWeek = timeInTZ.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Adjust a time to the next working hour
 */
export function adjustToWorkingHours(
  time: Date,
  prefs: UserSnoozePreferences,
  timezone: string = "UTC"
): Date {
  const timeInTZ = new Date(
    time.toLocaleString("en-US", { timeZone: timezone })
  );
  let adjusted = new Date(timeInTZ);

  const [startHour, startMin] = prefs.working_hours_start
    .split(":")
    .map(Number);
  const [endHour, endMin] = prefs.working_hours_end.split(":").map(Number);

  let dayOfWeek = adjusted.getDay();
  let hour = adjusted.getHours();
  let minute = adjusted.getMinutes();

  // If it's a weekend and weekends not allowed, move to next working day
  if (isWeekend(adjusted, timezone) && !prefs.allow_weekends) {
    adjusted = getNextWorkingDay(adjusted, prefs, timezone);
    dayOfWeek = adjusted.getDay();
    hour = adjusted.getHours();
    minute = adjusted.getMinutes();
  }

  // If not a working day, move to next working day
  if (!prefs.working_days.includes(dayOfWeek)) {
    adjusted = getNextWorkingDay(adjusted, prefs, timezone);
    dayOfWeek = adjusted.getDay();
    hour = adjusted.getHours();
    minute = adjusted.getMinutes();
  }

  const timeMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // If before working hours, set to start of working hours
  if (timeMinutes < startMinutes) {
    adjusted.setHours(startHour, startMin, 0, 0);
  }
  // If after working hours, move to next working day start
  else if (timeMinutes > endMinutes) {
    adjusted = getNextWorkingDay(adjusted, prefs, timezone);
    const [nextStartHour, nextStartMin] = prefs.working_hours_start
      .split(":")
      .map(Number);
    adjusted.setHours(nextStartHour, nextStartMin, 0, 0);
  }

  // Convert back to UTC
  const utcOffset = time.getTime() - timeInTZ.getTime();
  return new Date(adjusted.getTime() - utcOffset);
}

/**
 * Get the next working day
 */
export function getNextWorkingDay(
  time: Date,
  prefs: UserSnoozePreferences,
  timezone: string = "UTC"
): Date {
  const timeInTZ = new Date(
    time.toLocaleString("en-US", { timeZone: timezone })
  );
  const nextDay = new Date(timeInTZ);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);

  // Find next working day
  let attempts = 0;
  while (attempts < 14) {
    // Max 2 weeks
    const dayOfWeek = nextDay.getDay();

    // If weekends not allowed, skip weekends
    if (!prefs.allow_weekends && isWeekend(nextDay, timezone)) {
      nextDay.setDate(nextDay.getDate() + 1);
      attempts++;
      continue;
    }

    // Check if it's a working day
    if (prefs.working_days.includes(dayOfWeek)) {
      break;
    }

    nextDay.setDate(nextDay.getDate() + 1);
    attempts++;
  }

  // Convert back to UTC
  const utcOffset = time.getTime() - timeInTZ.getTime();
  return new Date(nextDay.getTime() - utcOffset);
}

/**
 * Count reminders scheduled for today (in user's timezone)
 */
export async function countRemindersToday(
  userId: string,
  timezone: string = "UTC"
): Promise<number> {
  const supabase = createServiceClient();

  // Get start of day in user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const month =
    parseInt(parts.find((p) => p.type === "month")?.value || "0") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");

  // Create date at midnight in user's timezone, then convert to UTC
  const startOfDayInTZ = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) -
      (now.getTime() -
        new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime())
  );

  const { count } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("remind_at", startOfDayInTZ.toISOString());

  return count || 0;
}

/**
 * Get or create user snooze preferences with defaults
 */
export async function getUserSnoozePreferences(
  userId: string
): Promise<UserSnoozePreferences> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("user_snooze_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return existing as UserSnoozePreferences;
  }

  // Create default preferences
  const { data: newPrefs } = await supabase
    .from("user_snooze_preferences")
    .insert({
      user_id: userId,
      working_hours_start: "09:00:00",
      working_hours_end: "17:30:00",
      working_days: [1, 2, 3, 4, 5], // Mon-Fri
      quiet_hours_start: null,
      quiet_hours_end: null,
      max_reminders_per_day: 10,
      allow_weekends: false,
      default_snooze_options: {
        later_today: true,
        tomorrow_morning: true,
        next_working_day: true,
        in_3_days: true,
        next_week: true,
        pick_a_time: true,
      },
      follow_up_cadence: "balanced",
      smart_suggestions_enabled: true,
    })
    .select()
    .single();

  return (
    (newPrefs as UserSnoozePreferences) || {
      working_hours_start: "09:00:00",
      working_hours_end: "17:30:00",
      working_days: [1, 2, 3, 4, 5],
      quiet_hours_start: null,
      quiet_hours_end: null,
      max_reminders_per_day: 10,
      allow_weekends: false,
      default_snooze_options: {
        later_today: true,
        tomorrow_morning: true,
        next_working_day: true,
        in_3_days: true,
        next_week: true,
        pick_a_time: true,
      },
      follow_up_cadence: "balanced",
      smart_suggestions_enabled: true,
    }
  );
}
