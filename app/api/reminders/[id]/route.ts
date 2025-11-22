import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cancelScheduledReminder, scheduleReminder } from "@/lib/qstash";

export async function GET(
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

    const { data: reminder, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reminder });
  } catch (error: unknown) {
    console.error("Failed to fetch reminder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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
    const { message, remind_at, tone, notification_method, status } = body;

    const updates: any = {};
    if (message !== undefined) updates.message = message;
    if (remind_at !== undefined) updates.remind_at = remind_at;
    if (tone !== undefined) updates.tone = tone;
    if (notification_method !== undefined)
      updates.notification_method = notification_method;
    if (status !== undefined) updates.status = status;

    const { data: reminder, error } = await supabase
      .from("reminders")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Update QStash job if remind_at changed
    const isLocalDev = process.env.NODE_ENV === "development";
    const isLocalQStash =
      process.env.QSTASH_URL?.includes("127.0.0.1") ||
      process.env.QSTASH_URL?.includes("localhost");

    const appUrl =
      isLocalDev && isLocalQStash
        ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL;

    if (
      remind_at !== undefined &&
      reminder.qstash_message_id &&
      process.env.QSTASH_TOKEN &&
      appUrl
    ) {
      try {
        await cancelScheduledReminder(reminder.qstash_message_id);
        const newQstashMessageId = await scheduleReminder({
          reminderId: reminder.id,
          remindAt: new Date(reminder.remind_at),
          callbackUrl: `${appUrl}/api/reminders/send`,
        });
        await supabase
          .from("reminders")
          .update({ qstash_message_id: newQstashMessageId })
          .eq("id", reminder.id);
      } catch (qstashError) {
        console.error("QStash rescheduling failed (non-fatal):", qstashError);
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
