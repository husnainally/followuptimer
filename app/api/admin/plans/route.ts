/**
 * Milestone 9: Admin Plan Management API
 * Admin-only endpoints for managing user plans
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/entitlements";
import { startTrial, forceStartTrial, expireTrial } from "@/lib/trials";
import { PlanType, SubscriptionStatus } from "@/lib/plans";

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
 * PUT /api/admin/plans
 * Update a user's plan (admin only)
 */
export async function PUT(request: Request) {
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

    const body = await request.json();
    const {
      target_user_id,
      plan_type,
      subscription_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      stripe_product_id,
    } = body;

    if (!target_user_id) {
      return NextResponse.json(
        { error: "target_user_id is required" },
        { status: 400 }
      );
    }

    // Validate plan_type
    if (plan_type && !["FREE", "PRO", "TEAM"].includes(plan_type)) {
      return NextResponse.json(
        { error: "Invalid plan_type. Must be FREE, PRO, or TEAM" },
        { status: 400 }
      );
    }

    // Validate subscription_status
    if (
      subscription_status &&
      !["none", "trialing", "active", "past_due", "canceled", "paused"].includes(
        subscription_status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subscription_status. Must be none, trialing, active, past_due, canceled, or paused",
        },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (plan_type) updateData.plan_type = plan_type;
    if (subscription_status)
      updateData.subscription_status = subscription_status;
    if (stripe_customer_id !== undefined)
      updateData.stripe_customer_id = stripe_customer_id;
    if (stripe_subscription_id !== undefined)
      updateData.stripe_subscription_id = stripe_subscription_id;
    if (stripe_price_id !== undefined) updateData.stripe_price_id = stripe_price_id;
    if (stripe_product_id !== undefined)
      updateData.stripe_product_id = stripe_product_id;

    // Set plan_started_at if plan type changed
    if (plan_type) {
      updateData.plan_started_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", target_user_id);

    if (error) {
      return NextResponse.json(
        { error: `Failed to update plan: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Plan updated successfully",
    });
  } catch (error) {
    console.error("Failed to update plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/plans/trial/start
 * Force start a trial for a user (admin only)
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { target_user_id, duration_days } = body;

    if (!target_user_id) {
      return NextResponse.json(
        { error: "target_user_id is required" },
        { status: 400 }
      );
    }

    const result = await forceStartTrial(
      target_user_id,
      duration_days || 14
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to start trial" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trial started successfully",
    });
  } catch (error) {
    console.error("Failed to start trial:", error);
    return NextResponse.json(
      { error: "Failed to start trial" },
      { status: 500 }
    );
  }
}

