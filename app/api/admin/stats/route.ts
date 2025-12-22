/**
 * Admin Stats API
 * Comprehensive statistics for admin dashboard
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

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
 * GET /api/admin/stats
 * Fetch comprehensive admin statistics
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
    const range = searchParams.get("range") || "30d"; // 7d, 30d, 90d, all

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const serviceSupabase = createServiceClient();

    // Total users
    const { count: totalUsers } = await serviceSupabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // Active users (users with activity in date range)
    const { count: activeUsers } = await serviceSupabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    // Users by plan type
    const { data: planDistribution } = await serviceSupabase
      .from("profiles")
      .select("plan_type")
      .not("plan_type", "is", null);

    const planCounts = (planDistribution || []).reduce(
      (acc: Record<string, number>, profile: any) => {
        acc[profile.plan_type] = (acc[profile.plan_type] || 0) + 1;
        return acc;
      },
      {}
    );

    // Total reminders
    const { count: totalReminders } = await serviceSupabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    // Completed reminders
    const { count: completedReminders } = await serviceSupabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", startDate.toISOString());

    // Total contacts
    const { count: totalContacts } = await serviceSupabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    // Webhook stats
    const { count: totalWebhooks } = await serviceSupabase
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    const { count: failedWebhooks } = await serviceSupabase
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("processed", false)
      .gte("created_at", startDate.toISOString());

    // Job stats
    const { count: totalJobs } = await serviceSupabase
      .from("weekly_digests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    const { count: failedJobs } = await serviceSupabase
      .from("weekly_digests")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", startDate.toISOString());

    // Waitlist count
    const { count: waitlistCount } = await serviceSupabase
      .from("waitlist")
      .select("id", { count: "exact", head: true });

    // Daily signups (last 30 days for chart)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: recentSignups } = await serviceSupabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Group by day
    const dailySignups: Record<string, number> = {};
    (recentSignups || []).forEach((profile: any) => {
      const date = new Date(profile.created_at).toISOString().split("T")[0];
      dailySignups[date] = (dailySignups[date] || 0) + 1;
    });

    // Webhook events by type (last 30 days)
    const { data: recentWebhooks } = await serviceSupabase
      .from("billing_events")
      .select("event_type, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const webhookEventsByType: Record<string, number> = {};
    (recentWebhooks || []).forEach((event: any) => {
      webhookEventsByType[event.event_type] =
        (webhookEventsByType[event.event_type] || 0) + 1;
    });

    // Job status distribution
    const { data: jobStatuses } = await serviceSupabase
      .from("weekly_digests")
      .select("status")
      .gte("created_at", startDate.toISOString());

    const jobStatusDistribution: Record<string, number> = {};
    (jobStatuses || []).forEach((job: any) => {
      jobStatusDistribution[job.status] =
        (jobStatusDistribution[job.status] || 0) + 1;
    });

    // Reminder completion rate
    const completionRate =
      totalReminders && totalReminders > 0 && completedReminders
        ? Math.round((completedReminders / totalReminders) * 100)
        : 0;

    // Webhook success rate
    const webhookSuccessRate =
      totalWebhooks && totalWebhooks > 0 && failedWebhooks !== null
        ? Math.round(((totalWebhooks - failedWebhooks) / totalWebhooks) * 100)
        : 100;

    // Job success rate
    const jobSuccessRate =
      totalJobs && totalJobs > 0 && failedJobs !== null
        ? Math.round(((totalJobs - failedJobs) / totalJobs) * 100)
        : 100;

    return NextResponse.json({
      success: true,
      range,
      overview: {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_reminders: totalReminders || 0,
        completed_reminders: completedReminders || 0,
        total_contacts: totalContacts || 0,
        waitlist_count: waitlistCount || 0,
        completion_rate: completionRate,
      },
      plans: {
        distribution: planCounts,
        free: planCounts.FREE || 0,
        pro: planCounts.PRO || 0,
        team: planCounts.TEAM || 0,
      },
      webhooks: {
        total: totalWebhooks || 0,
        failed: failedWebhooks || 0,
        success_rate: webhookSuccessRate,
        by_type: webhookEventsByType,
      },
      jobs: {
        total: totalJobs || 0,
        failed: failedJobs || 0,
        success_rate: jobSuccessRate,
        status_distribution: jobStatusDistribution,
      },
      charts: {
        daily_signups: Object.entries(dailySignups).map(([date, count]) => ({
          date,
          count,
        })),
      },
    });
  } catch (error) {
    console.error("Admin stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

