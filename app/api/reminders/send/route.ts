import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { sendReminderEmail } from "@/lib/email";
import { generateAffirmation } from "@/lib/affirmations";
import { sendPushNotification } from "@/lib/push-notification";
import { createInAppNotification } from "@/lib/in-app-notification";
import { logError, logInfo } from "@/lib/logger";
import {
  checkReminderSuppression,
  logReminderSuppression,
  recordCooldownTracking,
} from "@/lib/reminder-suppression";
import { getUserPreferences } from "@/lib/user-preferences";
import {
  checkAndHandleConflicts,
  deliverBundle,
} from "@/lib/reminder-conflict-resolution";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Check if reminder should be suppressed
    const profile = reminder.profiles;
    const timezone = profile?.timezone || "UTC";
    const scheduledTime = new Date(reminder.remind_at);

    // Log reminder_due event when reminder time is reached
    const { logEvent } = await import("@/lib/events");
    const dueEventResult = await logEvent({
      userId: reminder.user_id,
      eventType: "reminder_due",
      eventData: {
        reminder_id: reminderId,
        remind_at: scheduledTime.toISOString(),
        notification_method: reminder.notification_method,
      },
      source: "scheduler",
      reminderId: reminderId,
      contactId: reminder.contact_id || undefined,
      useServiceClient: true,
    });

    // Check for conflicts and handle bundling
    const conflictCheck = await checkAndHandleConflicts(
      reminder.user_id,
      reminderId,
      scheduledTime
    );

    // If reminder should be bundled, check if bundle should be delivered
    if (conflictCheck.shouldBundle && conflictCheck.bundleId) {
      // Check if this is the first reminder in the bundle to trigger delivery
      // (We deliver when the bundle time is reached)
      const bundleTime = new Date(scheduledTime);
      const now = new Date();

      // If bundle time has been reached, deliver the bundle
      if (now >= bundleTime) {
        const bundleDelivered = await deliverBundle(
          conflictCheck.bundleId,
          reminder.user_id
        );

        if (bundleDelivered) {
          return NextResponse.json({
            success: true,
            bundled: true,
            bundle_id: conflictCheck.bundleId,
            message: "Reminder delivered as part of bundle",
          });
        }
      } else {
        // Bundle time not reached yet, suppress this individual reminder
        return NextResponse.json({
          success: false,
          suppressed: true,
          reason: "BUNDLED",
          message: "Reminder will be delivered as part of bundle",
          bundle_id: conflictCheck.bundleId,
        });
      }
    }

    const suppressionCheck = await checkReminderSuppression(
      reminder.user_id,
      reminderId,
      scheduledTime,
      timezone
    );

    // If suppressed, log and reschedule
    if (suppressionCheck.suppressed && suppressionCheck.reason) {
      await logReminderSuppression(
        reminder.user_id,
        reminderId,
        suppressionCheck.reason,
        scheduledTime,
        suppressionCheck.nextAttemptTime
      );

      // Reschedule reminder to next valid time
      if (suppressionCheck.nextAttemptTime) {
        const { rescheduleReminder } = await import("@/lib/qstash");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (appUrl && reminder.qstash_message_id) {
          try {
            const newQstashMessageId = await rescheduleReminder(
              reminder.qstash_message_id,
              {
                reminderId: reminder.id,
                remindAt: suppressionCheck.nextAttemptTime,
                callbackUrl: `${appUrl}/api/reminders/send`,
              }
            );

            await supabase
              .from("reminders")
              .update({
                remind_at: suppressionCheck.nextAttemptTime.toISOString(),
                qstash_message_id: newQstashMessageId,
                status: "snoozed",
              })
              .eq("id", reminderId);
          } catch (error) {
            console.error("Failed to reschedule suppressed reminder:", error);
          }
        }
      }

      return NextResponse.json({
        success: false,
        suppressed: true,
        reason: suppressionCheck.reason,
        message: suppressionCheck.message,
        next_attempt_time: suppressionCheck.nextAttemptTime?.toISOString(),
      });
    }

    // Get user preferences for notification channels and category controls
    const userPrefs = await getUserPreferences(reminder.user_id);
    const notificationChannels = userPrefs.notification_channels || ["email"];

    // Determine reminder category (simplified: check if it's a follow-up by contact_id)
    const isFollowup = !!reminder.contact_id;
    const isAffirmation =
      reminder.message.toLowerCase().includes("affirmation") ||
      reminder.message.toLowerCase().includes("motivation");
    const categoryEnabled = isFollowup
      ? userPrefs.category_notifications.followups
      : isAffirmation
      ? userPrefs.category_notifications.affirmations
      : userPrefs.category_notifications.general;

    // Check if category notifications are disabled
    if (!categoryEnabled) {
      logInfo("Reminder notification skipped - category disabled", {
        reminderId: reminder.id,
        category: isFollowup
          ? "followups"
          : isAffirmation
          ? "affirmations"
          : "general",
      });
      return NextResponse.json({
        success: false,
        suppressed: true,
        reason: "CATEGORY_DISABLED",
        message: "Notification skipped - category disabled in settings",
      });
    }

    // Generate affirmation
    const affirmation = generateAffirmation(reminder.tone);

    // Check notification channels from preferences
    const emailEnabled =
      notificationChannels.includes("email") &&
      (profile?.email_notifications ?? true);
    const pushEnabled =
      notificationChannels.includes("push") &&
      (profile?.push_notifications ?? false);
    const inAppEnabled =
      notificationChannels.includes("in_app") &&
      (profile?.in_app_notifications ?? true);

    if (!isProduction) {
      console.log("[Webhook] User preferences:", {
        userId: reminder.user_id,
        channels: notificationChannels,
        email: emailEnabled,
        push: pushEnabled,
        inApp: inAppEnabled,
        categoryEnabled,
        userEmail: profile?.email,
      });
    }

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
                  userId: reminder.user_id,
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

              // Log email error as WARNING, not error (non-blocking)
              console.warn("[Email] Email send failed (non-blocking):", {
                error: errorMessage,
                reminderId: reminderId,
                userId: reminder.user_id,
                to: profile?.email,
              });

              // Log email error to database
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
    const now = new Date();
    const updateData: any = { status: overallSuccess ? "sent" : "failed" };

    // If reminder was successfully sent and has a contact, update last_interaction_at
    if (overallSuccess && reminder.contact_id) {
      updateData.last_interaction_at = now.toISOString();

      // Update contact's last_interaction_at as well
      await supabase
        .from("contacts")
        .update({ updated_at: now.toISOString() })
        .eq("id", reminder.contact_id);
    }

    // Reminder status update removed - completion only happens when user clicks "Mark Done" in popup

    // Log reminder_triggered event when reminder actually fires
    // Note: reminder_completed event is only logged when user clicks "Mark Done" in popup
    await logEvent({
      userId: reminder.user_id,
      eventType: "reminder_triggered",
      eventData: {
        reminder_id: reminderId,
        intended_fire_time: scheduledTime.toISOString(),
        actual_fire_time: new Date().toISOString(),
        notification_method: reminder.notification_method,
      },
      source: "scheduler",
      reminderId: reminderId,
      contactId: reminder.contact_id || undefined,
      useServiceClient: true,
    });

    // Create popup from reminder_due event (for reminder_due popup rules)
    // This should happen regardless of notification success - popups show when reminder is due
    if (dueEventResult.success && dueEventResult.eventId) {
      try {
        const { createPopupsFromEvent } = await import("@/lib/popup-engine");
        await createPopupsFromEvent({
          userId: reminder.user_id,
          eventId: dueEventResult.eventId,
          eventType: "reminder_due",
          eventData: {
            reminder_id: reminderId,
            remind_at: scheduledTime.toISOString(),
            notification_method: reminder.notification_method,
          },
          contactId: reminder.contact_id || undefined,
          reminderId: reminderId,
        });
      } catch (popupError) {
        // Log but don't fail - popup creation is non-critical
        if (!isProduction) {
          console.warn(
            "[Webhook] Failed to create popup from reminder_due event:",
            popupError
          );
        }
      }
    }

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
// Skip signature verification for local QStash development
const isLocalQStash =
  process.env.QSTASH_URL?.includes("127.0.0.1") ||
  process.env.QSTASH_URL?.includes("localhost");

export const POST =
  process.env.QSTASH_CURRENT_SIGNING_KEY && !isLocalQStash
    ? verifySignatureAppRouter(handler)
    : handler;
