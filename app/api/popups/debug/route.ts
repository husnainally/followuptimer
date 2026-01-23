import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRecentPopupBlocks,
  getPopupCreationStats,
} from "@/lib/popup-debug";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/popups/debug
 * Returns popup creation statistics and recent blocks for debugging
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const blockLimit = parseInt(searchParams.get("block_limit") || "50", 10);

    // Get stats and recent blocks in parallel
    const [statsResult, blocksResult] = await Promise.all([
      getPopupCreationStats(user.id, hours),
      getRecentPopupBlocks(user.id, blockLimit),
    ]);

    if (!statsResult.success) {
      return NextResponse.json(
        { error: statsResult.error || "Failed to get stats" },
        { status: 500 }
      );
    }

    if (!blocksResult.success) {
      return NextResponse.json(
        { error: blocksResult.error || "Failed to get blocks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: statsResult.stats,
      recent_blocks: blocksResult.blocks,
      timeframe_hours: hours,
    });
  } catch (error) {
    console.error("Failed to get popup debug info:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get debug info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
