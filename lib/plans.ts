/**
 * Milestone 9: Plan Model and Types
 * Defines plan types, subscription statuses, and user plan context
 */

export type PlanType = "FREE" | "PRO" | "TEAM";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

/**
 * User Plan Object
 * Represents a user's current plan context
 */
export interface UserPlan {
  plan_type: PlanType;
  plan_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

/**
 * Default plan for new users
 */
export const DEFAULT_PLAN: UserPlan = {
  plan_type: "FREE",
  plan_started_at: null,
  trial_ends_at: null,
  subscription_status: "none",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  stripe_product_id: null,
};

/**
 * Check if a plan type is valid
 */
export function isValidPlanType(value: string): value is PlanType {
  return value === "FREE" || value === "PRO" || value === "TEAM";
}

/**
 * Check if a subscription status is valid
 */
export function isValidSubscriptionStatus(
  value: string
): value is SubscriptionStatus {
  return (
    value === "none" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "paused"
  );
}

/**
 * Normalize plan type (fallback to FREE if invalid)
 */
export function normalizePlanType(value: string | null | undefined): PlanType {
  if (!value || !isValidPlanType(value)) {
    return "FREE";
  }
  return value;
}

/**
 * Normalize subscription status (fallback to none if invalid)
 */
export function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  if (!value || !isValidSubscriptionStatus(value)) {
    return "none";
  }
  return value;
}

/**
 * Check if user is currently in trial
 */
export function isInTrial(plan: UserPlan): boolean {
  if (plan.subscription_status !== "trialing") {
    return false;
  }
  if (!plan.trial_ends_at) {
    return false;
  }
  const trialEnd = new Date(plan.trial_ends_at);
  return trialEnd > new Date();
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(plan: UserPlan): boolean {
  if (plan.subscription_status !== "trialing") {
    return false;
  }
  if (!plan.trial_ends_at) {
    return false;
  }
  const trialEnd = new Date(plan.trial_ends_at);
  return trialEnd <= new Date();
}

/**
 * Check if user has active paid subscription
 */
export function hasActiveSubscription(plan: UserPlan): boolean {
  return plan.subscription_status === "active";
}

/**
 * Check if user has any form of PRO access (trial or paid)
 */
export function hasProAccess(plan: UserPlan): boolean {
  // PRO access if:
  // 1. Plan type is PRO or TEAM
  // 2. AND (subscription is active OR in trial)
  if (plan.plan_type === "PRO" || plan.plan_type === "TEAM") {
    return (
      plan.subscription_status === "active" ||
      plan.subscription_status === "trialing"
    );
  }
  return false;
}

/**
 * Check if subscription is in a degraded state
 */
export function isSubscriptionDegraded(plan: UserPlan): boolean {
  return (
    plan.subscription_status === "past_due" ||
    plan.subscription_status === "paused"
  );
}

