import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// POST /api/popups/[id]/action - Handle popup action (complete/snooze/follow-up)
export async function POST(
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
    const { action_type, action_data } = body;

    if (!action_type) {
      return NextResponse.json(
        { error: "action_type is required" },
        { status: 400 }
      );
    }

    // Get popup to verify ownership
    const { data: popup, error: fetchError } = await supabase
      .from("popups")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !popup) {
      return NextResponse.json(
        { error: "Popup not found" },
        { status: 404 }
      );
    }

    // Update popup status
    const { data: updatedPopup, error: updateError } = await supabase
      .from("popups")
      .update({
        status: "action_taken",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Record action
    const { error: actionError } = await supabase
      .from("popup_actions")
      .insert({
        popup_id: id,
        user_id: user.id,
        action_type,
        action_data: action_data || {},
      });

    if (actionError) throw actionError;

    // Log popup_action event
    await logEvent({
      userId: user.id,
      eventType: "popup_action",
      eventData: {
        popup_id: id,
        action_type,
        reminder_id: popup.reminder_id,
        ...(action_data || {}),
      },
    });

    // Handle action-specific logic
    if (action_type === "complete" && popup.reminder_id) {
      // Mark reminder as completed
      await supabase
        .from("reminders")
        .update({ status: "sent" })
        .eq("id", popup.reminder_id);

      // Log reminder_completed event
      const { data: reminder } = await supabase
        .from("reminders")
        .select("contact_id")
        .eq("id", popup.reminder_id)
        .single();

      const eventResult = await logEvent({
        userId: user.id,
        eventType: "reminder_completed",
        eventData: {
          reminder_id: popup.reminder_id,
        },
        source: "app",
        reminderId: popup.reminder_id,
        contactId: reminder?.contact_id || undefined,
      });

      // Update streak tracking (which will create streak_incremented trigger if needed)
      if (eventResult.success && popup.reminder_id) {
        const { updateStreakOnCompletion } = await import("@/lib/streak-tracking");
        await updateStreakOnCompletion(user.id, popup.reminder_id);
        
        // Also process the reminder_completed event for any other triggers
        const { processEventForTriggers } = await import("@/lib/trigger-manager");
        await processEventForTriggers(
          user.id,
          "reminder_completed",
          eventResult.eventId!,
          { reminder_id: popup.reminder_id }
        );
      }
    } else if (action_type === "snooze" && popup.reminder_id) {
      // Trigger snooze API
      const snoozeMinutes = action_data?.minutes || 10;
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/reminders/${popup.reminder_id}/snooze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes: snoozeMinutes }),
        }
      );
    }

    return NextResponse.json({
      success: true,
      popup: updatedPopup,
    });
  } catch (error: unknown) {
    console.error("Failed to handle popup action:", error);
    const message =
      error instanceof Error ? error.message : "Failed to handle popup action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

