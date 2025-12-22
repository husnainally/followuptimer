/**
 * Milestone 9: Stripe Webhook Handler
 * Processes Stripe events and updates user plan state
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { UserPlan } from "@/lib/plans";

// Initialize Stripe (only if webhook secret is configured)
const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-12-18.acacia",
      })
    : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!stripe || !webhookSecret || !signature) {
    // If Stripe is not configured, allow webhook to proceed (for testing)
    // In production, this should be strict
    console.warn("Stripe webhook verification skipped (not configured)");
    return process.env.NODE_ENV !== "production";
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    return !!event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

/**
 * Map Stripe subscription status to our subscription_status
 */
function mapStripeStatus(
  stripeStatus: string
): "none" | "trialing" | "active" | "past_due" | "canceled" | "paused" {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "paused":
      return "paused";
    default:
      return "none";
  }
}

/**
 * Update user plan from Stripe subscription
 */
async function updateUserPlanFromSubscription(
  customerId: string,
  subscription: Stripe.Subscription
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Find user by Stripe customer ID
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (findError || !profile) {
      return {
        success: false,
        error: `User not found for customer ${customerId}`,
      };
    }

    const userId = profile.id;

    // Determine plan type from subscription metadata or price
    let planType: "FREE" | "PRO" | "TEAM" = "PRO"; // Default to PRO
    if (subscription.metadata?.plan_type) {
      const metaPlan = subscription.metadata.plan_type.toUpperCase();
      if (metaPlan === "TEAM") planType = "TEAM";
      else if (metaPlan === "PRO") planType = "PRO";
    }

    // Map subscription status
    const subscriptionStatus = mapStripeStatus(subscription.status);

    // Determine trial end date
    let trialEndsAt: string | null = null;
    if (subscription.trial_end) {
      trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
    }

    // Update user plan
    const updateData: Partial<UserPlan> = {
      plan_type: planType,
      subscription_status: subscriptionStatus,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id || null,
      stripe_product_id: subscription.items.data[0]?.price.product as
        | string
        | null,
      trial_ends_at: trialEndsAt,
    };

    // Only update plan_started_at if subscription just became active
    if (subscriptionStatus === "active" && subscription.current_period_start) {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("plan_started_at")
        .eq("id", userId)
        .single();

      // Only set if not already set or if plan just started
      if (!currentProfile?.plan_started_at) {
        updateData.plan_started_at = new Date(
          subscription.current_period_start * 1000
        ).toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update plan: ${updateError.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update user plan from subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error updating plan",
    };
  }
}

/**
 * Log billing event
 */
async function logBillingEvent(
  eventType: string,
  stripeEventId: string,
  eventData: any,
  userId?: string,
  customerId?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("billing_events").insert({
      event_type: eventType,
      stripe_event_id: stripeEventId,
      user_id: userId || null,
      stripe_customer_id: customerId || null,
      event_data: eventData,
      processed: true,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log billing event:", error);
    // Don't fail webhook if logging fails
  }
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");
    const body = await request.text();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse event
    const event: Stripe.Event = JSON.parse(body);

    // Log event
    await logBillingEvent(
      event.type,
      event.id,
      event.data.object,
      undefined,
      (event.data.object as any)?.customer
    );

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const result = await updateUserPlanFromSubscription(
          customerId,
          subscription
        );

        if (!result.success) {
          console.error("Failed to update plan:", result.error);
          // Still return 200 to prevent Stripe retries for user errors
        }

        return NextResponse.json({ received: true });
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          // Downgrade to FREE
          await supabase
            .from("profiles")
            .update({
              plan_type: "FREE",
              subscription_status: "canceled",
              stripe_subscription_id: null,
              plan_started_at: new Date().toISOString(),
            })
            .eq("id", profile.id);
        }

        return NextResponse.json({ received: true });
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "past_due",
            })
            .eq("id", profile.id);
        }

        return NextResponse.json({ received: true });
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
            })
            .eq("id", profile.id);
        }

        return NextResponse.json({ received: true });
      }

      default:
        // Unknown event type - log but don't fail
        console.log(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

