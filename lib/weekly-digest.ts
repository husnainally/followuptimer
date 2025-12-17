import { createServiceClient } from "@/lib/supabase/service";

export interface WeeklyStats {
  remindersCreated: number;
  remindersCompleted: number;
  remindersSnoozed: number;
  remindersDismissed: number;
  completionRate: number;
  currentStreak: number;
  topTone: string;
  averageSnoozeDuration: number;
  mostActiveDay: string;
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Generate weekly statistics for a user
 */
export async function generateWeeklyStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyStats | null> {
  try {
    const supabase = createServiceClient();

    // Get reminders for the week
    const { data: reminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    if (remindersError) throw remindersError;

    const remindersCreated = reminders?.length || 0;
    const remindersCompleted =
      reminders?.filter((r) => r.status === "sent").length || 0;
    const remindersSnoozed =
      reminders?.filter((r) => r.status === "snoozed").length || 0;
    const remindersDismissed =
      reminders?.filter((r) => r.status === "dismissed").length || 0;

    const completionRate =
      remindersCreated > 0
        ? Math.round((remindersCompleted / remindersCreated) * 100)
        : 0;

    // Get tone distribution
    const toneCounts: Record<string, number> = {};
    reminders?.forEach((r) => {
      toneCounts[r.tone] = (toneCounts[r.tone] || 0) + 1;
    });
    const topTone =
      Object.keys(toneCounts).reduce((a, b) =>
        toneCounts[a] > toneCounts[b] ? a : b
      ) || "motivational";

    // Get snooze history for the week
    const { data: snoozes, error: snoozesError } = await supabase
      .from("snooze_history")
      .select("snooze_duration_minutes")
      .eq("user_id", userId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    if (snoozesError) throw snoozesError;

    const averageSnoozeDuration =
      snoozes && snoozes.length > 0
        ? Math.round(
            snoozes.reduce(
              (sum, s) => sum + s.snooze_duration_minutes,
              0
            ) / snoozes.length
          )
        : 0;

    // Calculate streak (consecutive days with completed reminders)
    const { data: allReminders, error: allRemindersError } = await supabase
      .from("reminders")
      .select("created_at, status")
      .eq("user_id", userId)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(100);

    if (allRemindersError) throw allRemindersError;

    let currentStreak = 0;
    if (allReminders && allReminders.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);

      for (let i = 0; i < 30; i++) {
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        const hasCompleted = allReminders.some((r) => {
          const reminderDate = new Date(r.created_at);
          return reminderDate >= dayStart && reminderDate <= dayEnd;
        });

        if (hasCompleted) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Find most active day of week
    const dayCounts: Record<number, number> = {};
    reminders?.forEach((r) => {
      const day = new Date(r.created_at).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const mostActiveDayNum =
      Object.keys(dayCounts).reduce((a, b) =>
        dayCounts[parseInt(a)] > dayCounts[parseInt(b)] ? a : b
      ) || "1";
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const mostActiveDay = dayNames[parseInt(mostActiveDayNum)] || "Monday";

    return {
      remindersCreated,
      remindersCompleted,
      remindersSnoozed,
      remindersDismissed,
      completionRate,
      currentStreak,
      topTone,
      averageSnoozeDuration,
      mostActiveDay,
      weekStart,
      weekEnd,
    };
  } catch (error) {
    console.error("Failed to generate weekly stats:", error);
    return null;
  }
}

/**
 * Get users who should receive weekly digest
 */
export async function getUsersForWeeklyDigest(): Promise<
  Array<{ id: string; email: string; preferences: Record<string, unknown> }>
> {
  try {
    const supabase = createServiceClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, digest_preferences")
      .not("digest_preferences", "is", null);

    if (error) throw error;

    if (!profiles) return [];

    const today = new Date();
    const currentDay = today.getDay();

    return profiles
      .filter((profile) => {
        const prefs = (profile.digest_preferences as Record<string, unknown>) || {};
        const enabled = prefs.enabled === true;
        const preferredDay = (prefs.day_of_week as number) ?? 1; // Monday default

        return enabled && preferredDay === currentDay;
      })
      .map((profile) => ({
        id: profile.id,
        email: profile.email,
        preferences: (profile.digest_preferences as Record<string, unknown>) || {},
      }));
  } catch (error) {
    console.error("Failed to get users for weekly digest:", error);
    return [];
  }
}

/**
 * Check if digest was already sent for this week
 */
export async function wasDigestSent(
  userId: string,
  weekStart: Date
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("weekly_digests")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start_date", weekStart.toISOString().split("T")[0])
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error("Failed to check if digest was sent:", error);
    return false;
  }
}

/**
 * Mark digest as sent
 */
export async function markDigestAsSent(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  stats: WeeklyStats
): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase.from("weekly_digests").upsert({
      user_id: userId,
      week_start_date: weekStart.toISOString().split("T")[0],
      week_end_date: weekEnd.toISOString().split("T")[0],
      stats_data: stats,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to mark digest as sent:", error);
  }
}

