/**
 * Milestone 9: Trial Logic
 * Handles trial start, tracking, expiration, and downgrade
 */

import { createClient } from "./supabase/server";
import { UserPlan, PlanType, SubscriptionStatus } from "./plans";
import { getUserPlan } from "./entitlements";

/**
 * Default trial duration in days
 */
export const DEFAULT_TRIAL_DURATION_DAYS = 14;

/**
 * Start a trial for a user
 * Returns success status and error message if failed
 */
export async function startTrial(
  userId: string,
  durationDays: number = DEFAULT_TRIAL_DURATION_DAYS
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Check if user already had a trial
    const { data: existingTrial, error: trialCheckError } = await supabase
      .from("trial_history")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (trialCheckError && trialCheckError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error checking trial history:", trialCheckError);
    }

    if (existingTrial) {
      return {
        success: false,
        error: "User has already used their trial. One trial per user.",
      };
    }

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + durationDays);
    trialEndsAt.setHours(23, 59, 59, 999); // End of day

    // Update user plan to PRO with trialing status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan_type: "PRO",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        plan_started_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update plan: ${updateError.message}`,
      };
    }

    // Record trial start in history
    const { error: historyError } = await supabase
      .from("trial_history")
      .insert({
        user_id: userId,
        trial_started_at: new Date().toISOString(),
        trial_duration_days: durationDays,
      });

    if (historyError) {
      // Log but don't fail - trial is started even if history fails
      console.error("Failed to record trial history:", historyError);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to start trial:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error starting trial",
    };
  }
}

/**
 * Check if user is eligible for a trial
 */
export async function isEligibleForTrial(
  userId: string
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    const supabase = await createClient();

    // Check if user already had a trial
    const { data: existingTrial } = await supabase
      .from("trial_history")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingTrial) {
      return {
        eligible: false,
        reason: "User has already used their trial.",
      };
    }

    // Check current plan
    const plan = await getUserPlan(userId);
    if (!plan) {
      return {
        eligible: false,
        reason: "Could not retrieve user plan.",
      };
    }

    // If already on PRO or TEAM with active subscription, not eligible
    if (
      (plan.plan_type === "PRO" || plan.plan_type === "TEAM") &&
      plan.subscription_status === "active"
    ) {
      return {
        eligible: false,
        reason: "User already has an active paid subscription.",
      };
    }

    return { eligible: true };
  } catch (error) {
    console.error("Failed to check trial eligibility:", error);
    return {
      eligible: false,
      reason: "Error checking eligibility.",
    };
  }
}

/**
 * Expire a trial (called by scheduled job or webhook)
 * Downgrades user to FREE plan
 */
export async function expireTrial(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current plan
    const plan = await getUserPlan(userId);
    if (!plan) {
      return {
        success: false,
        error: "Could not retrieve user plan.",
      };
    }

    // Only expire if currently trialing
    if (plan.subscription_status !== "trialing") {
      return {
        success: false,
        error: "User is not currently in trial.",
      };
    }

    // Update trial history
    const { error: historyError } = await supabase
      .from("trial_history")
      .update({
        trial_ended_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .is("trial_ended_at", null);

    if (historyError) {
      console.error("Failed to update trial history:", historyError);
      // Continue anyway
    }

    // Downgrade to FREE
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan_type: "FREE",
        subscription_status: "none",
        trial_ends_at: null,
        plan_started_at: new Date().toISOString(), // Reset plan start
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to downgrade plan: ${updateError.message}`,
      };
    }

    // Log event for analytics
    try {
      const { logEvent } = await import("./events");
      await logEvent({
        userId,
        eventType: "trial_expired",
        eventData: {
          trial_ended_at: new Date().toISOString(),
        },
      });
    } catch (eventError) {
      // Don't fail if event logging fails
      console.error("Failed to log trial expired event:", eventError);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to expire trial:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error expiring trial",
    };
  }
}

/**
 * Get all users with expired trials (for batch processing)
 */
export async function getExpiredTrials(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("subscription_status", "trialing")
      .not("trial_ends_at", "is", null)
      .lte("trial_ends_at", now);

    if (error) {
      console.error("Failed to get expired trials:", error);
      return [];
    }

    return profiles?.map((p) => p.id) || [];
  } catch (error) {
    console.error("Failed to get expired trials:", error);
    return [];
  }
}

/**
 * Admin function: Force start trial (bypasses one-trial-per-user rule)
 */
export async function forceStartTrial(
  userId: string,
  durationDays: number = DEFAULT_TRIAL_DURATION_DAYS
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify admin (this should be checked by caller)
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + durationDays);
    trialEndsAt.setHours(23, 59, 59, 999);

    // Update user plan
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan_type: "PRO",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        plan_started_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update plan: ${updateError.message}`,
      };
    }

    // Record in history (allow multiple entries for admin overrides)
    await supabase.from("trial_history").insert({
      user_id: userId,
      trial_started_at: new Date().toISOString(),
      trial_duration_days: durationDays,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to force start trial:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error force starting trial",
    };
  }
}

