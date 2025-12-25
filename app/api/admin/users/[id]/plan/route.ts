/**
 * Admin User Plan Status API
 * View user plan details and entitlements (admin only)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/entitlements";
import { getFeatureEntitlement } from "@/lib/entitlements";
import type { FeatureName } from "@/lib/entitlements";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    return profile?.is_admin || false;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/users/[id]/plan
 * Fetch user plan details and entitlements
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: targetUserId } = await params;

    // Get user plan
    const plan = await getUserPlan(targetUserId);

    if (!plan) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", targetUserId)
      .single();

    // Get feature entitlements
    const features: FeatureName[] = [
      "smart_snooze",
      "contacts",
      "weekly_digest",
      "trust_audit_ui",
      "advanced_settings",
      "tone_variants",
      "reminder_volume",
    ];

    const entitlements = features.map((feature) => {
      const entitlement = getFeatureEntitlement(plan, feature);
      return {
        feature,
        enabled: entitlement.enabled,
        limit: entitlement.limit,
      };
    });

    // Get recent webhook events for this user (last 10)
    const { data: recentWebhooks } = await supabase
      .from("billing_events")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get recent digest jobs for this user (last 10)
    const { data: recentJobs } = await supabase
      .from("weekly_digests")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      user: {
        id: targetUserId,
        email: profile?.email || null,
      },
      plan: {
        plan_type: plan.plan_type,
        subscription_status: plan.subscription_status,
        plan_started_at: plan.plan_started_at,
        trial_ends_at: plan.trial_ends_at,
        stripe_customer_id: plan.stripe_customer_id,
        stripe_subscription_id: plan.stripe_subscription_id,
        stripe_price_id: plan.stripe_price_id,
        stripe_product_id: plan.stripe_product_id,
      },
      entitlements,
      recent_webhooks: recentWebhooks || [],
      recent_jobs: recentJobs || [],
    });
  } catch (error) {
    console.error("User plan API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

