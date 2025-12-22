/**
 * Milestone 9: Trial Management API
 * POST: Start a trial for the current user
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startTrial, isEligibleForTrial } from "@/lib/trials";

/**
 * POST /api/trials/start
 * Start a trial for the current user
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

    // Check eligibility
    const eligibility = await isEligibleForTrial(user.id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason || "Not eligible for trial" },
        { status: 400 }
      );
    }

    // Parse optional duration
    const body = await request.json().catch(() => ({}));
    const durationDays = body.durationDays || 14;

    // Start trial
    const result = await startTrial(user.id, durationDays);

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

