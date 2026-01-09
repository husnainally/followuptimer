import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getRecommendedSnooze } from "@/lib/smart-snooze-engine";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


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
    const eventType = searchParams.get("event_type");

    // Get reminder details if reminderId is provided
    let contactId: string | null = null;
    let message: string | undefined = undefined;
    if (reminderId) {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const serviceSupabase = createServiceClient();
      const { data: reminder } = await serviceSupabase
        .from("reminders")
        .select("contact_id, message")
        .eq("id", reminderId)
        .single();
      if (reminder) {
        contactId = reminder.contact_id;
        message = reminder.message;
      }
    }

    // Determine engagement signal from event type
    let engagementSignal:
      | "email_opened"
      | "no_reply"
      | "reminder_due"
      | undefined;
    if (eventType === "email_opened") {
      engagementSignal = "email_opened";
    } else if (eventType === "no_reply_after_n_days") {
      engagementSignal = "no_reply";
    } else if (eventType === "reminder_due") {
      engagementSignal = "reminder_due";
    }

    const result = await getRecommendedSnooze(
      user.id,
      reminderId || undefined,
      {
        eventType: eventType || undefined,
        reminderId: reminderId || undefined,
        engagementSignal,
      },
      contactId,
      message
    );

    if (!result) {
      return NextResponse.json({
        candidates: [],
        context: {},
        message: "No snooze suggestions available",
      });
    }

    return NextResponse.json({
      candidates: result.candidates,
      context: result.context,
    });
  } catch (error: unknown) {
    console.error("Failed to get snooze suggestions:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get snooze suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
