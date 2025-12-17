/**
 * Streak Tracking - Calculates and logs streak events
 */

import { createServiceClient } from "@/lib/supabase/service";
import { logEvent } from "./events";
import { createTrigger, processEventForTriggers } from "./trigger-manager";

interface StreakInfo {
  currentStreak: number;
  lastActivityDate: Date | null;
}

/**
 * Calculate current streak from reminder_completed events
 */
export async function calculateStreak(userId: string): Promise<StreakInfo> {
  try {
    const supabase = createServiceClient();

    // Get all reminder_completed events ordered by date
    const { data: events, error } = await supabase
      .from("events")
      .select("created_at")
      .eq("user_id", userId)
      .eq("event_type", "reminder_completed")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!events || events.length === 0) {
      return { currentStreak: 0, lastActivityDate: null };
    }

    // Calculate streak by checking consecutive days
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivityDate = new Date(events[0].created_at);
    lastActivityDate.setHours(0, 0, 0, 0);

    // Check if last activity was today or yesterday (still counts as active streak)
    const daysSinceLastActivity = Math.floor(
      (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActivity > 1) {
      // Streak broken if more than 1 day since last activity
      return { currentStreak: 0, lastActivityDate };
    }

    // Count consecutive days with completed reminders
    const activityDates = new Set<string>();
    events.forEach((event) => {
      const date = new Date(event.created_at);
      date.setHours(0, 0, 0, 0);
      activityDates.add(date.toISOString());
    });

    const sortedDates = Array.from(activityDates)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let expectedDate = new Date(today);
    if (daysSinceLastActivity === 1) {
      // Last activity was yesterday, start counting from yesterday
      expectedDate.setDate(expectedDate.getDate() - 1);
    }

    for (const activityDate of sortedDates) {
      const activityDay = new Date(activityDate);
      activityDay.setHours(0, 0, 0, 0);

      if (
        activityDay.getTime() === expectedDate.getTime() ||
        activityDay.getTime() === expectedDate.getTime() - 86400000
      ) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak: streak, lastActivityDate };
  } catch (error) {
    console.error("Failed to calculate streak:", error);
    return { currentStreak: 0, lastActivityDate: null };
  }
}

/**
 * Check and update streak when reminder is completed
 */
export async function updateStreakOnCompletion(
  userId: string,
  reminderId: string
): Promise<void> {
  try {
    const previousStreak = await calculateStreak(userId);
    const newStreak = await calculateStreak(userId);

    // If streak increased
    if (newStreak.currentStreak > previousStreak.currentStreak) {
      const result = await logEvent({
        userId,
        eventType: "streak_incremented",
        eventData: {
          reminder_id: reminderId,
          streak_count: newStreak.currentStreak,
          previous_streak: previousStreak.currentStreak,
        },
        reminderId,
        source: "scheduler",
        useServiceClient: true,
      });

      if (result.success && result.eventId) {
        await processEventForTriggers(
          userId,
          "streak_incremented",
          result.eventId,
          { streak_count: newStreak.currentStreak }
        );
      }
    }

    // If streak was broken (went from > 0 to 0)
    if (previousStreak.currentStreak > 0 && newStreak.currentStreak === 0) {
      await logEvent({
        userId,
        eventType: "streak_broken",
        eventData: {
          reminder_id: reminderId,
          previous_streak: previousStreak.currentStreak,
        },
        reminderId,
        source: "scheduler",
        useServiceClient: true,
      });
    }
  } catch (error) {
    console.error("Failed to update streak on completion:", error);
  }
}

