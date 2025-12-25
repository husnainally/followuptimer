/**
 * Admin Job Logs API
 * View digest job runs (admin only)
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

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
 * GET /api/admin/jobs
 * Fetch job logs (weekly_digests) with filtering and pagination
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const variant = searchParams.get("variant");
    const userId = searchParams.get("user_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Use service client to bypass RLS for admin queries
    const serviceSupabase = createServiceClient();

    // Build query
    let query = serviceSupabase
      .from("weekly_digests")
      .select(
        `
        *,
        profiles:user_id (
          id,
          email
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (variant) {
      query = query.eq("digest_variant", variant);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("week_start_date", startDate);
    }

    if (endDate) {
      query = query.lte("week_end_date", endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch job logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch job logs" },
        { status: 500 }
      );
    }

    // Transform data to include user email
    const transformedData = (data || []).map((job: any) => ({
      id: job.id,
      user_id: job.user_id,
      user_email: job.profiles?.email || null,
      week_start_date: job.week_start_date,
      week_end_date: job.week_end_date,
      digest_variant: job.digest_variant,
      status: job.status,
      retry_count: job.retry_count,
      last_retry_at: job.last_retry_at,
      failure_reason: job.failure_reason,
      stats_data: job.stats_data,
      sent_at: job.sent_at,
      created_at: job.created_at,
      dedupe_key: job.dedupe_key,
    }));

    return NextResponse.json({
      success: true,
      jobs: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Job logs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

