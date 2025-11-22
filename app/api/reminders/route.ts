import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { scheduleReminder } from "@/lib/qstash";

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
    const { message, remind_at, tone, notification_method } = body;

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
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule QStash job (if QSTASH_TOKEN is configured)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
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
