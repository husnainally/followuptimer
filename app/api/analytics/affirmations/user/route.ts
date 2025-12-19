import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserAffirmationAnalytics } from "@/lib/affirmation-analytics";

// GET /api/analytics/affirmations/user?range=7d
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse range parameter (default: 7 days)
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") || "7d";
    const rangeDays = parseRange(rangeParam);

    const analytics = await getUserAffirmationAnalytics(user.id, rangeDays);

    return NextResponse.json({
      success: true,
      range_days: rangeDays,
      analytics,
    });
  } catch (error: unknown) {
    console.error("Failed to get user affirmation analytics:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Parse range parameter (e.g., "7d" -> 7, "30d" -> 30, "1w" -> 7)
 */
function parseRange(range: string): number {
  const match = range.match(/^(\d+)([dwmy])$/);
  if (!match) return 7; // Default to 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value;
    case "w":
      return value * 7;
    case "m":
      return value * 30;
    case "y":
      return value * 365;
    default:
      return 7;
  }
}

