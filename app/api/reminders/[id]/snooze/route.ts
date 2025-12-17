import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rescheduleReminder } from "@/lib/qstash";
import { logEvent } from "@/lib/events";
import { logSnooze } from "@/lib/smart-snooze";
import { processEventForTriggers } from "@/lib/trigger-manager";

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
    const { minutes = 10, is_smart_suggestion = false } = body; // Default to 10 minutes snooze

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

    // Calculate new remind_at time
    const currentTime = new Date(reminder.remind_at);
    const newTime = new Date(currentTime.getTime() + minutes * 60000);

    // Update reminder
    const { data: updatedReminder, error: updateError } = await supabase
      .from("reminders")
      .update({
        remind_at: newTime.toISOString(),
        status: "snoozed",
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log reminder_snoozed event
    const eventResult = await logEvent({
      userId: user.id,
      eventType: "reminder_snoozed",
      eventData: {
        reminder_id: id,
        duration_minutes: minutes,
        original_remind_at: reminder.remind_at,
        new_remind_at: newTime.toISOString(),
        is_smart_suggestion: is_smart_suggestion,
      },
      source: "app",
      reminderId: id,
      contactId: reminder.contact_id || undefined,
    });

    // Process event for triggers (repeated snooze detection)
    if (eventResult.success && eventResult.eventId) {
      await processEventForTriggers(
        user.id,
        "reminder_snoozed",
        eventResult.eventId,
        {
          reminder_id: id,
          duration_minutes: minutes,
        }
      );
    }

    // Log to snooze history
    await logSnooze(
      user.id,
      id,
      minutes,
      is_smart_suggestion ? "smart_suggestion" : "user_action"
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

    if (reminder.qstash_message_id && process.env.QSTASH_TOKEN && appUrl) {
      try {
        const newQstashMessageId = await rescheduleReminder(
          reminder.qstash_message_id,
          {
            reminderId: updatedReminder.id,
            remindAt: newTime,
            callbackUrl: `${appUrl}/api/reminders/send`,
          }
        );
        await supabase
          .from("reminders")
          .update({ qstash_message_id: newQstashMessageId })
          .eq("id", updatedReminder.id);
      } catch (qstashError) {
        console.error("QStash rescheduling failed (non-fatal):", qstashError);
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
