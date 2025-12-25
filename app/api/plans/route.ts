/**
 * Milestone 9: Plan Management API
 * GET: Get current user's plan
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, getAllEntitlements } from "@/lib/entitlements";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * GET /api/plans
 * Get current user's plan and entitlements
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    const entitlements = getAllEntitlements(plan);

    return NextResponse.json({
      plan,
      entitlements,
    });
  } catch (error) {
    console.error("Failed to get plan:", error);
    return NextResponse.json(
      { error: "Failed to get plan" },
      { status: 500 }
    );
  }
}

