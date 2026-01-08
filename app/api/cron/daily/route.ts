/**
 * Daily Cron Job - Combined endpoint for Hobby plan
 * Runs once per day and handles:
 * 1. Check inactivity
 * 2. Expire trials
 * 
 * This combines two jobs into one to stay within Hobby plan limit of 2 cron jobs
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logEvent } from "@/lib/events";
import { processEventForTriggers } from "@/lib/trigger-manager";
import { getExpiredTrials, expireTrial } from "@/lib/trials";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Verify this is an internal request (from cron or with secret)
    // Vercel automatically adds CRON_SECRET to Authorization header
    // Also support x-vercel-cron header as fallback
    const vercelCronHeader = request.headers.get("x-vercel-cron");
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if:
    // 1. It's from Vercel cron (x-vercel-cron header), OR
    // 2. Authorization matches CRON_SECRET (Vercel's automatic header), OR
    // 3. No secrets configured (development mode)
    const isVercelCron = vercelCronHeader === "1";
    const hasVercelSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const noSecretsConfigured = !cronSecret;

    if (!isVercelCron && !hasVercelSecret && !noSecretsConfigured) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      inactivity: { processed: 0, errors: 0 },
      trials: { expired: 0, succeeded: 0, failed: 0 },
    };

    // ============================================
    // 1. Check Inactivity
    // ============================================
    try {
      const supabase = createServiceClient();
      const now = new Date();

      // Configurable inactivity threshold (default 24 hours)
      const inactivityHours = parseInt(
        process.env.INACTIVITY_THRESHOLD_HOURS || "24",
        10
      );
      const thresholdTime = new Date(now.getTime() - inactivityHours * 60 * 60 * 1000);

      // Get all active users
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id");

      if (usersError) {
        console.error("Failed to fetch users:", usersError);
        results.inactivity.errors++;
      } else if (users && users.length > 0) {
        for (const user of users) {
          try {
            // Get user's last activity (any event)
            const { data: lastEvent } = await supabase
              .from("events")
              .select("created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            // If no events at all, skip (new user)
            if (!lastEvent) {
              continue;
            }

            const lastActivityTime = new Date(lastEvent.created_at);

            // Check if user is inactive (last activity before threshold)
            if (lastActivityTime < thresholdTime) {
              const hoursInactive = Math.floor(
                (now.getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60)
              );

              // Check if we already logged inactivity recently (within last 6 hours)
              const { data: recentInactivity } = await supabase
                .from("events")
                .select("id")
                .eq("user_id", user.id)
                .eq("event_type", "inactivity_detected")
                .gte("created_at", new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString())
                .limit(1)
                .single();

              // Skip if we already logged inactivity recently
              if (recentInactivity) {
                continue;
              }

              // Log inactivity_detected event
              const result = await logEvent({
                userId: user.id,
                eventType: "inactivity_detected",
                eventData: {
                  hours_inactive: hoursInactive,
                  last_activity: lastActivityTime.toISOString(),
                },
                source: "scheduler",
                useServiceClient: true,
              });

              if (result.success && result.eventId) {
                // Create trigger for inactivity popup
                await processEventForTriggers(
                  user.id,
                  "inactivity_detected",
                  result.eventId,
                  {
                    hours_inactive: hoursInactive,
                  }
                );
                results.inactivity.processed++;
              } else {
                results.inactivity.errors++;
                console.error(`Failed to log inactivity event for user ${user.id}`);
              }
            }
          } catch (error) {
            results.inactivity.errors++;
            console.error(`Error processing inactivity for user ${user.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to check inactivity:", error);
      results.inactivity.errors++;
    }

    // ============================================
    // 2. Expire Trials
    // ============================================
    try {
      // Get all expired trials
      const expiredUserIds = await getExpiredTrials();

      if (expiredUserIds.length > 0) {
        // Expire each trial
        const expireResults = await Promise.allSettled(
          expiredUserIds.map((userId) => expireTrial(userId))
        );

        results.trials.expired = expiredUserIds.length;
        results.trials.succeeded = expireResults.filter(
          (r) => r.status === "fulfilled" && r.value.success
        ).length;
        results.trials.failed = expireResults.length - results.trials.succeeded;
      }
    } catch (error) {
      console.error("Failed to expire trials:", error);
      results.trials.failed++;
    }

    return NextResponse.json({
      success: true,
      message: "Daily cron job completed",
      results: {
        inactivity: {
          processed: results.inactivity.processed,
          errors: results.inactivity.errors,
        },
        trials: {
          expired: results.trials.expired,
          succeeded: results.trials.succeeded,
          failed: results.trials.failed,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Failed to run daily cron job:", error);
    const message =
      error instanceof Error ? error.message : "Failed to run daily cron job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

