import { createServiceClient } from "@/lib/supabase/service";

/**
 * Overall weekly stats computed from Trust-Lite events
 */
export interface WeeklyOverallStats {
  total_reminders_created: number;
  total_reminders_triggered: number;
  reminders_completed: number;
  reminders_snoozed: number;
  reminders_overdue: number;
  reminders_suppressed: number;
  completion_rate: number; // percentage
  snooze_rate: number; // percentage
  overdue_carry_over_start: number; // overdue count at start of week
  overdue_carry_over_end: number; // overdue count at end of week
  suppression_breakdown: Array<{
    reason_code: string;
    count: number;
  }>;
}

/**
 * Per-contact stats (top N contacts)
 */
export interface PerContactStats {
  contact_id: string;
  contact_name: string;
  reminders_completed: number;
  reminders_overdue: number;
  last_interaction_date: string | null; // ISO date
  next_scheduled_followup: string | null; // ISO date
}

/**
 * Forward-looking stats
 */
export interface ForwardLookingStats {
  upcoming_reminders_next_7_days: number;
  contacts_with_no_followup_scheduled: number;
  longest_overdue_reminder: {
    reminder_id: string;
    message: string;
    days_overdue: number;
    contact_name: string | null;
  } | null;
}

/**
 * Complete digest stats
 */
export interface DigestStats {
  overall: WeeklyOverallStats;
  per_contact: PerContactStats[];
  forward_looking: ForwardLookingStats;
  week_start: Date;
  week_end: Date;
  timezone: string;
}

/**
 * Calculate week boundaries in user's timezone
 * Week starts Monday 00:00:00, ends Sunday 23:59:59
 */
