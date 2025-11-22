import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { sendReminderEmail } from "@/lib/email";
import { generateAffirmation } from "@/lib/affirmations";
import { sendPushNotification } from "@/lib/push-notification";
import { createInAppNotification } from "@/lib/in-app-notification";

/**
 * Test endpoint to manually trigger reminder sending
 * Useful for testing notifications without waiting for QStash
 * 
 * Usage: POST /api/reminders/test-send
 * Body: { reminderId: "uuid" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }

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

    console.log("[Test Send] Notification preferences:", {
      email: emailEnabled,
      push: pushEnabled,
      inApp: inAppEnabled,
    });

    const results: Array<{ method: string; success: boolean; error?: string }> = [];

    // Send email if enabled
    if (emailEnabled && profile?.email) {
      try {
        await sendReminderEmail({
          to: profile.email,
          subject: "⏰ Test Reminder from FollowUpTimer",
          message: reminder.message,
          affirmation,
        });
        results.push({ method: "email", success: true });
      } catch (error) {
        results.push({
          method: "email",
          success: false,
          error: error instanceof Error ? error.message : "Email send failed",
        });
      }
    }

    // Send push if enabled
    if (pushEnabled) {
      try {
        const pushResult = await sendPushNotification({
          userId: reminder.user_id,
          title: "⏰ Test Reminder",
          message: reminder.message,
          affirmation,
        });
        results.push({
          method: "push",
          success: pushResult.success,
          error: pushResult.success ? undefined : pushResult.message,
        });
      } catch (error) {
        results.push({
          method: "push",
          success: false,
          error: error instanceof Error ? error.message : "Push send failed",
        });
      }
    }

    // Send in-app if enabled
    if (inAppEnabled) {
      try {
        const inAppResult = await createInAppNotification({
          userId: reminder.user_id,
          reminderId: reminder.id,
          title: "⏰ Test Reminder",
          message: reminder.message,
          affirmation,
          useServiceClient: true,
        });
        results.push({
          method: "in_app",
          success: inAppResult.success,
          error: inAppResult.success ? undefined : inAppResult.error,
        });
      } catch (error) {
        results.push({
          method: "in_app",
          success: false,
          error: error instanceof Error ? error.message : "In-app send failed",
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);

    return NextResponse.json({
      success: anySuccess,
      message: allSuccess
        ? "All notifications sent successfully"
        : "Some notifications failed",
      results,
      preferences: {
        email: emailEnabled,
        push: pushEnabled,
        inApp: inAppEnabled,
      },
    });
  } catch (error) {
    console.error("[Test Send] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

