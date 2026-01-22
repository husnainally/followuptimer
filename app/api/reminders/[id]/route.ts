import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cancelScheduledReminder, scheduleReminder } from "@/lib/qstash";
import { processReminder } from "@/app/api/reminders/process-overdue/route";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requires this)
    const { id } = await params;
    
    if (!id) {
      console.error("GET /api/reminders/[id]: Missing reminder ID");
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }

    console.log("GET /api/reminders/[id]: Fetching reminder", { reminderId: id });

    const supabase = await createClient();
    
    if (!supabase) {
      console.error("GET /api/reminders/[id]: Failed to create Supabase client");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("GET /api/reminders/[id]: Auth error", authError);
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("GET /api/reminders/[id]: No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("GET /api/reminders/[id]: User authenticated", { userId: user.id });

    const { data: reminder, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("GET /api/reminders/[id]: Database error", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        reminderId: id,
        userId: user.id,
      });
      
      // Handle specific Supabase error codes
      if (error.code === "PGRST116") {
        // No rows returned
        console.warn("GET /api/reminders/[id]: Reminder not found (PGRST116)", {
          reminderId: id,
          userId: user.id,
        });
        return NextResponse.json(
          { error: "Reminder not found" },
          { status: 404 }
        );
      }
      
      throw error;
    }

    if (!reminder) {
      console.warn("GET /api/reminders/[id]: Reminder not found", {
        reminderId: id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    console.log("GET /api/reminders/[id]: Success", { reminderId: id });
    return NextResponse.json({ reminder });
  } catch (error: unknown) {
    console.error("GET /api/reminders/[id]: Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    const message =
      error instanceof Error ? error.message : "Failed to fetch reminder";
    
    return NextResponse.json(
      { 
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.stack : String(error)
        })
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      message, 
      remind_at, 
      tone, 
      notification_method, 
      status,
      linked_entities,
      last_interaction_at,
      completion_context
    } = body;

    const updates: any = {};
    if (message !== undefined) updates.message = message;
    if (remind_at !== undefined) updates.remind_at = remind_at;
    if (tone !== undefined) updates.tone = tone;
    if (notification_method !== undefined)
      updates.notification_method = notification_method;
    if (status !== undefined) updates.status = status;
    
    // Handle new fields
    if (linked_entities !== undefined) {
      if (Array.isArray(linked_entities)) {
        updates.linked_entities = linked_entities.length > 0 ? linked_entities : null;
      } else if (typeof linked_entities === "string") {
        try {
          const parsed = JSON.parse(linked_entities);
          updates.linked_entities = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
        } catch {
          updates.linked_entities = null;
        }
      } else {
        updates.linked_entities = null;
      }
    }
    if (last_interaction_at !== undefined) updates.last_interaction_at = last_interaction_at || null;
    if (completion_context !== undefined) updates.completion_context = completion_context?.trim() || null;

    // Get the original reminder to compare remind_at if it's being updated
    let originalReminder = null;
    if (remind_at !== undefined) {
      const { data: original } = await supabase
        .from("reminders")
        .select("remind_at, status, contact_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      originalReminder = original;
    }

    const { data: reminder, error } = await supabase
      .from("reminders")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Log reminder_updated event
    const eventResult = await logEvent({
      userId: user.id,
      eventType: "reminder_updated",
      eventData: {
        reminder_id: reminder.id,
        updated_fields: Object.keys(updates),
        tone: reminder.tone,
        notification_method: reminder.notification_method,
        remind_at: reminder.remind_at,
        original_remind_at: originalReminder?.remind_at || undefined,
      },
      source: "app",
      reminderId: reminder.id,
      contactId: reminder.contact_id || undefined,
    });

    // Create popups from reminder_updated event
    if (eventResult.success && eventResult.eventId) {
      try {
        const { processEventForTriggers } = await import("@/lib/trigger-manager");
        await processEventForTriggers(
          user.id,
          "reminder_updated",
          eventResult.eventId,
          { reminder_id: reminder.id }
        );

        const { createPopupsFromEvent } = await import("@/lib/popup-engine");
        await createPopupsFromEvent({
          userId: user.id,
          eventId: eventResult.eventId,
          eventType: "reminder_updated",
          eventData: {
            reminder_id: reminder.id,
            message: reminder.message,
            remind_at: reminder.remind_at,
            notification_method: reminder.notification_method,
            updated_fields: Object.keys(updates),
          },
          contactId: reminder.contact_id || undefined,
          reminderId: reminder.id,
        });
      } catch (popupError) {
        // Log but don't fail - popup creation is non-critical
        console.warn(
          "[Reminder Update] Failed to create popup from reminder_updated event:",
          popupError
        );
      }
    }

    // Check if reminder should be processed immediately
    // If remind_at was updated and the new time is in the past or within 5 seconds
    if (
      remind_at !== undefined &&
      reminder.status !== "sent" &&
      reminder.status !== "completed"
    ) {
      const newRemindAt = new Date(reminder.remind_at);
      const now = new Date();
      const fiveSecondsFromNow = new Date(now.getTime() + 5 * 1000);

      // If the reminder time is in the past or within 5 seconds, process immediately
      if (newRemindAt <= fiveSecondsFromNow) {
        // Ensure status is pending before processing
        if (reminder.status !== "pending") {
          await supabase
            .from("reminders")
            .update({ status: "pending" })
            .eq("id", reminder.id)
            .eq("user_id", user.id);
        }

        // Process the reminder immediately (non-blocking)
        processReminder(reminder.id).catch((error) => {
          console.error(
            "[Reminder Update] Failed to process reminder immediately:",
            error
          );
        });
      }
    }

    // Update QStash job if remind_at changed
    const isLocalDev = process.env.NODE_ENV === "development";
    const isLocalQStash =
      process.env.QSTASH_URL?.includes("127.0.0.1") ||
      process.env.QSTASH_URL?.includes("localhost");

    const appUrl =
      isLocalDev && isLocalQStash
        ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL;

    // Only reschedule if remind_at changed and reminder is not completed/sent
    if (
      remind_at !== undefined &&
      process.env.QSTASH_TOKEN &&
      appUrl &&
      reminder.status !== "sent" &&
      reminder.status !== "completed"
    ) {
      try {
        const newRemindAt = new Date(reminder.remind_at);
        const now = new Date();
        
        // Only schedule if the time is in the future
        if (newRemindAt > now) {
          // Cancel existing job if it exists
          if (reminder.qstash_message_id) {
            await cancelScheduledReminder(reminder.qstash_message_id).catch(
              (err) => {
                console.warn("Failed to cancel existing QStash job:", err);
                // Continue anyway - we'll create a new one
              }
            );
          }
          
          // Schedule new job
          const newQstashMessageId = await scheduleReminder({
            reminderId: reminder.id,
            remindAt: newRemindAt,
            callbackUrl: `${appUrl}/api/reminders/send`,
          });
          
          // Update reminder with new QStash message ID
          await supabase
            .from("reminders")
            .update({ qstash_message_id: newQstashMessageId })
            .eq("id", reminder.id)
            .eq("user_id", user.id);
        } else {
          console.warn(
            `Cannot schedule reminder in the past: ${newRemindAt.toISOString()}`
          );
        }
      } catch (qstashError) {
        console.error("QStash rescheduling failed (non-fatal):", qstashError);
        // Don't throw - allow the reminder update to succeed even if QStash fails
        // The reminder will still be updated in the database
      }
    }

    return NextResponse.json({ reminder });
  } catch (error: unknown) {
    console.error("Failed to update reminder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get reminder first to access qstash_message_id
    const { data: reminder } = await supabase
      .from("reminders")
      .select("qstash_message_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    // Cancel QStash job if exists (only in production)
    if (reminder?.qstash_message_id && process.env.QSTASH_TOKEN) {
      try {
        await cancelScheduledReminder(reminder.qstash_message_id);
      } catch (qstashError) {
        console.error("QStash cancellation failed (non-fatal):", qstashError);
      }
    }

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete reminder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