export function calculateWeekBoundaries(
  referenceDate: Date,
  timezone: string
): { weekStart: Date; weekEnd: Date } {
  // Convert reference date to user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  // Get the date in user's timezone
  const localDate = new Date(
    referenceDate.toLocaleString("en-US", { timeZone: timezone })
  );

  // Find Monday of the week
  const dayOfWeek = localDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days back

  const weekStart = new Date(localDate);
  weekStart.setDate(localDate.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Compute overall weekly stats from Trust-Lite events
 */
export async function computeWeeklyOverallStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  timezone: string
): Promise<WeeklyOverallStats> {
  const supabase = createServiceClient();

  // Convert week boundaries to ISO strings for querying
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  // Get all relevant events in the week window
  // Limit to 10000 events to handle high activity weeks efficiently
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", weekStartISO)
    .lte("created_at", weekEndISO)
    .in("event_type", [
      "reminder_created",
      "reminder_triggered",
      "reminder_completed",
      "reminder_snoozed",
      "reminder_overdue",
      "reminder_suppressed",
    ])
    .limit(10000); // High activity optimization

  if (eventsError) {
    console.warn(`[${userId}] Failed to fetch events for stats:`, eventsError);
    // Return safe defaults - partial week data is acceptable
    return {
      total_reminders_created: 0,
      total_reminders_triggered: 0,
      reminders_completed: 0,
      reminders_snoozed: 0,
      reminders_overdue: 0,
      reminders_suppressed: 0,
      completion_rate: 0,
      snooze_rate: 0,
      overdue_carry_over_start: 0,
      overdue_carry_over_end: 0,
      suppression_breakdown: [],
    };
  }

  // Count events by type
  const created = events?.filter((e) => e.event_type === "reminder_created").length || 0;
  const triggered = events?.filter((e) => e.event_type === "reminder_triggered").length || 0;
  const completed = events?.filter((e) => e.event_type === "reminder_completed").length || 0;
  const snoozed = events?.filter((e) => e.event_type === "reminder_snoozed").length || 0;
  const overdue = events?.filter((e) => e.event_type === "reminder_overdue").length || 0;
  const suppressed = events?.filter((e) => e.event_type === "reminder_suppressed").length || 0;

  // Calculate rates
  const completion_rate = triggered > 0 ? Math.round((completed / triggered) * 100) : 0;
  const snooze_rate = triggered > 0 ? Math.round((snoozed / triggered) * 100) : 0;

  // Get overdue carry-over (count overdue reminders at start and end of week)
  const { data: overdueAtStart } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("remind_at", weekStartISO);

  const { data: overdueAtEnd } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("remind_at", weekEndISO);

  // Suppression breakdown by reason code
  const suppressionEvents = events?.filter((e) => e.event_type === "reminder_suppressed") || [];
  const reasonCounts: Record<string, number> = {};
  suppressionEvents.forEach((event) => {
    const reasonCode =
      (event.event_data as Record<string, unknown>)?.reason_code as string ||
      (event.event_data as Record<string, unknown>)?.reason as string ||
      "other";
    reasonCounts[reasonCode] = (reasonCounts[reasonCode] || 0) + 1;
  });

  const suppression_breakdown = Object.entries(reasonCounts).map(([reason_code, count]) => ({
    reason_code,
    count,
  }));

  return {
    total_reminders_created: created,
    total_reminders_triggered: triggered,
    reminders_completed: completed,
    reminders_snoozed: snoozed,
    reminders_overdue: overdue,
    reminders_suppressed: suppressed,
    completion_rate,
    snooze_rate,
    overdue_carry_over_start: overdueAtStart || 0,
    overdue_carry_over_end: overdueAtEnd || 0,
    suppression_breakdown,
  };
}

/**
 * Compute per-contact stats (top N contacts by activity or overdue risk)
 */
export async function computePerContactStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  topN: number = 5
): Promise<PerContactStats[]> {
  const supabase = createServiceClient();
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  // Get all events with contact_id in the week
  // Limit to 5000 events for high activity optimization
  const { data: contactEvents, error: eventsError } = await supabase
    .from("events")
    .select("*, contacts:contact_id(id, name)")
    .eq("user_id", userId)
    .not("contact_id", "is", null)
    .gte("created_at", weekStartISO)
    .lte("created_at", weekEndISO)
    .in("event_type", ["reminder_completed", "reminder_overdue"])
    .limit(5000); // High activity optimization

  if (eventsError) {
    console.warn(`[${userId}] Failed to fetch contact events:`, eventsError);
    // Missing events - exclude from stats, return empty array
    return [];
  }

  // Group events by contact
  const contactStatsMap = new Map<
    string,
    {
      contact_id: string;
      contact_name: string;
      completed: number;
      overdue: number;
      last_interaction: Date | null;
    }
  >();

  contactEvents?.forEach((event) => {
    const contactId = event.contact_id as string;
    if (!contactId) return;

    // Handle deleted contacts gracefully
    const contact = (event.contacts as { id: string; name: string } | null) || null;
    const contactName = contact?.name || "Unknown Contact";

    if (!contactStatsMap.has(contactId)) {
      contactStatsMap.set(contactId, {
        contact_id: contactId,
        contact_name: contactName,
        completed: 0,
        overdue: 0,
        last_interaction: null,
      });
    }

    const stats = contactStatsMap.get(contactId)!;
    if (event.event_type === "reminder_completed") {
      stats.completed++;
    } else if (event.event_type === "reminder_overdue") {
      stats.overdue++;
    }

    const eventDate = new Date(event.created_at);
    if (!stats.last_interaction || eventDate > stats.last_interaction) {
      stats.last_interaction = eventDate;
    }
  });

  // Get next scheduled follow-up for each contact
  const contactIds = Array.from(contactStatsMap.keys());
  if (contactIds.length === 0) {
    return [];
  }

  const { data: upcomingReminders } = await supabase
    .from("reminders")
    .select("id, contact_id, remind_at")
    .eq("user_id", userId)
    .in("contact_id", contactIds)
    .eq("status", "pending")
    .gte("remind_at", new Date().toISOString())
    .order("remind_at", { ascending: true })
    .limit(100); // Limit for high activity

  // Map upcoming reminders to contacts
  const upcomingMap = new Map<string, string>();
  upcomingReminders?.forEach((reminder) => {
    if (reminder.contact_id && !upcomingMap.has(reminder.contact_id)) {
      upcomingMap.set(reminder.contact_id, reminder.remind_at);
    }
  });

  // Convert to array and sort by activity (completed + overdue) or overdue risk
  const statsArray: PerContactStats[] = Array.from(contactStatsMap.values())
    .map((stats) => ({
      contact_id: stats.contact_id,
      contact_name: stats.contact_name,
      reminders_completed: stats.completed,
      reminders_overdue: stats.overdue,
      last_interaction_date: stats.last_interaction?.toISOString() || null,
      next_scheduled_followup: upcomingMap.get(stats.contact_id) || null,
    }))
    .sort((a, b) => {
      // Sort by overdue risk first, then by activity
      if (a.reminders_overdue !== b.reminders_overdue) {
        return b.reminders_overdue - a.reminders_overdue;
      }
      const aActivity = a.reminders_completed + a.reminders_overdue;
      const bActivity = b.reminders_completed + b.reminders_overdue;
      return bActivity - aActivity;
    })
    .slice(0, topN);

  return statsArray;
}

