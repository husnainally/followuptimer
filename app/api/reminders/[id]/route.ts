import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cancelScheduledReminder, scheduleReminder } from "@/lib/qstash";

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
