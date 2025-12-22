/**
 * Milestone 9: Feature flag utility (updated to use new entitlements system)
 * This file maintains backward compatibility while using the new plan model
 */

import { getUserPlan } from "./entitlements";
import { hasProAccess } from "./plans";

/**
 * @deprecated Use getUserPlan from entitlements.ts instead
 * Get user's feature flags and plan information (backward compatibility)
 */
export async function getUserFeatures(userId: string) {
  const plan = await getUserPlan(userId);
  if (!plan) return null;

  const isTrialActive =
    plan.subscription_status === "trialing" &&
    plan.trial_ends_at !== null &&
    new Date(plan.trial_ends_at) > new Date();

  return {
    isPremium: hasProAccess(plan),
    planType: plan.plan_type.toLowerCase() as "free" | "pro" | "enterprise",
    planStatus: plan.subscription_status as
      | "active"
      | "trial"
      | "cancelled"
      | "expired",
    trialEnd: plan.trial_ends_at ? new Date(plan.trial_ends_at) : null,
    isTrialActive,
  };
}

/**
 * Check if user has premium access
 * Returns true if user has PRO access (paid or trial)
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  if (!plan) return false;
  return hasProAccess(plan);
}

/**
 * Check if feature is available for user
 * @deprecated Use isFeatureEnabled from entitlements.ts instead
 */
export async function isFeatureAvailable(
  userId: string,
  feature: "premium" | "pro" | "enterprise"
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  if (!plan) return false;

  if (feature === "premium" || feature === "pro") {
    return hasProAccess(plan);
  }

  if (feature === "enterprise") {
    return plan.plan_type === "TEAM";
  }

  return false;
}

