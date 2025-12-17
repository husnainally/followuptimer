import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent, queryEvents, type EventType, type EventData } from "@/lib/events";

// POST /api/events - Log a behaviour event
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
    const { event_type, event_data } = body;

    if (!event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      );
    }

    const result = await logEvent({
      userId: user.id,
      eventType: event_type as EventType,
      eventData: (event_data || {}) as EventData,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to log event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
    });
  } catch (error: unknown) {
    console.error("Failed to log event:", error);
    const message =
      error instanceof Error ? error.message : "Failed to log event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/events - Query events with filters
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event_type") as EventType | null;
    const startDate = searchParams.get("start_date")
      ? new Date(searchParams.get("start_date")!)
      : undefined;
    const endDate = searchParams.get("end_date")
      ? new Date(searchParams.get("end_date")!)
      : undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const result = await queryEvents({
      userId: user.id,
      eventType: eventType || undefined,
      startDate,
      endDate,
      limit,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to query events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: result.events,
    });
  } catch (error: unknown) {
    console.error("Failed to query events:", error);
    const message =
      error instanceof Error ? error.message : "Failed to query events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

