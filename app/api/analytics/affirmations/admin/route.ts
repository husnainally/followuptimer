import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getAdminAffirmationAnalytics } from "@/lib/affirmation-analytics";

// GET /api/analytics/affirmations/admin?range=30d
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse range parameter (default: 30 days)
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") || "30d";
    const rangeDays = parseRange(rangeParam);

    const analytics = await getAdminAffirmationAnalytics(rangeDays);

    return NextResponse.json({
      success: true,
      range_days: rangeDays,
      analytics,
    });
  } catch (error: unknown) {
    console.error("Failed to get admin affirmation analytics:", error);
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
  if (!match) return 30; // Default to 30 days

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
      return 30;
  }
}

