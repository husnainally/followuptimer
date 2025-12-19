import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// POST /api/popups/[id]/dismiss - Dismiss popup
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

    // Update popup status to dismissed
    const { data: updatedPopup, error: updateError } = await supabase
      .from("popups")
      .update({
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
        closed_at: new Date().toISOString(),
        action_taken: "DISMISS",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    await logEvent({
      userId: user.id,
      eventType: "popup_dismissed",
      eventData: {
        popup_id: id,
        rule_id: updatedPopup.rule_id || undefined,
        source_event_id: updatedPopup.source_event_id || undefined,
      },
      source: "app",
      contactId: updatedPopup.contact_id || undefined,
      reminderId: updatedPopup.reminder_id || undefined,
      useServiceClient: true,
    });

    // If popup had snooze options available, log snooze_cancelled
    if (updatedPopup.reminder_id && updatedPopup.status === "dismissed") {
      await logEvent({
        userId: user.id,
        eventType: "snooze_cancelled",
        eventData: {
          popup_id: id,
          reminder_id: updatedPopup.reminder_id,
          action: "dismissed",
        },
        source: "app",
        reminderId: updatedPopup.reminder_id,
        useServiceClient: true,
      });
    }

    return NextResponse.json({
      success: true,
      popup: updatedPopup,
    });
  } catch (error: unknown) {
    console.error("Failed to dismiss popup:", error);
    const message =
      error instanceof Error ? error.message : "Failed to dismiss popup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

