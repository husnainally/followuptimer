import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

import { getUserTone, getToneMessage } from "./tone-system";

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
      console.warn("[Push] Push notification skipped: VAPID keys not configured", {
        userId,
        hasPublicKey: !!vapidPublicKey,
        hasPrivateKey: !!vapidPrivateKey,
      });
      return {
        success: false,
        message: "Push notifications not configured - VAPID keys missing",
      };
    }

    const supabase = createServiceClient();

    // Get user's push subscriptions from database
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) {
      console.error("[Push] Error fetching push subscriptions:", {
        error: error.message || error,
        errorCode: error.code,
        userId,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        message: `Failed to fetch subscriptions: ${error.message || "Unknown error"}`,
      };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.warn("[Push] No push subscriptions found for user:", {
        userId,
        timestamp: new Date().toISOString(),
        suggestion: "User needs to enable push notifications in settings",
      });
      return {
        success: false,
        message:
          "No push subscriptions found. Please enable push notifications in settings.",
      };
    }

    console.log("[Push] Found subscriptions:", {
      userId,
      count: subscriptions.length,
    });

    // Apply tone to title if possible
    let finalTitle = title;
    try {
      const tone = await getUserTone(userId);
      // Apply tone transformations to title (e.g., emoji changes)
      if (title.includes("⏰")) {
        switch (tone) {
          case "supportive":
            finalTitle = title.replace("⏰", "✨");
            break;
          case "direct":
            finalTitle = title.replace("⏰", "").trim();
            break;
          case "motivational":
            finalTitle = title.replace("⏰", "🚀");
            break;
          case "minimal":
            finalTitle = title.replace("⏰ Reminder", "Reminder");
            break;
          default:
            // Keep original
            break;
        }
      }
    } catch (error) {
      console.error("[Push] Failed to get user tone:", error);
      // Continue with original title
    }

    // Create notification payload
    const payload = JSON.stringify({
      title: finalTitle,
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
      subscriptions.map(
        async (subscription: {
          endpoint: string;
          p256dh: string;
          auth: string;
        }) => {
          try {
            const pushSubscription = {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            };

            console.log("[Push] Sending notification to:", {
              endpoint: subscription.endpoint.substring(0, 50) + "...",
              userId,
              timestamp: new Date().toISOString(),
            });

            await webpush.sendNotification(pushSubscription, payload);

            console.log("[Push] Notification sent successfully:", {
              endpoint: subscription.endpoint.substring(0, 50) + "...",
              userId,
              timestamp: new Date().toISOString(),
            });

            return { success: true, endpoint: subscription.endpoint };
          } catch (error) {
            const statusCode =
              error && typeof error === "object" && "statusCode" in error
                ? (error.statusCode as number)
                : undefined;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            console.error("[Push] Error sending to subscription:", {
              endpoint: subscription.endpoint.substring(0, 50) + "...",
              userId,
              error: errorMessage,
              statusCode,
              timestamp: new Date().toISOString(),
              errorType: error instanceof Error ? error.constructor.name : typeof error,
            });

            // If subscription is invalid, remove it from database
            if (statusCode === 410 || statusCode === 404) {
              console.warn(
                "[Push] Removing invalid subscription (status " + statusCode + "):",
                {
                  endpoint: subscription.endpoint.substring(0, 50) + "...",
                  userId,
                  reason: statusCode === 410 ? "Gone" : "Not Found",
                  timestamp: new Date().toISOString(),
                }
              );
              try {
                await supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("endpoint", subscription.endpoint);
                console.log("[Push] Invalid subscription removed from database");
              } catch (deleteError) {
                console.error("[Push] Failed to remove invalid subscription:", {
                  error: deleteError instanceof Error ? deleteError.message : String(deleteError),
                  endpoint: subscription.endpoint.substring(0, 50) + "...",
                });
              }
            }
            throw error;
          }
        }
      )
    );

    // Count successful sends
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const total = results.length;
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      console.error("[Push] Failed notifications:", {
        userId,
        total,
        successful,
        failed: failed.length,
        errors: failed.map((r) => {
          if (r.status === "rejected") {
            const reason = r.reason;
            return {
              message: reason instanceof Error ? reason.message : String(reason),
              statusCode: reason && typeof reason === "object" && "statusCode" in reason
                ? reason.statusCode
                : undefined,
            };
          }
          return null;
        }),
        timestamp: new Date().toISOString(),
      });
    }

    console.log("[Push] Notification results:", {
      userId,
      total,
      successful,
      failed: failed.length,
      successRate: total > 0 ? `${((successful / total) * 100).toFixed(1)}%` : "0%",
      timestamp: new Date().toISOString(),
    });

    return {
      success: successful > 0,
      message:
        successful === total
          ? "All notifications sent"
          : `${successful}/${total} notifications sent`,
      results,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Push notification failed";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("[Push] Fatal error sending push notification:", {
      userId,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    
    return {
      success: false,
      message: errorMessage,
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
