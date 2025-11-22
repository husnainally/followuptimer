import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { sendReminderEmail } from "@/lib/email";
import { generateAffirmation } from "@/lib/affirmations";
import { sendPushNotification } from "@/lib/push-notification";
import { createInAppNotification } from "@/lib/in-app-notification";
import { logError, logInfo } from "@/lib/logger";

async function handler(request: Request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      console.log("[Webhook] Received request at:", new Date().toISOString());
    }

    const body = await request.json();
    const { reminderId } = body;

    if (!isProduction) {
      console.log("[Webhook] Processing reminder:", reminderId);
    }

    if (!reminderId) {
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS since webhooks don't have user session
    const supabase = createServiceClient();

    // Fetch reminder and user profile
    const { data: reminder, error: reminderError } = await supabase
      .from("reminders")
      .select("*, profiles:user_id(*)")
      .eq("id", reminderId)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Generate affirmation
    const affirmation = generateAffirmation(reminder.tone);

    // Get user's notification preferences
    const profile = reminder.profiles;
    const emailEnabled = profile?.email_notifications ?? false;
    const pushEnabled = profile?.push_notifications ?? false;
    const inAppEnabled = profile?.in_app_notifications ?? false;

    // Track results for all notification types
    const notificationResults: Array<{
      method: string;
      success: boolean;
      error?: string;
    }> = [];

    let overallSuccess = false;

    // Send notifications based on user preferences
    try {
      const sendPromises: Promise<void>[] = [];

      // Send email notification if enabled
      if (emailEnabled) {
        sendPromises.push(
          (async () => {
            try {
              if (profile?.email) {
                await sendReminderEmail({
                  to: profile.email,
                  subject: "⏰ Reminder from FollowUpTimer",
                  message: reminder.message,
                  affirmation,
                });
                notificationResults.push({ method: "email", success: true });
                overallSuccess = true;

                // Log email send attempt
                await supabase.from("sent_logs").insert({
                  user_id: reminder.user_id,
                  reminder_id: reminderId,
                  affirmation: affirmation,
                  delivery_method: "email",
                  status: "delivered",
                  success: true,
                });
              } else {
                notificationResults.push({
                  method: "email",
                  success: false,
                  error: "No email address found for user",
                });

                // Log email failure
                await supabase.from("sent_logs").insert({
                  user_id: reminder.user_id,
                  reminder_id: reminderId,
                  affirmation: affirmation,
                  delivery_method: "email",
                  status: "failed",
                  success: false,
                  error_message: "No email address found for user",
                });
              }
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Email send failed";
              notificationResults.push({
                method: "email",
                success: false,
                error: errorMessage,
              });

              // Log email error
              await supabase.from("sent_logs").insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: "email",
                status: "failed",
                success: false,
                error_message: errorMessage,
              });
            }
          })()
        );
      }

      // Send push notification if enabled
      if (pushEnabled) {
        sendPromises.push(
          (async () => {
            try {
              const pushResult = await sendPushNotification({
                userId: reminder.user_id,
                title: "⏰ Reminder",
                message: reminder.message,
                affirmation,
              });

              if (pushResult.success) {
                overallSuccess = true;
              }

              notificationResults.push({
                method: "push",
                success: pushResult.success,
                error: pushResult.success ? undefined : pushResult.message,
              });

              // Log push notification attempt
              await supabase.from("sent_logs").insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: "push",
                status: pushResult.success ? "delivered" : "failed",
                success: pushResult.success,
                error_message: pushResult.success ? null : pushResult.message,
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "Push notification failed";
              notificationResults.push({
                method: "push",
                success: false,
                error: errorMessage,
              });

              // Log push notification error
              await supabase.from("sent_logs").insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: "push",
                status: "failed",
                success: false,
                error_message: errorMessage,
              });
            }
          })()
        );
      }

      // Send in-app notification if enabled
      if (inAppEnabled) {
        sendPromises.push(
          (async () => {
            try {
              const inAppResult = await createInAppNotification({
                userId: reminder.user_id,
                reminderId: reminder.id,
                title: "⏰ Reminder",
                message: reminder.message,
                affirmation,
                useServiceClient: true,
              });

              if (inAppResult.success) {
                overallSuccess = true;
              }

              notificationResults.push({
                method: "in_app",
                success: inAppResult.success,
                error: inAppResult.success ? undefined : inAppResult.error,
              });

              // Log in-app notification attempt
              await supabase.from("sent_logs").insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: "in_app",
                status: inAppResult.success ? "delivered" : "failed",
                success: inAppResult.success,
                error_message: inAppResult.success ? null : inAppResult.error,
              });
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "In-app notification failed";
              notificationResults.push({
                method: "in_app",
                success: false,
                error: errorMessage,
              });

              // Log in-app notification error
              await supabase.from("sent_logs").insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: "in_app",
                status: "failed",
                success: false,
                error_message: errorMessage,
              });
            }
          })()
        );
      }

      // Wait for all notifications to complete
      await Promise.allSettled(sendPromises);

      // If no preferences are enabled, send based on reminder's notification_method (fallback)
      if (!emailEnabled && !pushEnabled && !inAppEnabled) {
        logInfo(
          "No notification preferences enabled, using reminder notification_method",
          {
            reminderId: reminder.id,
            notificationMethod: reminder.notification_method,
          }
        );

        // Fallback to original behavior
        switch (reminder.notification_method) {
          case "email":
            if (profile?.email) {
              await sendReminderEmail({
                to: profile.email,
                subject: "⏰ Reminder from FollowUpTimer",
                message: reminder.message,
                affirmation,
              });
              overallSuccess = true;
            }
            break;
          case "push":
            const pushResult = await sendPushNotification({
              userId: reminder.user_id,
              title: "⏰ Reminder",
              message: reminder.message,
              affirmation,
            });
            overallSuccess = pushResult.success;
            break;
          case "in_app":
            const inAppResult = await createInAppNotification({
              userId: reminder.user_id,
              reminderId: reminder.id,
              title: "⏰ Reminder",
              message: reminder.message,
              affirmation,
              useServiceClient: true,
            });
            overallSuccess = inAppResult.success;
            break;
        }

        // Log fallback attempt
        await supabase.from("sent_logs").insert({
          user_id: reminder.user_id,
          reminder_id: reminderId,
          affirmation: affirmation,
          delivery_method: reminder.notification_method,
          status: overallSuccess ? "delivered" : "failed",
          success: overallSuccess,
        });
      }
    } catch (notificationError: unknown) {
      const errorInfo = logError(notificationError, {
        reminderId: reminder.id,
        userId: reminder.user_id,
      });
      if (!isProduction) {
        console.error("[Webhook] Notification error:", errorInfo);
      }
    }

    // Update reminder status (success if at least one notification succeeded)
    await supabase
      .from("reminders")
      .update({ status: overallSuccess ? "sent" : "failed" })
      .eq("id", reminderId);

    if (!isProduction) {
      console.log("[Webhook] Reminder status updated:", {
        status: overallSuccess ? "sent" : "failed",
        results: notificationResults,
      });
    }

    if (!isProduction || !overallSuccess) {
      // Always log errors, only log success in development
      console.log("[Webhook] Notification completed:", {
        success: overallSuccess,
        results: notificationResults,
        preferences: {
          email: emailEnabled,
          push: pushEnabled,
          inApp: inAppEnabled,
        },
      });
    }

    return NextResponse.json({
      success: overallSuccess,
      results: notificationResults,
    });
  } catch (error: unknown) {
    const errorInfo = logError(error, {
      endpoint: "/api/reminders/send",
      method: "POST",
    });
    return NextResponse.json({ error: errorInfo.message }, { status: 500 });
  }
}

// Enable signature verification in production (when QSTASH_CURRENT_SIGNING_KEY is set)
// In development with local QStash, signature verification still works
export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : handler;
