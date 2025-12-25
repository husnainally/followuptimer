import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch events related to this contact
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(
        `
        id,
        event_type,
        created_at,
        reminder_id,
        reminders:reminder_id (
          id,
          message,
          status
        )
      `
      )
      .eq("user_id", user.id)
      .eq("contact_id", id)
      .in("event_type", [
        "reminder_created",
        "reminder_completed",
        "reminder_snoozed",
        "reminder_triggered",
      ])
      .order("created_at", { ascending: false })
      .limit(20);

    if (eventsError) throw eventsError;

    // Transform events to include reminder data
    const transformedEvents = (events || []).map((event: any) => ({
      id: event.id,
      event_type: event.event_type,
      created_at: event.created_at,
      reminder_id: event.reminder_id,
      reminder: event.reminders
        ? {
            message: event.reminders.message,
            status: event.reminders.status,
          }
        : null,
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error: unknown) {
    console.error("Failed to fetch contact history:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch contact history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

