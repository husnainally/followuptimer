import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

interface SendPushNotificationOptions {
  userId: string;
  title: string;
  message: string;
  affirmation: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Initialize VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail =
  process.env.VAPID_EMAIL || "mailto:noreply@followuptimer.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn(
    "⚠️ VAPID keys not configured. Push notifications will not work."
  );
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  if (!vapidPublicKey) {
    throw new Error("VAPID public key not configured");
  }
  return vapidPublicKey;
}

/**
 * Send push notification to user
 */
export async function sendPushNotification({
  userId,
  title,
  message,
  affirmation,
}: SendPushNotificationOptions) {
  try {
    // If VAPID keys are not configured, return early
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log("Push notification skipped: VAPID keys not configured");
      return {
        success: false,
        message: "Push notifications not configured",
      };
    }

    const supabase = createServiceClient();

    // Get user's push subscriptions from database
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching push subscriptions:", error);
      return {
        success: false,
        message: "Failed to fetch subscriptions",
      };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        success: false,
        message: "No push subscriptions found for user",
      };
    }

    // Create notification payload
    const payload = JSON.stringify({
      title,
      body: `${affirmation}\n\n${message}`,
      icon: "/logo1.png",
      badge: "/logo1.png",
      data: {
        url: `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/dashboard`,
        reminderId: null, // Can be passed if needed
      },
      tag: `reminder-${userId}`,
      requireInteraction: false,
      silent: false,
    });

    // Send to all user's subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: PushSubscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: subscription.endpoint };
        } catch (error) {
          // If subscription is invalid, remove it from database
          if (error && typeof error === "object" && "statusCode" in error) {
            const statusCode = error.statusCode as number;
            if (statusCode === 410 || statusCode === 404) {
              // Subscription expired or not found, remove it
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", subscription.endpoint);
            }
          }
          throw error;
        }
      })
    );

    // Count successful sends
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const total = results.length;

    return {
      success: successful > 0,
      message:
        successful === total
          ? "All notifications sent"
          : `${successful}/${total} notifications sent`,
      results,
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Push notification failed",
    };
  }
}

/**
 * Remove invalid push subscriptions
 */
export async function cleanupInvalidSubscriptions(userId?: string) {
  try {
    const supabase = createServiceClient();
    let query = supabase.from("push_subscriptions").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions) {
      return { success: false, error: "Failed to fetch subscriptions" };
    }

    const cleanupResults = await Promise.allSettled(
      subscriptions.map(async (subscription: PushSubscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          // Try to send an empty notification to check if subscription is valid
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({ test: true })
          );
          return { valid: true, endpoint: subscription.endpoint };
        } catch (error) {
          // If subscription is invalid, remove it
          if (error && typeof error === "object" && "statusCode" in error) {
            const statusCode = error.statusCode as number;
            if (statusCode === 410 || statusCode === 404) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", subscription.endpoint);
              return {
                valid: false,
                endpoint: subscription.endpoint,
                removed: true,
              };
            }
          }
          return { valid: true, endpoint: subscription.endpoint };
        }
      })
    );

    return {
      success: true,
      results: cleanupResults,
    };
  } catch (error) {
    console.error("Error cleaning up subscriptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cleanup failed",
    };
  }
}
