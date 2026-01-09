/**
 * Daily Cron Job - Combined endpoint for Hobby plan
 * Runs once per day and handles:
 * 1. Check inactivity
 * 2. Expire trials
 * 3. Generate weekly digests
 * 
 * This combines multiple jobs into one to stay within Hobby plan limit of 2 cron jobs
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logEvent } from "@/lib/events";
import { processEventForTriggers } from "@/lib/trigger-manager";
import { getExpiredTrials, expireTrial } from "@/lib/trials";
import { getUsersDueForDigest } from "@/lib/digest-scheduler";
import { computeDigestStats } from "@/lib/digest-stats";
import { selectDigestVariant } from "@/lib/digest-variant-selector";
import { renderDigestTemplate } from "@/lib/digest-templates";
import { Resend } from "resend";
import { createInAppNotification } from "@/lib/in-app-notification";
import { getUserPreferences } from "@/lib/user-preferences";
import { getToneSubject } from "@/lib/tone-system";
import { getUserWeekBoundaries, generateDedupeKey, wasDigestSentThisWeek, isUserEligibleForDigest } from "@/lib/digest-scheduler";

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
      digests: { sent: 0, errors: 0, skipped: 0 },
    };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const MAX_RETRIES = 3;
    const RETRY_BACKOFF_MS = [1000, 2000, 4000];

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

    // ============================================
    // 3. Generate Weekly Digests
    // ============================================
    try {
      // Get users due for digest (timezone-aware, checks if their preferred time has passed)
      const users = await getUsersDueForDigest();

      if (users.length > 0) {
        for (const user of users) {
          try {
            // Check eligibility (new users)
            if (!(await isUserEligibleForDigest(user.user_id))) {
              results.digests.skipped++;
              continue;
            }

            // Calculate week boundaries in user's timezone
            const now = new Date();
            const { weekStart, weekEnd } = getUserWeekBoundaries(now, user.timezone);

            // Double-check idempotency (already checked in getUsersDueForDigest, but be safe)
            const dedupeKey = generateDedupeKey(user.user_id, weekStart);
            if (await wasDigestSentThisWeek(user.user_id, weekStart)) {
              results.digests.skipped++;
              continue;
            }

            // Check if user wants digest only when active
            if (user.preferences.only_when_active) {
              const supabase = createServiceClient();
              const { count } = await supabase
                .from("events")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.user_id)
                .gte("created_at", weekStart.toISOString())
                .lte("created_at", weekEnd.toISOString());

              if (!count || count === 0) {
                results.digests.skipped++;
                continue;
              }
            }

            // Compute stats
            const stats = await computeDigestStats(
              user.user_id,
              weekStart,
              weekEnd,
              user.timezone
            );
            if (!stats) {
              results.digests.errors++;
              console.error(`[${user.user_id}] Failed to compute digest stats`);
              continue;
            }

            // Select variant
            const variantResult = selectDigestVariant(stats, user.preferences.digest_detail_level);
            const variant = variantResult.variant;

            // Get user tone preference for digest
            const userPrefs = await getUserPreferences(user.user_id);
            const digestTone = userPrefs.digest_tone_inherit
              ? userPrefs.tone_style
              : "neutral";

            // Render templates
            const templates = renderDigestTemplate(stats, variant);

            // Apply tone to subject/title
            const toneSubject = getToneSubject(templates.email.subject, digestTone);
            const toneTitle = getToneSubject(templates.inApp.title, digestTone);

            // Retry logic for sending
            let lastError: string | undefined;
            let sent = false;

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
              try {
                // Send via configured channels
                const sendPromises: Promise<{ success: boolean; error?: string }>[] = [];

                if (user.preferences.digest_channel === "email" || user.preferences.digest_channel === "both") {
                  if (!process.env.RESEND_API_KEY) {
                    throw new Error("RESEND_API_KEY not configured");
                  }
                  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
                  sendPromises.push(
                    resend.emails
                      .send({
                        from,
                        to: user.email,
                        subject: toneSubject,
                        html: templates.email.html,
                        text: templates.email.text,
                      })
                      .then((result) => ({
                        success: !result.error,
                        error: result.error?.message,
                      }))
                      .catch((error) => ({
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                      }))
                  );
                }

                if (user.preferences.digest_channel === "in_app" || user.preferences.digest_channel === "both") {
                  sendPromises.push(
                    createInAppNotification({
                      userId: user.user_id,
                      title: toneTitle,
                      message: templates.inApp.content,
                      type: "weekly_digest",
                      data: templates.inApp.data,
                      useServiceClient: true,
                    })
                      .then((result) => ({
                        success: result.success,
                        error: result.success ? undefined : result.error,
                      }))
                      .catch((error) => ({
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error",
                      }))
                  );
                }

                const sendResults = await Promise.allSettled(sendPromises);
                const allSucceeded = sendResults.every(
                  (r) => r.status === "fulfilled" && r.value.success
                );

                if (allSucceeded) {
                  // Mark as sent
                  const supabase = createServiceClient();
                  await supabase.from("weekly_digests").upsert({
                    user_id: user.user_id,
                    week_start_date: weekStart.toISOString().split("T")[0],
                    week_end_date: weekEnd.toISOString().split("T")[0],
                    digest_variant: variant,
                    dedupe_key: dedupeKey,
                    stats_data: stats,
                    sent_at: new Date().toISOString(),
                    status: "sent",
                    retry_count: 0,
                  });
                  sent = true;
                  results.digests.sent++;
                  break;
                } else {
                  // At least one failed
                  const errors = sendResults
                    .filter(
                      (r) =>
                        r.status === "rejected" ||
                        (r.status === "fulfilled" && !r.value.success)
                    )
                    .map((r) =>
                      r.status === "rejected"
                        ? String(r.reason)
                        : r.value.error || "Unknown error"
                    );
                  lastError = errors.join("; ");

                  if (attempt < MAX_RETRIES) {
                    // Wait before retry (exponential backoff)
                    await new Promise((resolve) =>
                      setTimeout(resolve, RETRY_BACKOFF_MS[attempt] || 4000)
                    );
                    continue;
                  }
                }
              } catch (error) {
                lastError = error instanceof Error ? error.message : "Unknown error";
                if (attempt < MAX_RETRIES) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, RETRY_BACKOFF_MS[attempt] || 4000)
                  );
                  continue;
                }
              }
            }

            if (!sent) {
              // All retries failed
              const supabase = createServiceClient();
              await supabase.from("weekly_digests").upsert({
                user_id: user.user_id,
                week_start_date: weekStart.toISOString().split("T")[0],
                week_end_date: weekEnd.toISOString().split("T")[0],
                digest_variant: variant,
                dedupe_key: dedupeKey,
                status: "failed",
                failure_reason: lastError || "All retry attempts failed",
                retry_count: MAX_RETRIES,
                last_retry_at: new Date().toISOString(),
              });
              results.digests.errors++;
              console.error(`[${user.user_id}] Failed to send digest:`, lastError);
            }
          } catch (error) {
            results.digests.errors++;
            console.error(`[${user.user_id}] Error processing digest:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate digests:", error);
      results.digests.errors++;
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
        digests: {
          sent: results.digests.sent,
          errors: results.digests.errors,
          skipped: results.digests.skipped,
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

