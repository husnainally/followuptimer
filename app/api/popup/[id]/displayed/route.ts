import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStringFromUnknown(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function getStringFromRecord(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return getStringFromUnknown((obj as Record<string, unknown>)[key]);
}

// POST /popup/:id/displayed - Mark popup as displayed (aligned with requirements)
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
      return NextResponse.json({ error: "Popup not found" }, { status: 404 });
    }

    // Only transition if currently queued or pending
    if (popup.status !== "queued" && popup.status !== "pending") {
      return NextResponse.json({
        success: true,
        popup,
        message: "Popup already displayed or processed",
      });
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

    // Log popup_shown event if transition occurred
    await logEvent({
      userId: user.id,
      eventType: "popup_shown",
      eventData: {
        popup_id: id,
        rule_id: updatedPopup.rule_id || undefined,
        source_event_id: updatedPopup.source_event_id || undefined,
        template_key: getStringFromRecord(updatedPopup.payload, "template_key"),
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

