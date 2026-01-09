import { createClient } from "@/lib/supabase/server";
import { getReminderAuditTimeline, getReminderSuppressionDetails } from "@/lib/trust-audit";
import { NextResponse } from "next/server";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


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

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch audit timeline with pagination
    const timelineResult = await getReminderAuditTimeline(
      user.id,
      id,
      limit,
      offset
    );

    // Fetch suppression details if any
    const suppressionDetails = await getReminderSuppressionDetails(user.id, id);

    return NextResponse.json({
      timeline: timelineResult.events,
      pagination: {
        hasMore: timelineResult.hasMore,
        total: timelineResult.total,
        limit,
        offset,
      },
      suppressionDetails,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch reminder audit:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch audit data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

