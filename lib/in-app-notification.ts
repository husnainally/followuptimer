import { createClient } from '@/lib/supabase/server';

interface CreateInAppNotificationOptions {
  userId: string;
  reminderId: string;
  title: string;
  message: string;
  affirmation: string;
}

export async function createInAppNotification({
  userId,
  reminderId,
  title,
  message,
  affirmation,
}: CreateInAppNotificationOptions) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('in_app_notifications')
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
    console.error('Failed to create in-app notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
