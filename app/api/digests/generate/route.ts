import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getUsersForWeeklyDigest,
  generateWeeklyStats,
  wasDigestSent,
  markDigestAsSent,
} from "@/lib/weekly-digest";
import { sendWeeklyDigestEmail } from "@/lib/weekly-digest-email";

// POST /api/digests/generate - Generate and send weekly digests (called by cron)
export async function POST(request: Request) {
  try {
    // Verify this is an internal request (from cron or with secret)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.DIGEST_CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await getUsersForWeeklyDigest();

    if (users.length === 0) {
      return NextResponse.json({
        message: "No users to send digests to",
        sent: 0,
      });
    }

    // Calculate week range (last 7 days)
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Check if already sent
        if (await wasDigestSent(user.id, weekStart)) {
          console.log(`Digest already sent for user ${user.id}`);
          continue;
        }

        // Generate stats
        const stats = await generateWeeklyStats(user.id, weekStart, weekEnd);

        if (!stats) {
          console.error(`Failed to generate stats for user ${user.id}`);
          errorCount++;
          continue;
        }

        // Send email
        const result = await sendWeeklyDigestEmail(user.email, stats);

        if (result.success) {
          // Mark as sent
          await markDigestAsSent(user.id, weekStart, weekEnd, stats);
          sentCount++;
          console.log(`Digest sent to ${user.email}`);
        } else {
          console.error(
            `Failed to send digest to ${user.email}:`,
            result.error
          );
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing digest for user ${user.id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      message: "Digest generation completed",
      total: users.length,
      sent: sentCount,
      errors: errorCount,
    });
  } catch (error: unknown) {
    console.error("Failed to generate digests:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate digests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
