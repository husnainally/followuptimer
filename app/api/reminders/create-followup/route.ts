import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultFollowupDate } from "@/lib/followup-creation";
import { getUserPreferences } from "@/lib/user-preferences";
import { scheduleReminder } from "@/lib/qstash";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// POST /api/reminders/create-followup - Create follow-up reminder from completed reminder
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
    const { original_reminder_id, suggested_date, message, contact_id } = body;

    if (!original_reminder_id) {
      return NextResponse.json(
        { error: "original_reminder_id is required" },
        { status: 400 }
      );
    }

    // Get original reminder
    const { data: originalReminder, error: reminderError } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", original_reminder_id)
      .eq("user_id", user.id)
      .single();

    if (reminderError || !originalReminder) {
      return NextResponse.json(
        { error: "Original reminder not found" },
        { status: 404 }
      );
    }

    // Get user preferences and profile
    const userPrefs = await getUserPreferences(user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();

    const timezone = profile?.timezone || "UTC";

    // Calculate follow-up date
    let followupDate: Date;
    if (suggested_date) {
      followupDate = new Date(suggested_date);
    } else {
      followupDate = await getDefaultFollowupDate(user.id, new Date(), timezone);
    }

    // Create follow-up reminder
    const followupMessage = message || originalReminder.message;

    const { data: newReminder, error: createError } = await supabase
      .from("reminders")
      .insert({
        user_id: user.id,
        message: followupMessage,
        remind_at: followupDate.toISOString(),
        notification_method: originalReminder.notification_method || "email",
        status: "pending",
        affirmation_enabled: originalReminder.affirmation_enabled !== false,
        contact_id: contact_id || originalReminder.contact_id || null,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Schedule QStash job
    const isLocalDev = process.env.NODE_ENV === "development";
    const isLocalQStash =
      process.env.QSTASH_URL?.includes("127.0.0.1") ||
      process.env.QSTASH_URL?.includes("localhost");

    if (!isLocalDev || isLocalQStash) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await scheduleReminder({
        reminderId: newReminder.id,
        remindAt: followupDate,
        callbackUrl: `${appUrl}/api/reminders/send`,
      });
    }

    // Log reminder_created event
    await logEvent({
      userId: user.id,
      eventType: "reminder_created",
      eventData: {
        reminder_id: newReminder.id,
        notification_method: newReminder.notification_method,
        remind_at: newReminder.remind_at,
        is_followup: true,
        original_reminder_id: original_reminder_id,
      },
      source: "app",
      reminderId: newReminder.id,
      contactId: newReminder.contact_id || undefined,
    });

    return NextResponse.json({
      success: true,
      reminder: newReminder,
    });
  } catch (error: unknown) {
    console.error("Failed to create follow-up:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create follow-up";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

