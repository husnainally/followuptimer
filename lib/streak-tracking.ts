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
 * Note: This should be called AFTER the reminder_completed event is logged
 */
export async function updateStreakOnCompletion(
  userId: string,
  reminderId: string
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Get all completions including the one just logged
    const { data: allCompletions } = await supabase
      .from("events")
      .select("created_at")
      .eq("user_id", userId)
      .eq("event_type", "reminder_completed")
      .order("created_at", { ascending: false });

    if (!allCompletions || allCompletions.length === 0) {
      return;
    }

    // Calculate current streak (includes the just-completed reminder)
    const currentStreak = await calculateStreak(userId);

    // To determine if streak increased, check if there was a completion yesterday
    // If yes, streak continues. If no, this might be a new streak or first completion.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayCompletions = allCompletions.filter((e) => {
      const eventDate = new Date(e.created_at);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === yesterday.getTime();
    });

    // If this is the first completion ever, or first completion in a while, check if streak started
    if (allCompletions.length === 1) {
      // First completion - create streak_incremented event
      const result = await logEvent({
        userId,
        eventType: "streak_incremented",
        eventData: {
          reminder_id: reminderId,
          streak_count: 1,
          previous_streak: 0,
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
          { streak_count: 1 }
        );
      }
      return;
    }

    // Check if there was a completion yesterday (streak continues)
    const hadCompletionYesterday = yesterdayCompletions.length > 0;

    // If we had a completion yesterday, the streak increased (continued)
    if (hadCompletionYesterday && currentStreak.currentStreak > 1) {
      // Calculate previous streak (current - 1, since we just added today's)
      const previousStreak = currentStreak.currentStreak - 1;

      // Log streak increment
      const result = await logEvent({
        userId,
        eventType: "streak_incremented",
        eventData: {
          reminder_id: reminderId,
          streak_count: currentStreak.currentStreak,
          previous_streak: previousStreak,
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
          { streak_count: currentStreak.currentStreak }
        );
      }
    } else if (!hadCompletionYesterday) {
      // No completion yesterday - check if this starts a new streak
      // Get the last completion before yesterday to see if streak was broken
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const olderCompletions = allCompletions.filter((e) => {
        const eventDate = new Date(e.created_at);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() < twoDaysAgo.getTime();
      });

      // If there were completions more than 2 days ago, streak was broken
      if (olderCompletions.length > 0 && currentStreak.currentStreak === 1) {
        // Streak was broken and restarted
        await logEvent({
          userId,
          eventType: "streak_broken",
          eventData: {
            reminder_id: reminderId,
            previous_streak: 0, // We don't know the exact previous streak without more calculation
          },
          reminderId,
          source: "scheduler",
          useServiceClient: true,
        });
      }
      // If no older completions and streak is 1, it's the first completion (already handled above)
    }
  } catch (error) {
    console.error("Failed to update streak on completion:", error);
  }
}
