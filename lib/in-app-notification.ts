import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface CreateInAppNotificationOptions {
  userId: string;
  reminderId: string;
  title: string;
  message: string;
  affirmation: string;
  useServiceClient?: boolean;
}

export async function createInAppNotification({
  userId,
  reminderId,
  title,
  message,
  affirmation,
  useServiceClient = false,
}: CreateInAppNotificationOptions) {
  try {
    // Use service client in API routes (webhooks) or regular client in server components
    const supabase = useServiceClient
      ? createServiceClient()
      : await createClient();

    const { data, error } = await supabase
      .from("in_app_notifications")
      .insert({
        user_id: userId,
        reminder_id: reminderId,
        title,
        message,
        affirmation,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      notification: data,
    };
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
