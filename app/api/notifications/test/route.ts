import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendReminderEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push-notification";
import { generateAffirmation } from "@/lib/affirmations";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * Test endpoint for debugging email and push notifications
 * POST /api/notifications/test
 * Body: { type: "email" | "push" | "both", reminderId?: string }
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

    const body = await request.json();
    const { type = "both" } = body;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const results: Record<
      string,
      {
        success: boolean;
        error?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      }
    > = {};
    const affirmation = generateAffirmation("motivational");

    // Test email
    if (type === "email" || type === "both") {
      try {
        if (!profile.email) {
          results.email = {
            success: false,
            error: "No email address in profile",
          };
        } else if (!profile.email_notifications) {
          results.email = {
            success: false,
            error: "Email notifications disabled in profile",
          };
        } else {
          const emailResult = await sendReminderEmail({
            to: profile.email,
            subject: "🧪 Test Email from FollowUpTimer",
            message:
              "This is a test reminder to verify email notifications are working.",
            affirmation,
          });

          results.email = {
            success: true,
            message: "Email sent successfully",
            data: emailResult,
          };
        }
      } catch (error) {
        results.email = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Test push
    if (type === "push" || type === "both") {
      try {
        if (!profile.push_notifications) {
          results.push = {
            success: false,
            error: "Push notifications disabled in profile",
          };
        } else {
          const pushResult = await sendPushNotification({
            userId: user.id,
            title: "🧪 Test Push Notification",
            message:
              "This is a test reminder to verify push notifications are working.",
            affirmation,
          });

          results.push = {
            success: pushResult.success,
            message: pushResult.message,
            results: pushResult.results,
          };
        }
      } catch (error) {
        results.push = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Check configuration
    const config = {
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      hasResendFrom: !!process.env.RESEND_FROM,
      hasVapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      hasVapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
      userEmail: profile.email,
      emailNotificationsEnabled: profile.email_notifications,
      pushNotificationsEnabled: profile.push_notifications,
    };

    return NextResponse.json({
      success: true,
      config,
      results,
    });
  } catch (error) {
    console.error("[Test] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
