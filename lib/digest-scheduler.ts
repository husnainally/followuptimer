import { createServiceClient } from "@/lib/supabase/service";
import { calculateWeekBoundaries } from "./digest-stats";

export interface UserDigestInfo {
  user_id: string;
  email: string;
  timezone: string;
  preferences: {
    digest_day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    digest_time: string; // HH:mm format
    digest_channel: "email" | "in_app" | "both";
    digest_detail_level: "light" | "standard";
    only_when_active: boolean;
  };
}

/**
 * Get users who are due for a weekly digest based on their preferences and current time
 * Handles timezone-aware scheduling with DST support
 * 
 * For daily cron compatibility: Checks if user's preferred digest day/time has passed
 * in the current week. This allows the daily cron to catch all users who were due
 * since the last run, not just those due at the exact moment.
 */
export async function getUsersDueForDigest(
  currentTime: Date = new Date()
): Promise<UserDigestInfo[]> {
  const supabase = createServiceClient();

  // Get all users with digest enabled
  const { data: preferences, error } = await supabase
    .from("user_digest_preferences")
    .select("*, profiles:user_id(id, email, timezone)")
    .eq("weekly_digest_enabled", true);

  if (error) {
    console.error("Failed to fetch digest preferences:", error);
    return [];
  }

  if (!preferences || preferences.length === 0) {
    return [];
  }

  const dueUsers: UserDigestInfo[] = [];

  for (const pref of preferences) {
    const profile = pref.profiles as { id: string; email: string; timezone: string | null } | null;
    if (!profile) continue;

    const userTimezone = profile.timezone || "UTC";
    const digestDay = pref.digest_day;
    const digestTime = pref.digest_time; // Format: "HH:mm:ss" or "HH:mm"

    // Get current time in user's timezone
    const userLocalTime = new Date(
      currentTime.toLocaleString("en-US", { timeZone: userTimezone })
    );

    // Parse digest time
    const [hours, minutes] = digestTime.split(":").map(Number);
    const expectedHour = hours || 8;
    const expectedMinute = minutes || 0;

    // Calculate week boundaries for this user
    const { weekStart } = calculateWeekBoundaries(userLocalTime, userTimezone);
    
    // Calculate when the digest should be sent this week (user's preferred day/time)
    // Week starts on Monday (day 1), so we need to adjust
    // digestDay: 0=Sunday, 1=Monday, ..., 6=Saturday
    // weekStart is Monday, so:
    // - Monday (1) = 0 days
    // - Tuesday (2) = 1 day
    // - ...
    // - Sunday (0) = 6 days
    const daysToAdd = digestDay === 0 ? 6 : digestDay - 1;
    const digestDateTime = new Date(weekStart);
    digestDateTime.setDate(weekStart.getDate() + daysToAdd);
    digestDateTime.setHours(expectedHour, expectedMinute, 0, 0);
    
    // Check if the digest time has passed in the current week
    const now = userLocalTime.getTime();
    const digestTimestamp = digestDateTime.getTime();
    const oneHourInMs = 60 * 60 * 1000;
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    
    // User is due if:
    // 1. The digest time has passed (at least 1 hour ago to account for cron timing variations)
    // 2. But not more than 1 week ago (to avoid sending old digests)
    // 3. And no digest has been sent for this week (idempotency check)
    const timeSinceDigestTime = now - digestTimestamp;
    const isDue = timeSinceDigestTime >= oneHourInMs && timeSinceDigestTime < oneWeekInMs;
    
    if (isDue) {
      // Check if digest was already sent for this week (idempotency)
      const wasSent = await wasDigestSentThisWeek(profile.id, weekStart);
      if (!wasSent) {
        dueUsers.push({
          user_id: profile.id,
          email: profile.email,
          timezone: userTimezone,
          preferences: {
            digest_day: digestDay,
            digest_time: digestTime,
            digest_channel: pref.digest_channel as "email" | "in_app" | "both",
            digest_detail_level: pref.digest_detail_level as "light" | "standard",
            only_when_active: pref.only_when_active || false,
          },
        });
      }
    }
  }

  return dueUsers;
}

/**
 * Generate dedupe key for idempotency
 * Format: ${userId}_${weekStartISO}
 */
export function generateDedupeKey(userId: string, weekStart: Date): string {
  const weekStartISO = weekStart.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${userId}_${weekStartISO}`;
}

/**
 * Check if digest was already sent for this week (idempotency check)
 */
export async function wasDigestSentThisWeek(
  userId: string,
  weekStart: Date
): Promise<boolean> {
  const supabase = createServiceClient();
  const dedupeKey = generateDedupeKey(userId, weekStart);

  const { data, error } = await supabase
    .from("weekly_digests")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    console.error("Failed to check digest idempotency:", error);
    return false; // Assume not sent on error to allow retry
  }

  return !!data;
}

/**
 * Check if user is eligible for first digest
 * New users: delay until at least 1 reminder exists OR 7 days since signup
 */
export async function isUserEligibleForDigest(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  // Check if user has at least one reminder
  const { count: reminderCount } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (reminderCount && reminderCount > 0) {
    return true;
  }

  // Check if 7 days have passed since signup
  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .single();

  if (!profile) {
    return false;
  }

  const signupDate = new Date(profile.created_at);
  const daysSinceSignup = Math.floor(
    (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceSignup >= 7;
}

/**
 * Get week boundaries for a user based on their timezone
 * Week starts Monday 00:00:00, ends Sunday 23:59:59 in user's timezone
 */
export function getUserWeekBoundaries(
  referenceDate: Date,
  timezone: string
): { weekStart: Date; weekEnd: Date } {
  return calculateWeekBoundaries(referenceDate, timezone);
}

