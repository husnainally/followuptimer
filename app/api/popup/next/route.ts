import { NextResponse } from "next/server";
import { getNextPopup } from "@/lib/popup-trigger";
import { createClient } from "@/lib/supabase/server";
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

// GET /popup/next - Get next eligible popup for user (aligned with requirements)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getNextPopup(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get popup" },
        { status: 500 }
      );
    }

    // Log lifecycle: POPUP_SHOWN when we transition to displayed
    if (result.popup && result.didTransition) {
      const popupId = typeof result.popup.id === "string" ? result.popup.id : null;
      await logEvent({
        userId: user.id,
        eventType: "popup_shown",
        eventData: {
          popup_id: popupId || undefined,
          rule_id: typeof result.popup.rule_id === "string" ? result.popup.rule_id : undefined,
          source_event_id:
            typeof result.popup.source_event_id === "string"
              ? result.popup.source_event_id
              : undefined,
          template_key:
            getStringFromRecord((result.popup as Record<string, unknown>).payload, "template_key"),
        },
        source: "app",
        contactId: typeof result.popup.contact_id === "string" ? result.popup.contact_id : undefined,
        reminderId:
          typeof result.popup.reminder_id === "string" ? result.popup.reminder_id : undefined,
        useServiceClient: true,
      });
    }

    return NextResponse.json({
      popup: result.popup,
    });
  } catch (error: unknown) {
    console.error("Failed to get popup:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get popup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

