import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// POST /api/popups/[id]/displayed - Mark popup as displayed
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

    // Only transition from queued/pending to displayed
    if (popup.status !== "queued" && popup.status !== "pending") {
      return NextResponse.json(
        { error: "Popup already displayed or processed", popup },
        { status: 400 }
      );
    }

    // Update popup status to displayed
    const { data: updatedPopup, error: updateError } = await supabase
      .from("popups")
      .update({
        status: "displayed",
        displayed_at: new Date().toISOString(),
        shown_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log popup_shown event
    await logEvent({
      userId: user.id,
      eventType: "popup_shown",
      eventData: {
        popup_id: id,
        rule_id: updatedPopup.rule_id || undefined,
        source_event_id: updatedPopup.source_event_id || undefined,
        template_key:
          typeof updatedPopup.payload === "object" && updatedPopup.payload !== null
            ? (updatedPopup.payload as Record<string, unknown>).template_key
            : undefined,
      },
      source: "app",
      contactId: updatedPopup.contact_id || undefined,
      reminderId: updatedPopup.reminder_id || undefined,
      useServiceClient: true,
    });

    return NextResponse.json({
      success: true,
      popup: updatedPopup,
    });
  } catch (error: unknown) {
    console.error("Failed to mark popup as displayed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to mark popup as displayed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

