import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getNextPopup, createPopup, type PopupTemplateType } from "@/lib/popup-trigger";

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

