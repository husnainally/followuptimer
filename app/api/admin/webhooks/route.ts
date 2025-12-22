/**
 * Admin Webhook Logs API
 * View Stripe webhook events (admin only)
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
 * GET /api/admin/webhooks
 * Fetch webhook logs (billing_events) with filtering and pagination
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
    const eventType = searchParams.get("event_type");
    const userId = searchParams.get("user_id");
    const customerId = searchParams.get("customer_id");
    const processed = searchParams.get("processed");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Use service client to bypass RLS for admin queries
    const serviceSupabase = createServiceClient();

    // Build query
    let query = serviceSupabase
      .from("billing_events")
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
    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (customerId) {
      query = query.eq("stripe_customer_id", customerId);
    }

    if (processed !== null && processed !== undefined) {
      query = query.eq("processed", processed === "true");
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch webhook logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch webhook logs" },
        { status: 500 }
      );
    }

    // Transform data to include user email
    const transformedData = (data || []).map((event: any) => ({
      id: event.id,
      event_type: event.event_type,
      stripe_event_id: event.stripe_event_id,
      stripe_customer_id: event.stripe_customer_id,
      stripe_subscription_id: event.stripe_subscription_id,
      user_id: event.user_id,
      user_email: event.profiles?.email || null,
      event_data: event.event_data,
      processed: event.processed,
      processed_at: event.processed_at,
      error_message: event.error_message,
      created_at: event.created_at,
    }));

    return NextResponse.json({
      success: true,
      webhooks: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Webhook logs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

