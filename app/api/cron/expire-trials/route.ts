/**
 * Milestone 9: Trial Expiration Cron Job
 * Expires trials that have passed their end date
 * Should be called by a scheduled job (e.g., Vercel Cron, QStash)
 */

import { NextResponse } from "next/server";
import { getExpiredTrials, expireTrial } from "@/lib/trials";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * POST /api/cron/expire-trials
 * Expire all trials that have passed their end date
 * Protected by CRON_SECRET environment variable
 */
export async function POST(request: Request) {
  try {
    // Verify this is an internal request (from cron or with secret)
    // Support both Vercel cron (x-vercel-cron header) and custom auth (Authorization header)
    const vercelCronHeader = request.headers.get("x-vercel-cron");
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if it's from Vercel cron OR if secret matches (if secret is configured)
    const isVercelCron = vercelCronHeader === "1";
    const hasValidSecret = !cronSecret || authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !hasValidSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all expired trials
    const expiredUserIds = await getExpiredTrials();

    if (expiredUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired trials found",
        expired_count: 0,
      });
    }

    // Expire each trial
    const results = await Promise.allSettled(
      expiredUserIds.map((userId) => expireTrial(userId))
    );

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - succeeded;

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredUserIds.length} expired trials`,
      expired_count: expiredUserIds.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("Failed to expire trials:", error);
    return NextResponse.json(
      { error: "Failed to expire trials" },
      { status: 500 }
    );
  }
}

