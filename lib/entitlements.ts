/**
 * Milestone 9: Feature Flags & Entitlements System
 * Server-side authoritative feature gating based on plan
 */

import {
  UserPlan,
  PlanType,
  SubscriptionStatus,
  hasProAccess,
  isSubscriptionDegraded,
} from "./plans";
import { createClient } from "./supabase/server";

/**
 * Feature identifiers
 */
export type FeatureName =
  | "smart_snooze"
  | "contacts"
  | "weekly_digest"
  | "trust_audit_ui"
  | "advanced_settings"
  | "tone_variants"
  | "reminder_volume";

/**
 * Feature entitlement result
 */
export interface FeatureEntitlement {
  feature: FeatureName;
  enabled: boolean;
  limit: number | null; // null = unlimited
  current_usage?: number; // Optional: current usage count
  message?: string; // Optional: explanation message
}

/**
 * Feature configuration per plan
 */
interface FeatureConfig {
  enabled: boolean;
  limit: number | null; // null = unlimited
}

type FeatureMatrix = Record<PlanType, Record<FeatureName, FeatureConfig>>;

/**
 * Feature matrix: defines what each plan gets
 * FREE plan gets limited access, PRO gets full access
 */
const FEATURE_MATRIX: FeatureMatrix = {
  FREE: {
    smart_snooze: { enabled: true, limit: null }, // Available on FREE
    contacts: { enabled: true, limit: null }, // Available on FREE
    weekly_digest: { enabled: true, limit: 1 }, // Limited: light detail only
    trust_audit_ui: { enabled: true, limit: 7 }, // Limited: 7 days history
    advanced_settings: { enabled: false, limit: null },
    tone_variants: { enabled: true, limit: 1 }, // Only "neutral" tone
    reminder_volume: { enabled: true, limit: 50 }, // 50 active reminders max
  },
  PRO: {
    smart_snooze: { enabled: true, limit: null },
    contacts: { enabled: true, limit: null },
    weekly_digest: { enabled: true, limit: null }, // Full detail level
    trust_audit_ui: { enabled: true, limit: null }, // Unlimited history
    advanced_settings: { enabled: true, limit: null },
    tone_variants: { enabled: true, limit: null }, // All tones available
    reminder_volume: { enabled: true, limit: 500 }, // Higher cap
  },
  TEAM: {
    // Same as PRO for now (future: team-specific features)
    smart_snooze: { enabled: true, limit: null },
    contacts: { enabled: true, limit: null },
    weekly_digest: { enabled: true, limit: null },
    trust_audit_ui: { enabled: true, limit: null },
    advanced_settings: { enabled: true, limit: null },
    tone_variants: { enabled: true, limit: null },
    reminder_volume: { enabled: true, limit: 1000 },
  },
};

/**
 * Get effective plan type (considering trial)
 * During trial, user gets PRO-level access
 */
function getEffectivePlanType(plan: UserPlan): "FREE" | "PRO" | "TEAM" {
  // If in trial or has PRO access, grant PRO features
  if (hasProAccess(plan)) {
    return plan.plan_type === "TEAM" ? "TEAM" : "PRO";
  }
  return "FREE";
}

/**
 * Get feature entitlement for a user plan
 */
export function getFeatureEntitlement(
  plan: UserPlan,
  feature: FeatureName
): FeatureEntitlement {
  const effectivePlan = getEffectivePlanType(plan);
  const config = FEATURE_MATRIX[effectivePlan][feature];

  // If subscription is degraded, restrict advanced features
  if (isSubscriptionDegraded(plan)) {
    // Keep core features but restrict advanced ones
    if (feature === "advanced_settings" || feature === "tone_variants") {
      return {
        feature,
        enabled: false,
        limit: null,
        message: "Subscription requires attention. Please update payment method.",
      };
    }
  }

  return {
    feature,
    enabled: config.enabled,
    limit: config.limit,
  };
}

/**
 * Check if a feature is enabled for a plan
 */
export function isFeatureEnabled(plan: UserPlan, feature: FeatureName): boolean {
  const entitlement = getFeatureEntitlement(plan, feature);
  return entitlement.enabled;
}

/**
 * Check if a feature action is allowed (considering limits)
 */
export async function canUseFeature(
  userId: string,
  plan: UserPlan,
  feature: FeatureName
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number }> {
  const entitlement = getFeatureEntitlement(plan, feature);

  if (!entitlement.enabled) {
    return {
      allowed: false,
      reason: `Feature "${feature}" is not available on your plan.`,
    };
  }

  // If no limit, always allowed
  if (entitlement.limit === null) {
    return { allowed: true };
  }

  // Check current usage against limit
  const usage = await getFeatureUsage(userId, feature);
  if (usage >= entitlement.limit) {
    return {
      allowed: false,
      reason: `Limit reached for "${feature}". Upgrade to increase limits.`,
      currentUsage: usage,
    };
  }

  return {
    allowed: true,
    currentUsage: usage,
  };
}

/**
 * Get current usage for a feature
 */
async function getFeatureUsage(
  userId: string,
  feature: FeatureName
): Promise<number> {
  try {
    const supabase = await createClient();

    switch (feature) {
      case "reminder_volume": {
        const { count } = await supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending");
        return count || 0;
      }

      case "contacts": {
        const { count } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        return count || 0;
      }

      case "weekly_digest": {
        // Count digests sent in current period (e.g., this month)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { count } = await supabase
          .from("digest_tracking")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", monthStart.toISOString());
        return count || 0;
      }

      case "trust_audit_ui": {
        // Count audit events in last N days (based on limit)
        // This is a simplified check - actual implementation may vary
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("event_type", [
            "reminder_created",
            "reminder_completed",
            "reminder_snoozed",
          ]);
        return count || 0;
      }

      default:
        return 0;
    }
  } catch (error) {
    console.error(`Failed to get usage for feature ${feature}:`, error);
    return 0; // Fail open - allow action if we can't check
  }
}

/**
 * Get all entitlements for a user plan
 */
export function getAllEntitlements(plan: UserPlan): FeatureEntitlement[] {
  const features: FeatureName[] = [
    "smart_snooze",
    "contacts",
    "weekly_digest",
    "trust_audit_ui",
    "advanced_settings",
    "tone_variants",
    "reminder_volume",
  ];

  return features.map((feature) => getFeatureEntitlement(plan, feature));
}

/**
 * Get user plan from database
 */
export async function getUserPlan(userId: string): Promise<UserPlan | null> {
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "plan_type, plan_started_at, trial_ends_at, subscription_status, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_product_id"
      )
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return null;
    }

    return {
      plan_type: (profile.plan_type as "FREE" | "PRO" | "TEAM") || "FREE",
      plan_started_at: profile.plan_started_at || null,
      trial_ends_at: profile.trial_ends_at || null,
      subscription_status:
        (profile.subscription_status as SubscriptionStatus) || "none",
      stripe_customer_id: profile.stripe_customer_id || null,
      stripe_subscription_id: profile.stripe_subscription_id || null,
      stripe_price_id: profile.stripe_price_id || null,
      stripe_product_id: profile.stripe_product_id || null,
    };
  } catch (error) {
    console.error("Failed to get user plan:", error);
    return null;
  }
}

