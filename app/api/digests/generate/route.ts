import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getUsersDueForDigest,
  wasDigestSentThisWeek,
  isUserEligibleForDigest,
  getUserWeekBoundaries,
  generateDedupeKey,
} from "@/lib/digest-scheduler";
import { computeDigestStats } from "@/lib/digest-stats";
import { selectDigestVariant } from "@/lib/digest-variant-selector";
import { renderDigestTemplate } from "@/lib/digest-templates";
import { Resend } from "resend";
import { createInAppNotification } from "@/lib/in-app-notification";
import { getUserPreferences } from "@/lib/user-preferences";
import { getToneSubject } from "@/lib/tone-system";

const resend = new Resend(process.env.RESEND_API_KEY);
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Send digest email
 */
async function sendDigestEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const from = process.env.RESEND_FROM || "onboarding@resend.dev";

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to send email");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send digest email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mark digest as sent in database
 */
async function markDigestAsSent(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  variant: string,
  dedupeKey: string,
  stats: unknown
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from("weekly_digests").upsert({
    user_id: userId,
    week_start_date: weekStart.toISOString().split("T")[0],
    week_end_date: weekEnd.toISOString().split("T")[0],
    digest_variant: variant,
    dedupe_key: dedupeKey,
    stats_data: stats,
    sent_at: new Date().toISOString(),
    status: "sent",
    retry_count: 0,
  });
}

/**
 * Mark digest as failed
 */
async function markDigestAsFailed(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  variant: string,
  dedupeKey: string,
  failureReason: string,
  retryCount: number
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from("weekly_digests").upsert({
    user_id: userId,
    week_start_date: weekStart.toISOString().split("T")[0],
    week_end_date: weekEnd.toISOString().split("T")[0],
    digest_variant: variant,
    dedupe_key: dedupeKey,
    status: "failed",
    failure_reason: failureReason,
    retry_count: retryCount,
    last_retry_at: new Date().toISOString(),
  });
}

/**
 * Process digest for a single user with retry logic
 */
async function processUserDigest(userInfo: {
  user_id: string;
  email: string;
  timezone: string;
  preferences: {
    digest_day: number;
    digest_time: string;
    digest_channel: "email" | "in_app" | "both";
    digest_detail_level: "light" | "standard";
    only_when_active: boolean;
  };
}): Promise<{ success: boolean; error?: string }> {
  const { user_id, email, timezone, preferences } = userInfo;

  // Check eligibility (new users)
  if (!(await isUserEligibleForDigest(user_id))) {
    return { success: true }; // Not an error, just skip
  }

  // Calculate week boundaries in user's timezone
  const now = new Date();
  const { weekStart, weekEnd } = getUserWeekBoundaries(now, timezone);

  // Check idempotency
  const dedupeKey = generateDedupeKey(user_id, weekStart);
  if (await wasDigestSentThisWeek(user_id, weekStart)) {
    console.log(`Digest already sent for user ${user_id} (dedupe_key: ${dedupeKey})`);
    return { success: true };
  }

  // Check if user wants digest only when active
  if (preferences.only_when_active) {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    if (!count || count === 0) {
      return { success: true }; // Skip, not an error
    }
  }

  // Compute stats
  const stats = await computeDigestStats(user_id, weekStart, weekEnd, timezone);
  if (!stats) {
    const error = "Failed to compute digest stats";
    console.error(`[${user_id}] ${error}`);
    return { success: false, error };
  }

  // Select variant
  const variantResult = selectDigestVariant(stats, preferences.digest_detail_level);
  const variant = variantResult.variant;

  // Get user tone preference for digest
  const userPrefs = await getUserPreferences(user_id);
  const digestTone = userPrefs.digest_tone_inherit
    ? userPrefs.tone_style
    : "neutral"; // Default to neutral if not inheriting

  // Render templates
  const templates = renderDigestTemplate(stats, variant);

  // Apply tone to subject/title
  const toneSubject = getToneSubject(templates.email.subject, digestTone);
  const toneTitle = getToneSubject(templates.inApp.title, digestTone);

  // Retry logic for sending
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Send via configured channels
      const sendPromises: Promise<{ success: boolean; error?: string }>[] = [];

      if (preferences.digest_channel === "email" || preferences.digest_channel === "both") {
        sendPromises.push(
          sendDigestEmail(email, toneSubject, templates.email.html, templates.email.text)
        );
      }

      if (preferences.digest_channel === "in_app" || preferences.digest_channel === "both") {
        sendPromises.push(
          createInAppNotification({
            userId: user_id,
            title: toneTitle,
            message: templates.inApp.content,
            type: "weekly_digest",
            data: templates.inApp.data,
            useServiceClient: true,
          }).then((result) => ({
            success: result.success,
            error: result.success ? undefined : result.error,
          })).catch((error) => ({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }))
        );
      }

      const results = await Promise.allSettled(sendPromises);
      const allSucceeded = results.every(
        (r) => r.status === "fulfilled" && r.value.success
      );

      if (allSucceeded) {
        // Mark as sent
        await markDigestAsSent(
          user_id,
          weekStart,
          weekEnd,
          variant,
          dedupeKey,
          stats
        );
        return { success: true };
      } else {
        // At least one failed
        const errors = results
          .filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success))
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

  // All retries failed
  await markDigestAsFailed(
    user_id,
    weekStart,
    weekEnd,
    variant,
    dedupeKey,
    lastError || "All retry attempts failed",
    MAX_RETRIES
  );

  return { success: false, error: lastError };
}

// POST /api/digests/generate - Generate and send weekly digests (called by cron)
export async function POST(request: Request) {
  try {
    // Verify this is an internal request (from cron or with secret)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.DIGEST_CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get users due for digest (timezone-aware)
    const users = await getUsersDueForDigest();

    if (users.length === 0) {
      return NextResponse.json({
        message: "No users due for digest at this time",
        sent: 0,
        errors: 0,
      });
    }

    let sentCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each user
    for (const user of users) {
      try {
        const result = await processUserDigest(user);

        if (result.success) {
          sentCount++;
          console.log(`[${user.user_id}] Digest sent successfully`);
        } else {
          errorCount++;
          console.error(`[${user.user_id}] Failed to send digest:`, result.error);
        }
      } catch (error) {
        errorCount++;
        console.error(`[${user.user_id}] Error processing digest:`, error);
      }
    }

    return NextResponse.json({
      message: "Digest generation completed",
      total: users.length,
      sent: sentCount,
      errors: errorCount,
      skipped: skippedCount,
    });
  } catch (error: unknown) {
    console.error("Failed to generate digests:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate digests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
