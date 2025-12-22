import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface CreateInAppNotificationOptions {
  userId: string;
  reminderId?: string;
  title: string;
  message: string;
  affirmation?: string;
  type?: "reminder" | "weekly_digest" | "other";
  data?: Record<string, unknown>;
  useServiceClient?: boolean;
}

export async function createInAppNotification({
  userId,
  reminderId,
  title,
  message,
  affirmation,
  type = "reminder",
  data,
  useServiceClient = false,
}: CreateInAppNotificationOptions) {
  try {
    // Use service client in API routes (webhooks) or regular client in server components
    const supabase = useServiceClient
      ? createServiceClient()
      : await createClient();

    const insertData: Record<string, unknown> = {
      user_id: userId,
      title,
      message,
      is_read: false,
    };

    // Only include reminder_id if provided (weekly digests don't have reminder_id)
    if (reminderId) {
      insertData.reminder_id = reminderId;
    }

    // Include affirmation if provided
    if (affirmation) {
      insertData.affirmation = affirmation;
    }

    // Store type and data in a JSONB field if available, or in message/data fields
    if (type === "weekly_digest" && data) {
      // Store digest data in a JSONB field if the table supports it
      // For now, we'll encode it in the message or use a separate field if available
      insertData.data = data;
    }

    const { data: notification, error } = await supabase
      .from("in_app_notifications")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      notification: notification,
    };
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
