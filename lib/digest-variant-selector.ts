import { DigestStats } from "./digest-stats";

export type DigestVariant = "standard" | "light" | "recovery" | "no_activity";

export interface VariantSelectionResult {
  variant: DigestVariant;
  metadata: {
    reason: string;
    thresholds_met?: string[];
  };
}

/**
 * Select appropriate digest template variant based on stats and user preferences
 */
export function selectDigestVariant(
  stats: DigestStats | null,
  userDetailLevel?: "light" | "standard"
): VariantSelectionResult {
  // If user explicitly wants light, use light (unless no activity)
  if (userDetailLevel === "light" && stats) {
    const totalEvents =
      stats.overall.total_reminders_created +
      stats.overall.total_reminders_triggered;
    if (totalEvents > 0) {
      return {
        variant: "light",
        metadata: {
          reason: "User preference set to light detail level",
        },
      };
    }
  }

  // No stats or no activity
  if (!stats) {
    return {
      variant: "no_activity",
      metadata: {
        reason: "No stats available or no activity detected",
      },
    };
  }

  const overall = stats.overall;
  const totalEvents =
    overall.total_reminders_created + overall.total_reminders_triggered;

  // No-Activity: Zero events across the week
  if (totalEvents === 0) {
    return {
      variant: "no_activity",
      metadata: {
        reason: "Zero events in the week",
      },
    };
  }

  // Light: Low activity (≤3 reminders) AND no completed actions
  if (totalEvents <= 3 && overall.reminders_completed === 0) {
    return {
      variant: "light",
      metadata: {
        reason: "Low activity week with no completed reminders",
        thresholds_met: [`total_events <= 3 (${totalEvents})`, "no_completed"],
      },
    };
  }

  // Recovery: High overdue count OR high snooze rate OR low completion rate
  const thresholds: string[] = [];
  const highOverdue = overall.reminders_overdue >= 3;
  const highSnoozeRate = overall.snooze_rate >= 50;
  const lowCompletionRate = overall.completion_rate < 30;

  if (highOverdue) thresholds.push(`high_overdue (${overall.reminders_overdue})`);
  if (highSnoozeRate) thresholds.push(`high_snooze_rate (${overall.snooze_rate}%)`);
  if (lowCompletionRate) thresholds.push(`low_completion_rate (${overall.completion_rate}%)`);

  if (highOverdue || highSnoozeRate || lowCompletionRate) {
    return {
      variant: "recovery",
      metadata: {
        reason: "Recovery variant triggered by activity patterns",
        thresholds_met: thresholds,
      },
    };
  }

  // Standard: Default for moderate activity
  return {
    variant: "standard",
    metadata: {
      reason: "Standard variant for moderate activity week",
    },
  };
}

