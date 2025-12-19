import { createServiceClient } from "@/lib/supabase/service";
import {
  getUserSnoozePreferences,
  isWithinWorkingHours,
  isWithinQuietHours,
  isWeekend,
  adjustToWorkingHours,
  getNextWorkingDay,
  countRemindersToday,
  type UserSnoozePreferences,
} from "@/lib/snooze-rules";
import { logEvent } from "@/lib/events";

export type SnoozeCandidateType =
  | "later_today"
  | "tomorrow_morning"
  | "next_working_day"
  | "in_3_days"
  | "next_week"
  | "pick_a_time";

export interface SnoozeCandidate {
  type: SnoozeCandidateType;
  scheduledTime: string; // ISO timestamp
  label: string; // Human-readable, e.g., "Tomorrow at 9:15am"
  score: number; // 0-100
  recommended?: boolean;
  adjusted: boolean; // Was it adjusted for rules?
}

export interface SnoozeContext {
  eventType?: string; // e.g., "reminder_due", "email_opened"
  reminderId?: string;
  engagementSignal?: "email_opened" | "no_reply" | "reminder_due";
}

/**
 * Generate candidate snooze times
 */
async function getSnoozeCandidates(
  userId: string,
  reminderId: string | undefined,
  context: SnoozeContext | undefined,
  prefs: UserSnoozePreferences,
  timezone: string
): Promise<SnoozeCandidate[]> {
  const now = new Date();
  const candidates: SnoozeCandidate[] = [];

  // Get user's timezone-aware current time
  const nowInTZ = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

  // 1. Later today (+2 hours, adjusted to working hours)
  if (prefs.default_snooze_options.later_today) {
    const laterToday = new Date(nowInTZ);
    laterToday.setHours(laterToday.getHours() + 2);
    const adjusted = adjustToWorkingHours(laterToday, prefs, timezone);
    const wasAdjusted = adjusted.getTime() !== laterToday.getTime();

    // Only add if still today (in user's timezone)
    const adjustedInTZ = new Date(
      adjusted.toLocaleString("en-US", { timeZone: timezone })
    );
    if (adjustedInTZ.toDateString() === nowInTZ.toDateString()) {
      candidates.push({
        type: "later_today",
        scheduledTime: adjusted.toISOString(),
        label: formatTimeLabel(adjusted, timezone, "Today"),
        score: 0, // Will be scored later
        adjusted: wasAdjusted,
      });
    }
  }

  // 2. Tomorrow morning (first working hour + 15 min, e.g., 9:15am)
  if (prefs.default_snooze_options.tomorrow_morning) {
    const tomorrow = new Date(nowInTZ);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Get next working day
    const nextWorkingDay = getNextWorkingDay(tomorrow, prefs, timezone);
    const [startHour, startMin] = prefs.working_hours_start
      .split(":")
      .map(Number);
    nextWorkingDay.setHours(startHour, startMin + 15, 0, 0); // Add 15 minutes

    const adjusted = adjustToWorkingHours(nextWorkingDay, prefs, timezone);
    candidates.push({
      type: "tomorrow_morning",
      scheduledTime: adjusted.toISOString(),
      label: formatTimeLabel(adjusted, timezone, "Tomorrow"),
      score: 0,
      adjusted: adjusted.getTime() !== nextWorkingDay.getTime(),
    });
  }

  // 3. Next working day
  if (prefs.default_snooze_options.next_working_day) {
    const nextDay = new Date(nowInTZ);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    const nextWorkingDay = getNextWorkingDay(nextDay, prefs, timezone);
    const [startHour, startMin] = prefs.working_hours_start
      .split(":")
      .map(Number);
    nextWorkingDay.setHours(startHour, startMin, 0, 0);

    const adjusted = adjustToWorkingHours(nextWorkingDay, prefs, timezone);
    candidates.push({
      type: "next_working_day",
      scheduledTime: adjusted.toISOString(),
      label: formatTimeLabel(adjusted, timezone, "Next working day"),
      score: 0,
      adjusted: adjusted.getTime() !== nextWorkingDay.getTime(),
    });
  }

  // 4. In 3 days (adjusted to working day)
  if (prefs.default_snooze_options.in_3_days) {
    const in3Days = new Date(nowInTZ);
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(0, 0, 0, 0);

    const nextWorkingDay = getNextWorkingDay(in3Days, prefs, timezone);
    const [startHour, startMin] = prefs.working_hours_start
      .split(":")
      .map(Number);
    nextWorkingDay.setHours(startHour, startMin, 0, 0);

    const adjusted = adjustToWorkingHours(nextWorkingDay, prefs, timezone);
    candidates.push({
      type: "in_3_days",
      scheduledTime: adjusted.toISOString(),
      label: formatTimeLabel(adjusted, timezone, "In 3 days"),
      score: 0,
      adjusted: adjusted.getTime() !== nextWorkingDay.getTime(),
    });
  }

  // 5. Next week (next Monday at working hours start)
  if (prefs.default_snooze_options.next_week) {
    const nextWeek = new Date(nowInTZ);
    // Find next Monday
    const daysUntilMonday = (8 - nextWeek.getDay()) % 7 || 7;
    nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
    nextWeek.setHours(0, 0, 0, 0);

    const [startHour, startMin] = prefs.working_hours_start
      .split(":")
      .map(Number);
    nextWeek.setHours(startHour, startMin, 0, 0);

    const adjusted = adjustToWorkingHours(nextWeek, prefs, timezone);
    candidates.push({
      type: "next_week",
      scheduledTime: adjusted.toISOString(),
      label: formatTimeLabel(adjusted, timezone, "Next week"),
      score: 0,
      adjusted: adjusted.getTime() !== nextWeek.getTime(),
    });
  }

  // 6. Pick a time (manual option - no scheduled time)
  if (prefs.default_snooze_options.pick_a_time) {
    candidates.push({
      type: "pick_a_time",
      scheduledTime: "", // User will pick
      label: "Pick a time",
      score: 50, // Neutral score
      adjusted: false,
    });
  }

  return candidates;
}

