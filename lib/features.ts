/**
 * Feature flag utility for monetisation
 * Checks if user has premium features enabled
 */

import { createClient } from "@/lib/supabase/server";

export interface UserFeatures {
  isPremium: boolean;
  planType: "free" | "pro" | "enterprise";
  planStatus: "active" | "trial" | "cancelled" | "expired";
  trialEnd: Date | null;
  isTrialActive: boolean;
}

/**
 * Get user's feature flags and plan information
 */
export async function getUserFeatures(userId: string): Promise<UserFeatures | null> {
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_premium, plan_type, plan_status, trial_end")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return null;
    }

    const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null;
    const isTrialActive =
      profile.plan_status === "trial" &&
      trialEnd !== null &&
      trialEnd > new Date();

    return {
      isPremium: profile.is_premium || false,
      planType: (profile.plan_type as "free" | "pro" | "enterprise") || "free",
      planStatus:
        (profile.plan_status as "active" | "trial" | "cancelled" | "expired") ||
        "active",
      trialEnd,
      isTrialActive,
    };
  } catch (error) {
    console.error("Failed to get user features:", error);
    return null;
  }
}

/**
 * Check if user has premium access
 * Returns true if user is premium OR has active trial
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const features = await getUserFeatures(userId);
  if (!features) return false;
  return features.isPremium || features.isTrialActive;
}

/**
 * Check if feature is available for user
 */
export async function isFeatureAvailable(
  userId: string,
  feature: "premium" | "pro" | "enterprise"
): Promise<boolean> {
  const features = await getUserFeatures(userId);
  if (!features) return false;

  if (feature === "premium") {
    return features.isPremium || features.isTrialActive;
  }

  if (feature === "pro") {
    return (
      features.planType === "pro" ||
      features.planType === "enterprise" ||
      features.isTrialActive
    );
  }

  if (feature === "enterprise") {
    return features.planType === "enterprise";
  }

  return false;
}

