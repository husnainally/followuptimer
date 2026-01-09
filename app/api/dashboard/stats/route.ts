import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from "date-fns";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Fetch reminders
    const { data: reminders, error: remindersError } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("remind_at", { ascending: true });

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    // Debug: Log reminder counts
    console.log(`[Dashboard Stats] Total reminders: ${reminders?.length || 0}`);

    // Helper to normalize dates for comparison (date only, no time)
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Calculate today's reminders (all statuses, due today)
    const todayReminders = reminders?.filter((r) => {
      if (!r.remind_at) return false;
      const remindAt = new Date(r.remind_at);
      const remindDate = normalizeDate(remindAt);
      const todayDate = normalizeDate(now);
      return remindDate.getTime() === todayDate.getTime();
    }) || [];

    // Calculate this week's reminders (all statuses, scheduled this week)
    const weekReminders = reminders?.filter((r) => {
      if (!r.remind_at) return false;
      const remindAt = new Date(r.remind_at);
      return remindAt >= weekStart && remindAt <= weekEnd;
    }) || [];

    // Calculate overdue reminders (past due date, still pending - not sent/completed)
    const overdueReminders = reminders?.filter((r) => {
      if (!r.remind_at) return false;
      const remindAt = new Date(r.remind_at);
      const isOverdue = remindAt < now;
      const isPending = r.status === "pending";
      return isOverdue && isPending;
    }) || [];

    // Calculate at-risk reminders (due in next 24 hours, still pending)
    const atRiskThreshold = addDays(now, 1);
    const atRiskReminders = reminders?.filter((r) => {
      if (!r.remind_at) return false;
      const remindAt = new Date(r.remind_at);
      const isInNext24h = remindAt >= now && remindAt <= atRiskThreshold;
      const isPending = r.status === "pending";
      return isInNext24h && isPending;
    }) || [];

    // Debug logging
    console.log(`[Dashboard Stats] Today: ${todayReminders.length}, Week: ${weekReminders.length}, Overdue: ${overdueReminders.length}, At Risk: ${atRiskReminders.length}`);

    // Fetch suppression events for this week
    const serviceSupabase = createServiceClient();
    const { data: suppressionEvents } = await serviceSupabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("event_type", "reminder_suppressed")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    // Count suppressions by reason
    const suppressionCount = suppressionEvents?.length || 0;
    const quietHoursSuppressions = suppressionEvents?.filter(
      (e) =>
        (e.event_data as Record<string, unknown>)?.reason_code === "QUIET_HOURS" ||
        (e.event_data as Record<string, unknown>)?.reason_code === "quiet_hours"
    ).length || 0;

    // Fetch weekly digest preferences
    const { data: digestPrefs } = await supabase
      .from("user_digest_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Calculate next digest time
    let nextDigestTime: string | null = null;
    if (digestPrefs?.weekly_digest_enabled && digestPrefs?.digest_day !== undefined && digestPrefs?.digest_time) {
      const targetDay = digestPrefs.digest_day; // 0=Sunday, 1=Monday, etc.
      const timeStr = digestPrefs.digest_time; // HH:mm:ss format
      const [hours, minutes] = timeStr.split(":").map(Number);
      
      let nextDigest = new Date(now);
      const currentDay = nextDigest.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      
      if (daysUntilTarget === 0) {
        // Same day - check if time has passed
        const currentTime = nextDigest.getHours() * 60 + nextDigest.getMinutes();
        const targetTime = hours * 60 + minutes;
        if (currentTime >= targetTime) {
          nextDigest = addDays(nextDigest, 7);
        }
      } else {
        nextDigest = addDays(nextDigest, daysUntilTarget);
      }
      
      nextDigest.setHours(hours, minutes, 0, 0);
      nextDigestTime = nextDigest.toISOString();
    }

    // Check for failed reminders this week
    const { data: failedReminders } = await supabase
      .from("reminders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "failed")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    const failedCount = failedReminders?.length || 0;

    // Fetch user preferences for overdue handling
    const { data: userPrefs } = await supabase
      .from("user_preferences")
      .select("overdue_handling")
      .eq("user_id", user.id)
      .single();

    const overdueHandling = (userPrefs?.overdue_handling as "gentle_nudge" | "escalation" | "none") || "gentle_nudge";

    return NextResponse.json({
      today: {
        count: todayReminders.length,
        reminders: todayReminders,
      },
      thisWeek: {
        count: weekReminders.length,
        reminders: weekReminders,
      },
      overdue: {
        count: overdueReminders.length,
        reminders: overdueReminders,
      },
      atRisk: {
        count: atRiskReminders.length,
        reminders: atRiskReminders,
      },
      trust: {
        suppressedThisWeek: suppressionCount,
        quietHoursSuppressions,
        failedReminders: failedCount,
        allProcessedNormally: failedCount === 0 && suppressionCount === 0,
      },
      digest: {
        nextDigestTime,
        enabled: digestPrefs?.weekly_digest_enabled || false,
      },
      preferences: {
        overdueHandling,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch dashboard stats:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch dashboard stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