/**
 * Compute forward-looking stats
 */
export async function computeForwardLookingStats(
  userId: string,
  timezone: string
): Promise<ForwardLookingStats> {
  const supabase = createServiceClient();
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  // Upcoming reminders in next 7 days
  const { data: upcomingReminders, count: upcomingCount } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: false })
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("remind_at", now.toISOString())
    .lte("remind_at", nextWeek.toISOString());

  // Contacts with no follow-up scheduled
  const { data: allContacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId);

  const { data: contactsWithReminders } = await supabase
    .from("reminders")
    .select("contact_id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("remind_at", now.toISOString())
    .not("contact_id", "is", null);

  const contactIdsWithReminders = new Set(
    contactsWithReminders?.map((r) => r.contact_id).filter(Boolean) || []
  );
  const contactsWithoutFollowup =
    (allContacts?.length || 0) - contactIdsWithReminders.size;

  // Longest overdue reminder
  const { data: longestOverdue } = await supabase
    .from("reminders")
    .select("id, message, remind_at, contact_id, contacts:contact_id(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("remind_at", now.toISOString())
    .order("remind_at", { ascending: true })
    .limit(1)
    .single();

  let longestOverdueReminder = null;
  if (longestOverdue) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(longestOverdue.remind_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const contact = longestOverdue.contacts as { name: string } | null;
    longestOverdueReminder = {
      reminder_id: longestOverdue.id,
      message: longestOverdue.message,
      days_overdue: daysOverdue,
      contact_name: contact?.name || null,
    };
  }

  return {
    upcoming_reminders_next_7_days: upcomingCount || 0,
    contacts_with_no_followup_scheduled: Math.max(0, contactsWithoutFollowup),
    longest_overdue_reminder: longestOverdueReminder,
  };
}

/**
 * Compute complete digest stats (all-in-one function)
 */
export async function computeDigestStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  timezone: string,
  topNContacts: number = 5
): Promise<DigestStats | null> {
  try {
    const [overall, perContact, forwardLooking] = await Promise.all([
      computeWeeklyOverallStats(userId, weekStart, weekEnd, timezone),
      computePerContactStats(userId, weekStart, weekEnd, topNContacts),
      computeForwardLookingStats(userId, timezone),
    ]);

    return {
      overall,
      per_contact: perContact,
      forward_looking: forwardLooking,
      week_start: weekStart,
      week_end: weekEnd,
      timezone,
    };
  } catch (error) {
    console.error("Failed to compute digest stats:", error);
    return null;
  }
}

