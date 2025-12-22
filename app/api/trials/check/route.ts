/**
 * Milestone 9: Trial Check API
 * GET: Check if user is eligible for trial
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEligibleForTrial } from "@/lib/trials";
import { getUserPlan } from "@/lib/entitlements";
import { isInTrial } from "@/lib/plans";

/**
 * GET /api/trials/check
 * Check trial eligibility and status
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

    const eligibility = await isEligibleForTrial(user.id);
    const inTrial = isInTrial(plan);

    return NextResponse.json({
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      inTrial,
      trialEndsAt: plan.trial_ends_at,
    });
  } catch (error) {
    console.error("Failed to check trial:", error);
    return NextResponse.json(
      { error: "Failed to check trial" },
      { status: 500 }
    );
  }
}

