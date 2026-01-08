import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";
import { processEventForTriggers } from "@/lib/trigger-manager";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * POST /api/events/check-inactivity
 * Scheduled endpoint to check for user inactivity and log inactivity_detected events
 * Should be called by a cron job or scheduler
 */
export async function POST(request: Request) {
  try {
    // Verify this is an internal request (from cron or with secret)
    // Vercel automatically adds CRON_SECRET to Authorization header
    // Also support x-vercel-cron header and custom INACTIVITY_CRON_SECRET
    const vercelCronHeader = request.headers.get("x-vercel-cron");
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const expectedSecret = process.env.INACTIVITY_CRON_SECRET;

    // Allow if:
    // 1. It's from Vercel cron (x-vercel-cron header), OR
    // 2. Authorization matches CRON_SECRET (Vercel's automatic header), OR
    // 3. Authorization matches INACTIVITY_CRON_SECRET (custom secret), OR
    // 4. No secrets configured (development mode)
    const isVercelCron = vercelCronHeader === "1";
    const hasVercelSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const hasCustomSecret = expectedSecret && authHeader === `Bearer ${expectedSecret}`;
    const noSecretsConfigured = !cronSecret && !expectedSecret;

    if (!isVercelCron && !hasVercelSecret && !hasCustomSecret && !noSecretsConfigured) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      throw usersError;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: "No users found",
        processed: 0,
      });
    }

    let processed = 0;
    let errors = 0;

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
            processed++;
          } else {
            errors++;
            console.error(`Failed to log inactivity event for user ${user.id}`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`Error processing inactivity for user ${user.id}:`, error);
      }
    }

    return NextResponse.json({
      message: "Inactivity check completed",
      total: users.length,
      processed,
      errors,
    });
  } catch (error: unknown) {
    console.error("Failed to check inactivity:", error);
    const message =
      error instanceof Error ? error.message : "Failed to check inactivity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

