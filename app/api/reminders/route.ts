import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { scheduleReminder } from "@/lib/qstash";
import { logEvent } from "@/lib/events";

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

    const { data: reminders, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("remind_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch reminders:", error);
      throw error;
    }

    return NextResponse.json({ reminders });
  } catch (error: unknown) {
    console.error("Failed to fetch reminders:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, remind_at, tone, notification_method, affirmation_enabled, contact_id } = body;

    // Validate required fields
    if (!message || !remind_at) {
      return NextResponse.json(
        { error: "Message and remind_at are required" },
        { status: 400 }
      );
    }

    const { data: reminder, error } = await supabase
      .from("reminders")
      .insert({
        user_id: user.id,
        message,
        remind_at,
        tone: tone || "motivational",
        notification_method: notification_method || "email",
        status: "pending",
        affirmation_enabled: affirmation_enabled !== undefined ? affirmation_enabled : true,
        contact_id: contact_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log reminder_created event
    const eventResult = await logEvent({
      userId: user.id,
      eventType: "reminder_created",
      eventData: {
        reminder_id: reminder.id,
        tone: reminder.tone,
        notification_method: reminder.notification_method,
        remind_at: reminder.remind_at,
      },
      source: "app",
      reminderId: reminder.id,
      contactId: body.contact_id || undefined,
    });

    // Process event for triggers (reminder_created doesn't create triggers, but process for consistency)
    if (eventResult.success && eventResult.eventId) {
      const { processEventForTriggers } = await import("@/lib/trigger-manager");
      await processEventForTriggers(
        user.id,
        "reminder_created",
        eventResult.eventId,
        { reminder_id: reminder.id }
      );
    }

    // Schedule QStash job (if QSTASH_TOKEN is configured)
    // In local development, use localhost URL; otherwise use configured app URL
    const isLocalDev = process.env.NODE_ENV === "development";
    const isLocalQStash =
      process.env.QSTASH_URL?.includes("127.0.0.1") ||
      process.env.QSTASH_URL?.includes("localhost");

    const appUrl =
      isLocalDev && isLocalQStash
        ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL;

    const remindAtDate = new Date(reminder.remind_at);
    const now = new Date();

    // Only schedule if time is in the future
    if (remindAtDate <= now) {
      console.warn("[QStash] Cannot schedule reminder in the past:", {
        reminderId: reminder.id,
        remindAt: reminder.remind_at,
        now: now.toISOString(),
      });
    } else if (process.env.QSTASH_TOKEN && appUrl) {
      try {
        console.log("[QStash] Scheduling reminder:", {
          reminderId: reminder.id,
          remindAt: reminder.remind_at,
          callbackUrl: `${appUrl}/api/reminders/send`,
          delaySeconds: Math.floor(
            (remindAtDate.getTime() - now.getTime()) / 1000
          ),
        });

        const qstashMessageId = await scheduleReminder({
          reminderId: reminder.id,
          remindAt: remindAtDate,
          callbackUrl: `${appUrl}/api/reminders/send`,
        });

        console.log("[QStash] Message scheduled successfully:", {
          messageId: qstashMessageId,
          reminderId: reminder.id,
        });

        await supabase
          .from("reminders")
          .update({ qstash_message_id: qstashMessageId })
          .eq("id", reminder.id);
      } catch (qstashError) {
        console.error("[QStash] Scheduling failed:", {
          error: qstashError,
          reminderId: reminder.id,
          remindAt: reminder.remind_at,
          appUrl,
        });
        // Continue anyway - reminder is created, just not scheduled
        // Update reminder status to indicate scheduling failed
        await supabase
          .from("reminders")
          .update({ status: "scheduling_failed" })
          .eq("id", reminder.id);
      }
    } else {
      const missing = [];
      if (!process.env.QSTASH_TOKEN) missing.push("QSTASH_TOKEN");
      if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");
      console.warn(
        "[QStash] Scheduling skipped - missing:",
        missing.join(", ")
      );
    }

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create reminder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
