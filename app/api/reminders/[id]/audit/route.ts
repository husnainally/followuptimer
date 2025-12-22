import { createClient } from "@/lib/supabase/server";
import { getReminderAuditTimeline, getReminderSuppressionDetails } from "@/lib/trust-audit";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch audit timeline
    const timeline = await getReminderAuditTimeline(user.id, id);

    // Fetch suppression details if any
    const suppressionDetails = await getReminderSuppressionDetails(user.id, id);

    return NextResponse.json({
      timeline,
      suppressionDetails,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch reminder audit:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch audit data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

