import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  logEvent,
  queryEvents,
  type EventType,
  type EventData,
} from "@/lib/events";

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
    const { event_type, event_data, source, contact_id, reminder_id } = body;

    if (!event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      );
    }

    // Validate event_type
    const validEventTypes: EventType[] = [
      "reminder_created",
      "reminder_completed",
      "reminder_snoozed",
      "reminder_dismissed",
      "reminder_missed",
      "reminder_due",
      "reminder_scheduled",
      "task_completed",
      "popup_shown",
      "popup_action",
      "popup_dismissed",
      "popup_action_clicked",
      "popup_snoozed",
      "popup_expired",
      "inactivity_detected",
      "streak_achieved",
      "streak_incremented",
      "streak_broken",
      "follow_up_required",
      "email_opened",
      "no_reply_after_n_days",
      "linkedin_profile_viewed",
      "linkedin_message_sent",
      "affirmation_shown",
      "affirmation_suppressed",
      "affirmation_action_clicked",
      "snooze_suggested",
      "snooze_selected",
      "reminder_deferred_by_rule",
      "reminder_suppressed",
      "preference_changed",
      "snooze_cancelled",
      "suggestion_shown",
      "suggestion_clicked",
    ];

    if (!validEventTypes.includes(event_type as EventType)) {
      return NextResponse.json(
        {
          error: `Invalid event_type. Must be one of: ${validEventTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate source
    const validSources = [
      "app",
      "scheduler",
      "extension_gmail",
      "extension_linkedin",
    ];
    const eventSource = source || "app";
    if (!validSources.includes(eventSource)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate payload structure based on event type (basic validation)
    if (event_data && typeof event_data !== "object") {
      return NextResponse.json(
        { error: "event_data must be an object" },
        { status: 400 }
      );
    }

    const result = await logEvent({
      userId: user.id,
      eventType: event_type as EventType,
      eventData: (event_data || {}) as EventData,
      source: eventSource as
        | "app"
        | "scheduler"
        | "extension_gmail"
        | "extension_linkedin",
      contactId: contact_id || undefined,
      reminderId: reminder_id || undefined,
    });

    // Process event for triggers if successful
    if (result.success && result.eventId) {
      const { processEventForTriggers } = await import("@/lib/trigger-manager");
      await processEventForTriggers(
        user.id,
        event_type as EventType,
        result.eventId,
        event_data || {}
      );

      // Popup engine: create popup instances from triggerable events (rules-driven)
      const { createPopupsFromEvent } = await import("@/lib/popup-engine");
      await createPopupsFromEvent({
        userId: user.id,
        eventId: result.eventId,
        eventType: event_type as EventType,
        eventData: event_data || {},
        contactId: contact_id || undefined,
        reminderId: reminder_id || undefined,
      });
    }

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
