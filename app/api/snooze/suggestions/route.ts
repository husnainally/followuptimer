import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSmartSnoozeSuggestion } from "@/lib/smart-snooze";

// GET /api/snooze/suggestions - Get smart snooze suggestions
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
    const reminderId = searchParams.get("reminder_id");

    const suggestion = await getSmartSnoozeSuggestion(
      user.id,
      reminderId || null
    );

    if (!suggestion) {
      return NextResponse.json({
        suggestion: null,
        message: "Smart snooze is disabled or unavailable",
      });
    }

    return NextResponse.json({
      suggestion,
    });
  } catch (error: unknown) {
    console.error("Failed to get snooze suggestion:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get snooze suggestion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

