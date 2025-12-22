/**
 * Milestone 9: Usage Metering
 * Tracks usage metrics for limit enforcement
 */

import { createClient } from "./supabase/server";

export type MetricType =
  | "reminders_active"
  | "contacts_count"
  | "digests_sent"
  | "audit_history_depth";

/**
 * Get current usage for a metric
 */
export async function getUsage(
  userId: string,
  metricType: MetricType
): Promise<number> {
  try {
    const supabase = await createClient();

    switch (metricType) {
      case "reminders_active": {
        const { count } = await supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending");
        return count || 0;
      }

      case "contacts_count": {
        const { count } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        return count || 0;
      }

      case "digests_sent": {
        // Count digests sent in current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { count } = await supabase
          .from("digest_tracking")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", monthStart.toISOString());
        return count || 0;
      }

      case "audit_history_depth": {
        // Count audit events (simplified - can be enhanced)
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("event_type", [
            "reminder_created",
            "reminder_completed",
            "reminder_snoozed",
          ]);
        return count || 0;
      }

      default:
        return 0;
    }
  } catch (error) {
    console.error(`Failed to get usage for ${metricType}:`, error);
    return 0; // Fail open
  }
}

/**
 * Record usage metric (for tracking purposes)
 */
export async function recordUsage(
  userId: string,
  metricType: MetricType,
  value: number,
  periodStart?: Date
): Promise<void> {
  try {
    const supabase = await createClient();
    const start = periodStart || new Date();
    start.setDate(1); // First of month
    start.setHours(0, 0, 0, 0);

    const periodEnd = new Date(start);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from("usage_metrics").upsert(
      {
        user_id: userId,
        metric_type: metricType,
        metric_value: value,
        period_start: start.toISOString(),
        period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,metric_type,period_start",
      }
    );
  } catch (error) {
    console.error(`Failed to record usage for ${metricType}:`, error);
    // Don't throw - usage tracking is non-critical
  }
}

/**
 * Get all usage metrics for a user
 */
export async function getAllUsage(
  userId: string
): Promise<Record<MetricType, number>> {
  const [reminders, contacts, digests, audit] = await Promise.all([
    getUsage(userId, "reminders_active"),
    getUsage(userId, "contacts_count"),
    getUsage(userId, "digests_sent"),
    getUsage(userId, "audit_history_depth"),
  ]);

  return {
    reminders_active: reminders,
    contacts_count: contacts,
    digests_sent: digests,
    audit_history_depth: audit,
  };
}

