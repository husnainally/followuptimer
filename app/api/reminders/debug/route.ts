import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * Debug endpoint to check QStash configuration and reminder status
 * GET /api/reminders/debug?reminderId=uuid
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get("reminderId");

    const debugInfo: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasQstashToken: !!process.env.QSTASH_TOKEN,
        hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        qstashUrl: process.env.QSTASH_URL || "https://qstash.upstash.io",
      },
    };

    if (reminderId) {
      const supabase = createServiceClient();
      const { data: reminder, error } = await supabase
        .from("reminders")
        .select("*, profiles:user_id(*)")
        .eq("id", reminderId)
        .single();

      if (error || !reminder) {
        debugInfo.reminder = { error: "Reminder not found", reminderId };
      } else {
        const remindAt = new Date(reminder.remind_at);
        const now = new Date();
        const isPast = remindAt <= now;
        const delaySeconds = Math.floor(
          (remindAt.getTime() - now.getTime()) / 1000
        );

        debugInfo.reminder = {
          id: reminder.id,
          message: reminder.message,
          remindAt: reminder.remind_at,
          remindAtDate: remindAt.toISOString(),
          now: now.toISOString(),
          isPast,
          delaySeconds,
          status: reminder.status,
          qstashMessageId: reminder.qstash_message_id,
          notificationMethod: reminder.notification_method,
          tone: reminder.tone,
          userPreferences: {
            email_notifications: reminder.profiles?.email_notifications,
            push_notifications: reminder.profiles?.push_notifications,
            in_app_notifications: reminder.profiles?.in_app_notifications,
          },
        };
      }
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
