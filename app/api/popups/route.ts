import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getNextPopup, createPopup, type PopupTemplateType } from "@/lib/popup-trigger";
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

// GET /api/popups - Get pending popups for user
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

// POST /api/popups - Create popup
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
    const {
      template_type,
      title,
      message,
      affirmation,
      priority,
      reminder_id,
      action_data,
    } = body;

    if (!template_type || !title || !message) {
      return NextResponse.json(
        { error: "template_type, title, and message are required" },
        { status: 400 }
      );
    }

    const result = await createPopup({
      userId: user.id,
      templateType: template_type as PopupTemplateType,
      title,
      message,
      affirmation,
      priority: priority || 5,
      reminderId: reminder_id,
      actionData: action_data || {},
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create popup" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      popupId: result.popupId,
    });
  } catch (error: unknown) {
    console.error("Failed to create popup:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create popup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

