import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";
import { processEventForTriggers } from "@/lib/trigger-manager";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * POST /api/reminders/check-missed
 * Scheduled endpoint to check for missed reminders and log reminder_missed events
 * Should be called by a cron job or scheduler
 */
export async function POST(request: Request) {
  try {
    // Verify this is an internal request (from cron or with secret)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.MISSED_REMINDERS_CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const now = new Date();

    // Find reminders that are overdue (remind_at < now) and still pending
    const { data: missedReminders, error } = await supabase
      .from("reminders")
      .select("id, user_id, remind_at, message, contact_id")
      .eq("status", "pending")
      .lt("remind_at", now.toISOString());

    if (error) {
      console.error("Failed to fetch missed reminders:", error);
      throw error;
    }

    if (!missedReminders || missedReminders.length === 0) {
      return NextResponse.json({
        message: "No missed reminders found",
        processed: 0,
      });
    }

    let processed = 0;
    let errors = 0;

    for (const reminder of missedReminders) {
      try {
        // Calculate how many minutes/hours overdue
        const remindAt = new Date(reminder.remind_at);
        const minutesOverdue = Math.floor((now.getTime() - remindAt.getTime()) / (1000 * 60));

        // Check if we've already logged reminder_overdue for this reminder
        // (one-time per transition to overdue state)
        const { data: existingOverdue } = await supabase
          .from("events")
          .select("id")
          .eq("user_id", reminder.user_id)
          .eq("reminder_id", reminder.id)
          .eq("event_type", "reminder_overdue")
          .limit(1)
          .single();

        // Log reminder_overdue event (one-time per transition)
        if (!existingOverdue) {
          const overdueResult = await logEvent({
            userId: reminder.user_id,
            eventType: "reminder_overdue",
            eventData: {
              reminder_id: reminder.id,
              minutes_overdue: minutesOverdue,
              remind_at: reminder.remind_at,
              message: reminder.message,
              transition_time: now.toISOString(),
            },
            reminderId: reminder.id,
            contactId: reminder.contact_id || undefined,
            source: "scheduler",
            useServiceClient: true,
          });

          if (overdueResult.success && overdueResult.eventId) {
            // Process triggers for overdue reminder
            await processEventForTriggers(
              reminder.user_id,
              "reminder_overdue",
              overdueResult.eventId,
              {
                reminder_id: reminder.id,
                minutes_overdue: minutesOverdue,
              }
            );
          }
        }

        // Log reminder_missed event (for backward compatibility and popup triggers)
        const result = await logEvent({
          userId: reminder.user_id,
          eventType: "reminder_missed",
          eventData: {
            reminder_id: reminder.id,
            minutes_overdue: minutesOverdue,
            remind_at: reminder.remind_at,
            message: reminder.message,
          },
          reminderId: reminder.id,
          contactId: reminder.contact_id || undefined,
          source: "scheduler",
          useServiceClient: true,
        });

        if (result.success && result.eventId) {
          // Create trigger for missed reminder popup (using reminder_missed for backward compatibility)
          await processEventForTriggers(
            reminder.user_id,
            "reminder_missed",
            result.eventId,
            {
              reminder_id: reminder.id,
              minutes_overdue: minutesOverdue,
            }
          );
          processed++;
        } else {
          errors++;
          console.error(`Failed to log missed reminder event for reminder ${reminder.id}`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing missed reminder ${reminder.id}:`, error);
      }
    }

    return NextResponse.json({
      message: "Missed reminders check completed",
      total: missedReminders.length,
      processed,
      errors,
    });
  } catch (error: unknown) {
    console.error("Failed to check missed reminders:", error);
    const message =
      error instanceof Error ? error.message : "Failed to check missed reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