/**
 * Score a candidate (0-100)
 */
async function scoreCandidate(
  candidate: SnoozeCandidate,
  prefs: UserSnoozePreferences,
  context: SnoozeContext | undefined,
  userId: string,
  timezone: string
): Promise<number> {
  let score = 0;

  // Skip scoring for "pick_a_time"
  if (candidate.type === "pick_a_time") {
    return 50;
  }

  const scheduledTime = new Date(candidate.scheduledTime);

  // Within working hours: +30
  if (isWithinWorkingHours(scheduledTime, prefs, timezone)) {
    score += 30;
  } else {
    score -= 50; // Heavy penalty
  }

  // Avoids quiet hours: +20
  if (!isWithinQuietHours(scheduledTime, prefs, timezone)) {
    score += 20;
  } else {
    score -= 40; // Heavy penalty
  }

  // Not weekend (if not allowed): +15
  if (prefs.allow_weekends || !isWeekend(scheduledTime, timezone)) {
    score += 15;
  } else {
    score -= 50; // Heavy penalty
  }

  // Matches historical choices: +25
  const historyScore = await getHistoryScore(
    userId,
    candidate.type,
    scheduledTime,
    timezone
  );
  score += historyScore;

  // Follows engagement signal: +15
  if (context?.engagementSignal === "email_opened") {
    // Shorter delays preferred for email opened
    const hoursUntil =
      (scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil <= 24) {
      score += 15;
    }
  }

  // Doesn't exceed daily cap: +10
  const todayCount = await countRemindersToday(userId, timezone);
  if (todayCount < prefs.max_reminders_per_day) {
    score += 10;
  } else {
    score -= 30; // Penalty if exceeds
  }

  // Bonus for not being adjusted: +5
  if (!candidate.adjusted) {
    score += 5;
  }

  // Clamp score to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get score based on historical snooze choices
 */
async function getHistoryScore(
  userId: string,
  candidateType: SnoozeCandidateType,
  scheduledTime: Date,
  timezone: string
): Promise<number> {
  const supabase = createServiceClient();

  // Get recent snooze history
  const { data: history } = await supabase
    .from("snooze_history")
    .select("snooze_duration_minutes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!history || history.length === 0) {
    return 0; // No history, no bonus
  }

  // Calculate average duration
  const avgDuration =
    history.reduce((sum, h) => sum + h.snooze_duration_minutes, 0) /
    history.length;

  // Calculate hours until scheduled time
  const hoursUntil = (scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const durationMinutes = hoursUntil * 60;

  // If duration is close to average, give bonus
  const diff = Math.abs(durationMinutes - avgDuration);
  const avgHours = avgDuration / 60;

  if (diff < avgHours * 0.5) {
    // Within 50% of average
    return 25;
  } else if (diff < avgHours) {
    // Within 100% of average
    return 15;
  }

  return 0;
}

/**
 * Format time label for display
 */
function formatTimeLabel(time: Date, timezone: string, prefix: string): string {
  const timeInTZ = new Date(
    time.toLocaleString("en-US", { timeZone: timezone })
  );
  const hour = timeInTZ.getHours();
  const minute = timeInTZ.getMinutes();
  const ampm = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  const displayMin = minute.toString().padStart(2, "0");

  if (prefix === "Today") {
    return `Today at ${displayHour}:${displayMin}${ampm}`;
  } else if (prefix === "Tomorrow") {
    return `Tomorrow at ${displayHour}:${displayMin}${ampm}`;
  } else {
    return `${prefix} at ${displayHour}:${displayMin}${ampm}`;
  }
}

/**
 * Get recommended snooze suggestions
 * Main entry point for the smart snooze engine
 */
export async function getRecommendedSnooze(
  userId: string,
  reminderId: string | undefined,
  context?: SnoozeContext
): Promise<{
  candidates: SnoozeCandidate[];
  context: SnoozeContext;
} | null> {
  try {
    const supabase = createServiceClient();

    // Get user timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .single();

    const timezone = profile?.timezone || "UTC";

    // Get user preferences
    const prefs = await getUserSnoozePreferences(userId);

    // Generate candidates
    const candidates = await getSnoozeCandidates(
      userId,
      reminderId,
      context,
      prefs,
      timezone
    );

    // Score each candidate
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        score: await scoreCandidate(
          candidate,
          prefs,
          context,
          userId,
          timezone
        ),
      }))
    );

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Mark highest score as recommended
    if (
      scoredCandidates.length > 0 &&
      scoredCandidates[0].type !== "pick_a_time"
    ) {
      scoredCandidates[0].recommended = true;
    }

    // Take top 5 (or all if less than 5)
    const topCandidates = scoredCandidates.slice(0, 5);

    // Always include "pick_a_time" if enabled
    const hasPickATime = topCandidates.some((c) => c.type === "pick_a_time");
    if (!hasPickATime && prefs.default_snooze_options.pick_a_time) {
      topCandidates.push({
        type: "pick_a_time",
        scheduledTime: "",
        label: "Pick a time",
        score: 50,
        adjusted: false,
      });
    }

    // Log snooze_suggested event
    await logEvent({
      userId,
      eventType: "snooze_suggested",
      eventData: {
        reminder_id: reminderId,
        candidates: topCandidates.map((c) => ({
          type: c.type,
          scheduledTime: c.scheduledTime,
          score: c.score,
        })),
        recommended_type: topCandidates.find((c) => c.recommended)?.type,
        context_type: context?.eventType || "unknown",
      },
      source: "app",
      reminderId,
      useServiceClient: true,
    });

    return {
      candidates: topCandidates,
      context: context || {},
    };
  } catch (error) {
    console.error("Failed to get recommended snooze:", error);
    return null;
  }
}
