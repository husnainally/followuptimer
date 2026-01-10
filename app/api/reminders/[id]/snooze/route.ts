import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rescheduleReminder, scheduleReminder } from "@/lib/qstash";
import { logEvent } from "@/lib/events";
import { logSnooze } from "@/lib/smart-snooze";
import { processEventForTriggers } from "@/lib/trigger-manager";
import {
  getUserSnoozePreferences,
  adjustToWorkingHours,
  isWithinWorkingHours,
  isWithinQuietHours,
  isWeekend,
  countRemindersToday,
  getNextWorkingDay,
} from "@/lib/snooze-rules";
import { getUserPreferences } from "@/lib/user-preferences";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// Snooze a reminder by adding time to it
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      minutes,
      scheduled_time,
      is_smart_suggestion = false,
      candidate_type,
      was_recommended = false,
    } = body;

    // Get current reminder
    const { data: reminder, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) throw fetchError;

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Get user timezone and preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();

    const timezone = profile?.timezone || "UTC";
    const prefs = await getUserSnoozePreferences(user.id);
    const userPrefs = await getUserPreferences(user.id);

    // Calculate new remind_at time
    let newTime: Date;
    let originalTime: Date | null = null;
    let wasAdjusted = false;
    let adjustmentReason: "working_hours" | "quiet_hours" | "weekend" | "daily_cap" | null = null;

    if (scheduled_time) {
      // Use provided scheduled time
      newTime = new Date(scheduled_time);
      originalTime = new Date(newTime);
    } else if (minutes !== undefined) {
      // Calculate from minutes
      const currentTime = new Date(reminder.remind_at);
      newTime = new Date(currentTime.getTime() + minutes * 60000);
      originalTime = new Date(newTime);
    } else {
      // Use default snooze duration from preferences
      const defaultMinutes = userPrefs.default_snooze_minutes;
      const currentTime = new Date(reminder.remind_at);
      newTime = new Date(currentTime.getTime() + defaultMinutes * 60000);
      originalTime = new Date(newTime);
    }

    // Validate and adjust against user preferences
    const originalNewTime = new Date(newTime);

    // Check daily cap
    const todayCount = await countRemindersToday(user.id, timezone);
    if (todayCount >= prefs.max_reminders_per_day) {
      // Defer to next day
      newTime = getNextWorkingDay(newTime, prefs, timezone);
      const [startHour, startMin] = prefs.working_hours_start.split(":").map(Number);
      newTime.setHours(startHour, startMin, 0, 0);
      wasAdjusted = true;
      adjustmentReason = "daily_cap";
    }

    // Adjust for working hours, quiet hours, weekends
    if (!isWithinWorkingHours(newTime, prefs, timezone)) {
      newTime = adjustToWorkingHours(newTime, prefs, timezone);
      wasAdjusted = true;
      adjustmentReason = adjustmentReason || "working_hours";
    }

    if (isWithinQuietHours(newTime, prefs, timezone)) {
      newTime = adjustToWorkingHours(newTime, prefs, timezone);
      wasAdjusted = true;
      adjustmentReason = adjustmentReason || "quiet_hours";
    }

    // Only adjust for weekends if the day is NOT explicitly in working_days
    // If Saturday is in working_days, it should be allowed
    const newTimeInTZ = new Date(
      newTime.toLocaleString("en-US", { timeZone: timezone })
    );
    const newDayOfWeek = newTimeInTZ.getDay();
    
    if (!prefs.working_days.includes(newDayOfWeek) && !prefs.allow_weekends && isWeekend(newTime, timezone)) {
      newTime = getNextWorkingDay(newTime, prefs, timezone);
      const [startHour, startMin] = prefs.working_hours_start.split(":").map(Number);
      newTime.setHours(startHour, startMin, 0, 0);
      wasAdjusted = true;
      adjustmentReason = adjustmentReason || "weekend";
    }

    // Log reminder_deferred_by_rule if adjusted
    if (wasAdjusted && originalTime && adjustmentReason) {
      await logEvent({
        userId: user.id,
        eventType: "reminder_deferred_by_rule",
        eventData: {
          reminder_id: id,
          original_time: originalTime.toISOString(),
          adjusted_time: newTime.toISOString(),
          reason: adjustmentReason,
        },
        source: "app",
        reminderId: id,
        contactId: reminder.contact_id || undefined,
        useServiceClient: true,
      });
    }

    // Log snooze_selected event
    await logEvent({
      userId: user.id,
      eventType: "snooze_selected",
      eventData: {
        reminder_id: id,
        selected_type: candidate_type || "manual",
        scheduled_time: newTime.toISOString(),
        was_recommended: was_recommended,
        was_adjusted: wasAdjusted,
      },
      source: "app",
      reminderId: id,
      contactId: reminder.contact_id || undefined,
      useServiceClient: true,
    });

    // Calculate minutes for logging
    const calculatedMinutes = Math.round(
      (newTime.getTime() - new Date(reminder.remind_at).getTime()) / 60000
    );

    // Determine status: if rescheduled to future, set to "pending", otherwise keep as "snoozed"
    // If the new time is in the future, it should be "pending" (ready to be sent)
    // If the new time is in the past or same as now, keep as "snoozed" (temporary delay)
    const now = new Date();
    const shouldBePending = newTime > now;

    // Update reminder
    const { data: updatedReminder, error: updateError } = await supabase
      .from("reminders")
      .update({
        remind_at: newTime.toISOString(),
        status: shouldBePending ? "pending" : "snoozed",
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log reminder_snoozed event (this appears in history)
    const eventResult = await logEvent({
      userId: user.id,
      eventType: "reminder_snoozed",
      eventData: {
        reminder_id: id,
        duration_minutes: calculatedMinutes,
        original_remind_at: reminder.remind_at,
        new_remind_at: newTime.toISOString(),
        is_smart_suggestion: is_smart_suggestion,
        was_adjusted: wasAdjusted,
        adjustment_reason: adjustmentReason,
        scheduled_time: newTime.toISOString(),
        status_changed_to: shouldBePending ? "pending" : "snoozed",
      },
      source: "app",
      reminderId: id,
      contactId: reminder.contact_id || undefined,
      useServiceClient: true, // Ensure event is saved properly
    });

    // Process event for triggers (repeated snooze detection)
    if (eventResult.success && eventResult.eventId) {
      await processEventForTriggers(
        user.id,
        "reminder_snoozed",
        eventResult.eventId,
        {
          reminder_id: id,
          duration_minutes: calculatedMinutes,
        }
      );
    }

    // Log to snooze history
    await logSnooze(
      user.id,
      id,
      calculatedMinutes,
      is_smart_suggestion ? "smart_suggestion" : "user_action",
      {
        candidate_type: candidate_type,
        was_recommended: was_recommended,
        was_adjusted: wasAdjusted,
        adjustment_reason: adjustmentReason,
      }
    );

    // Reschedule QStash job (works in local and production)
    const isLocalDev = process.env.NODE_ENV === "development";
    const isLocalQStash =
      process.env.QSTASH_URL?.includes("127.0.0.1") ||
      process.env.QSTASH_URL?.includes("localhost");

    const appUrl =
      isLocalDev && isLocalQStash
        ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL;

    // Schedule or reschedule QStash job if reminder is not completed
    if (process.env.QSTASH_TOKEN && appUrl && updatedReminder.status !== "sent" && updatedReminder.status !== "completed") {
      try {
        const now = new Date();
        
        // Only schedule if the new time is in the future
        if (newTime > now) {
          let newQstashMessageId: string;
          
          if (reminder.qstash_message_id) {
            // Reschedule existing job
            newQstashMessageId = await rescheduleReminder(
              reminder.qstash_message_id,
              {
                reminderId: updatedReminder.id,
                remindAt: newTime,
                callbackUrl: `${appUrl}/api/reminders/send`,
              }
            );
          } else {
            // Schedule new job if one doesn't exist
            newQstashMessageId = await scheduleReminder({
              reminderId: updatedReminder.id,
              remindAt: newTime,
              callbackUrl: `${appUrl}/api/reminders/send`,
            });
          }
          
          // Update reminder with QStash message ID
          await supabase
            .from("reminders")
            .update({ qstash_message_id: newQstashMessageId })
            .eq("id", updatedReminder.id)
            .eq("user_id", user.id);
        } else {
          console.warn(
            `Cannot schedule snoozed reminder in the past: ${newTime.toISOString()}`
          );
        }
      } catch (qstashError) {
        console.error("QStash scheduling/rescheduling failed (non-fatal):", qstashError);
        // Don't throw - allow the snooze to succeed even if QStash fails
        // The reminder will still be updated in the database
      }
    }

    return NextResponse.json({ reminder: updatedReminder });
  } catch (error: unknown) {
    console.error("Failed to snooze reminder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to snooze reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
