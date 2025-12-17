import { createServiceClient } from "@/lib/supabase/service";

export interface SnoozeSuggestion {
  durationMinutes: number;
  confidence: number; // 0-1
  reason: string;
  basedOn: string;
}

interface SnoozeContext {
  timeOfDay?: number; // Hour of day (0-23)
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  reminderType?: string;
  previousSnoozes?: number;
}

/**
 * Analyse snooze history and suggest optimal duration
 */
export async function getSmartSnoozeSuggestion(
  userId: string,
  reminderId: string | null,
  context?: SnoozeContext
): Promise<SnoozeSuggestion | null> {
  try {
    const supabase = createServiceClient();

    // Check if smart snooze is enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("smart_snooze_enabled, snooze_pattern")
      .eq("id", userId)
      .single();

    if (!profile?.smart_snooze_enabled) {
      return null;
    }

    // Get user's snooze history
    const { data: history, error } = await supabase
      .from("snooze_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!history || history.length === 0) {
      // No history, return default suggestion
      return {
        durationMinutes: 10,
        confidence: 0.3,
        reason: "No historical data available",
        basedOn: "Default pattern",
      };
    }

    // Analyse patterns
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Filter recent snoozes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentHistory = history.filter(
      (entry) => new Date(entry.created_at) >= thirtyDaysAgo
    );

    if (recentHistory.length === 0) {
      return {
        durationMinutes: 10,
        confidence: 0.3,
        reason: "No recent snooze data",
        basedOn: "Default pattern",
      };
    }

    // Calculate average snooze duration
    const avgDuration =
      recentHistory.reduce(
        (sum, entry) => sum + entry.snooze_duration_minutes,
        0
      ) / recentHistory.length;

    // Check time-of-day patterns
    const timeOfDaySnoozes = recentHistory.filter((entry) => {
      const entryDate = new Date(entry.created_at);
      const entryHour = entryDate.getHours();
      // Within 2 hours of current time
      return Math.abs(entryHour - currentHour) <= 2;
    });

    let suggestedDuration = Math.round(avgDuration);
    let confidence = 0.5;
    let reason = "Based on your average snooze duration";
    let basedOn = "Historical average";

    if (timeOfDaySnoozes.length > 0) {
      const timeOfDayAvg =
        timeOfDaySnoozes.reduce(
          (sum, entry) => sum + entry.snooze_duration_minutes,
          0
        ) / timeOfDaySnoozes.length;
      suggestedDuration = Math.round(timeOfDayAvg);
      confidence = 0.7;
      reason = `Based on your patterns at this time of day`;
      basedOn = "Time-of-day pattern";
    }

    // Check day-of-week patterns
    const dayOfWeekSnoozes = recentHistory.filter((entry) => {
      const entryDate = new Date(entry.created_at);
      return entryDate.getDay() === currentDay;
    });

    if (dayOfWeekSnoozes.length > 2) {
      const dayOfWeekAvg =
        dayOfWeekSnoozes.reduce(
          (sum, entry) => sum + entry.snooze_duration_minutes,
          0
        ) / dayOfWeekSnoozes.length;
      suggestedDuration = Math.round(dayOfWeekAvg);
      confidence = 0.8;
      reason = `Based on your patterns on ${getDayName(currentDay)}`;
      basedOn = "Day-of-week pattern";
    }

    // Clamp to reasonable values (5 minutes to 2 hours)
    suggestedDuration = Math.max(5, Math.min(120, suggestedDuration));

    // Round to nearest 5 minutes
    suggestedDuration = Math.round(suggestedDuration / 5) * 5;

    return {
      durationMinutes: suggestedDuration,
      confidence,
      reason,
      basedOn,
    };
  } catch (error) {
    console.error("Failed to get smart snooze suggestion:", error);
    return null;
  }
}

function getDayName(day: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day] || "day";
}

/**
 * Log snooze to history
 */
export async function logSnooze(
  userId: string,
  reminderId: string | null,
  durationMinutes: number,
  reason: "user_action" | "smart_suggestion" | "auto" = "user_action",
  contextData?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();

    const now = new Date();
    const context = {
      time_of_day: now.getHours(),
      day_of_week: now.getDay(),
      ...contextData,
    };

    await supabase.from("snooze_history").insert({
      user_id: userId,
      reminder_id: reminderId,
      snooze_duration_minutes: durationMinutes,
      snooze_reason: reason,
      context_data: context,
    });

    // Update user's snooze pattern
    await updateSnoozePattern(userId, durationMinutes, context);
  } catch (error) {
    console.error("Failed to log snooze:", error);
  }
}

/**
 * Update user's snooze pattern based on new snooze
 */
async function updateSnoozePattern(
  userId: string,
  durationMinutes: number,
  context: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("snooze_pattern")
      .eq("id", userId)
      .single();

    if (!profile) return;

    const pattern = (profile.snooze_pattern as Record<string, unknown>) || {};
    const timeOfDay = context.time_of_day as number;
    const dayOfWeek = context.day_of_week as number;

    // Update time-of-day pattern
    if (timeOfDay !== undefined) {
      const timeKey = `time_${Math.floor(timeOfDay / 4) * 4}`; // Group by 4-hour blocks
      if (!pattern[timeKey]) {
        pattern[timeKey] = { durations: [], count: 0 };
      }
      const timePattern = pattern[timeKey] as {
        durations: number[];
        count: number;
      };
      timePattern.durations.push(durationMinutes);
      timePattern.count += 1;
      // Keep only last 20 entries
      if (timePattern.durations.length > 20) {
        timePattern.durations.shift();
      }
    }

    // Update day-of-week pattern
    if (dayOfWeek !== undefined) {
      const dayKey = `day_${dayOfWeek}`;
      if (!pattern[dayKey]) {
        pattern[dayKey] = { durations: [], count: 0 };
      }
      const dayPattern = pattern[dayKey] as {
        durations: number[];
        count: number;
      };
      dayPattern.durations.push(durationMinutes);
      dayPattern.count += 1;
      // Keep only last 20 entries
      if (dayPattern.durations.length > 20) {
        dayPattern.durations.shift();
      }
    }

    await supabase
      .from("profiles")
      .update({ snooze_pattern: pattern })
      .eq("id", userId);
  } catch (error) {
    console.error("Failed to update snooze pattern:", error);
  }
}

