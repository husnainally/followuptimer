import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { sendReminderEmail } from '@/lib/email';
import { generateAffirmation } from '@/lib/affirmations';
import { sendPushNotification } from '@/lib/push-notification';
import { createInAppNotification } from '@/lib/in-app-notification';

async function handler(request: Request) {
  try {
    const body = await request.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch reminder and user profile
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('*, profiles:user_id(*)')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Generate affirmation
    const affirmation = generateAffirmation(reminder.tone);

    let success = false;
    let errorMessage = null;

    // Send notification based on method
    try {
      switch (reminder.notification_method) {
        case 'email':
          if (reminder.profiles?.email) {
            await sendReminderEmail({
              to: reminder.profiles.email,
              subject: '⏰ Reminder from FollowUpTimer',
              message: reminder.message,
              affirmation,
            });
            success = true;
          } else {
            errorMessage = 'No email address found for user';
          }
          break;

        case 'push':
          const pushResult = await sendPushNotification({
            userId: reminder.user_id,
            title: '⏰ Reminder',
            message: reminder.message,
            affirmation,
          });
          success = pushResult.success;
          if (!pushResult.success) {
            errorMessage = pushResult.message || 'Push notification failed';
          }
          break;

        case 'in_app':
          const inAppResult = await createInAppNotification({
            userId: reminder.user_id,
            reminderId: reminder.id,
            title: '⏰ Reminder',
            message: reminder.message,
            affirmation,
          });
          success = inAppResult.success;
          if (!inAppResult.success) {
            errorMessage = inAppResult.error || 'In-app notification failed';
          }
          break;

        default:
          errorMessage = `Unknown notification method: ${reminder.notification_method}`;
      }
    } catch (notificationError: unknown) {
      errorMessage =
        notificationError instanceof Error
          ? notificationError.message
          : 'Notification send failed';
      console.error('Notification send failed:', notificationError);
    }

    // Update reminder status
    await supabase
      .from('reminders')
      .update({ status: success ? 'sent' : 'failed' })
      .eq('id', reminderId);

    // Log the send attempt (use 'affirmation' not 'affirmation_text')
    await supabase.from('sent_logs').insert({
      user_id: reminder.user_id,
      reminder_id: reminderId,
      affirmation: affirmation,
      delivery_method: reminder.notification_method,
      status: success ? 'delivered' : 'failed',
      success,
      error_message: errorMessage,
    });

    return NextResponse.json({ success });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message =
      error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : handler;
