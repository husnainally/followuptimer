import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { sendReminderEmail } from '@/lib/email';
import { generateAffirmation } from '@/lib/affirmations';
import { sendPushNotification } from '@/lib/push-notification';
import { createInAppNotification } from '@/lib/in-app-notification';
import { logError, logInfo } from '@/lib/logger';
import {
  checkReminderSuppression,
  logReminderSuppression,
  recordCooldownTracking,
} from '@/lib/reminder-suppression';
import { getUserPreferences } from '@/lib/user-preferences';
import { logEvent } from '@/lib/events';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Process a single overdue reminder
 * This function contains the core logic from /api/reminders/send
 */
export async function processReminder(reminderId: string) {
  const supabase = createServiceClient();
  const isProduction = process.env.NODE_ENV === 'production';

  // Fetch reminder and user profile
  const { data: reminder, error: reminderError } = await supabase
    .from('reminders')
    .select('*, profiles:user_id(*)')
    .eq('id', reminderId)
    .single();

  if (reminderError || !reminder) {
    return {
      success: false,
      error: 'Reminder not found',
      reminderId,
    };
  }

  // CRITICAL: Check reminder status to prevent duplicate processing
  // If reminder is no longer pending (already sent/processed), skip it
  if (reminder.status !== 'pending') {
    if (!isProduction) {
      console.log('[Process-Overdue] Reminder already processed, skipping:', {
        reminderId,
        status: reminder.status,
      });
    }
    return {
      success: false,
      skipped: true,
      reason: 'Already processed',
      currentStatus: reminder.status,
      reminderId,
    };
  }

  // Check if reminder should be suppressed
  const profile = reminder.profiles;
  const timezone = profile?.timezone || 'UTC';
  const scheduledTime = new Date(reminder.remind_at);

  // Log reminder_due event when reminder time is reached
  const dueEventResult = await logEvent({
    userId: reminder.user_id,
    eventType: 'reminder_due',
    eventData: {
      reminder_id: reminderId,
      remind_at: scheduledTime.toISOString(),
      notification_method: reminder.notification_method,
    },
    source: 'app',
    reminderId: reminderId,
    contactId: reminder.contact_id || undefined,
    useServiceClient: true,
  });

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
      const { rescheduleReminder } = await import('@/lib/qstash');
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
            .from('reminders')
            .update({
              remind_at: suppressionCheck.nextAttemptTime.toISOString(),
              qstash_message_id: newQstashMessageId,
              status: 'snoozed',
            })
            .eq('id', reminderId);
        } catch (error) {
          console.error('Failed to reschedule suppressed reminder:', error);
        }
      }
    }

    return {
      success: false,
      suppressed: true,
      reason: suppressionCheck.reason,
      message: suppressionCheck.message,
      reminderId,
    };
  }

  // Get user preferences for notification channels and category controls
  const userPrefs = await getUserPreferences(reminder.user_id);
  const notificationChannels = userPrefs.notification_channels || ['email'];

  // Determine reminder category
  const isFollowup = !!reminder.contact_id;
  const isAffirmation =
    reminder.message.toLowerCase().includes('affirmation') ||
    reminder.message.toLowerCase().includes('motivation');
  const categoryEnabled = isFollowup
    ? userPrefs.category_notifications.followups
    : isAffirmation
    ? userPrefs.category_notifications.affirmations
    : userPrefs.category_notifications.general;

  // Check if category notifications are disabled
  if (!categoryEnabled) {
    logInfo('Reminder notification skipped - category disabled', {
      reminderId: reminder.id,
      category: isFollowup
        ? 'followups'
        : isAffirmation
        ? 'affirmations'
        : 'general',
    });
    return {
      success: false,
      suppressed: true,
      reason: 'CATEGORY_DISABLED',
      message: 'Notification skipped - category disabled in settings',
      reminderId,
    };
  }

  // Generate affirmation
  const affirmation = generateAffirmation(reminder.tone);

  // Check notification channels from preferences
  const emailEnabled =
    notificationChannels.includes('email') &&
    (profile?.email_notifications ?? true);
  const pushEnabled =
    notificationChannels.includes('push') &&
    (profile?.push_notifications ?? false);
  const inAppEnabled =
    notificationChannels.includes('in_app') &&
    (profile?.in_app_notifications ?? true);

  if (!isProduction) {
    console.log('[Process-Overdue] User preferences:', {
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
                subject: '⏰ Reminder from FollowUpTimer',
                message: reminder.message,
                affirmation,
                userId: reminder.user_id,
                contactId: reminder.contact_id || undefined,
                reminderId: reminderId,
              });
              notificationResults.push({ method: 'email', success: true });
              overallSuccess = true;

              // Log email send attempt
              await supabase.from('sent_logs').insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: 'email',
                status: 'delivered',
                success: true,
              });
            } else {
              notificationResults.push({
                method: 'email',
                success: false,
                error: 'No email address found for user',
              });

              // Log email failure
              await supabase.from('sent_logs').insert({
                user_id: reminder.user_id,
                reminder_id: reminderId,
                affirmation: affirmation,
                delivery_method: 'email',
                status: 'failed',
                success: false,
                error_message: 'No email address found for user',
              });
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Email send failed';
            notificationResults.push({
              method: 'email',
              success: false,
              error: errorMessage,
            });

            // Log email error
            await supabase.from('sent_logs').insert({
              user_id: reminder.user_id,
              reminder_id: reminderId,
              affirmation: affirmation,
              delivery_method: 'email',
              status: 'failed',
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
              title: '⏰ Reminder',
              message: reminder.message,
              affirmation,
            });

            if (pushResult.success) {
              overallSuccess = true;
            }

            notificationResults.push({
              method: 'push',
              success: pushResult.success,
              error: pushResult.success ? undefined : pushResult.message,
            });

            // Log push notification attempt
            await supabase.from('sent_logs').insert({
              user_id: reminder.user_id,
              reminder_id: reminderId,
              affirmation: affirmation,
              delivery_method: 'push',
              status: pushResult.success ? 'delivered' : 'failed',
              success: pushResult.success,
              error_message: pushResult.success ? null : pushResult.message,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Push notification failed';
            notificationResults.push({
              method: 'push',
              success: false,
              error: errorMessage,
            });

            // Log push notification error
            await supabase.from('sent_logs').insert({
              user_id: reminder.user_id,
              reminder_id: reminderId,
              affirmation: affirmation,
              delivery_method: 'push',
              status: 'failed',
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
              title: '⏰ Reminder',
              message: reminder.message,
              affirmation,
              useServiceClient: true,
            });

            if (inAppResult.success) {
              overallSuccess = true;
            }

            notificationResults.push({
              method: 'in_app',
              success: inAppResult.success,
              error: inAppResult.success ? undefined : inAppResult.error,
            });

            // Log in-app notification attempt
            await supabase.from('sent_logs').insert({
              user_id: reminder.user_id,
              reminder_id: reminderId,
              affirmation: affirmation,
              delivery_method: 'in_app',
              status: inAppResult.success ? 'delivered' : 'failed',
              success: inAppResult.success,
              error_message: inAppResult.success ? null : inAppResult.error,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'In-app notification failed';
            notificationResults.push({
              method: 'in_app',
              success: false,
              error: errorMessage,
            });

            // Log in-app notification error
            await supabase.from('sent_logs').insert({
              user_id: reminder.user_id,
              reminder_id: reminderId,
              affirmation: affirmation,
              delivery_method: 'in_app',
              status: 'failed',
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
        'No notification preferences enabled, using reminder notification_method',
        {
          reminderId: reminder.id,
          notificationMethod: reminder.notification_method,
        }
      );

      // Fallback to original behavior
      switch (reminder.notification_method) {
        case 'email':
          if (profile?.email) {
            await sendReminderEmail({
              to: profile.email,
              subject: '⏰ Reminder from FollowUpTimer',
              message: reminder.message,
              affirmation,
              userId: reminder.user_id,
              contactId: reminder.contact_id || undefined,
              reminderId: reminderId,
            });
            overallSuccess = true;
          }
          break;
        case 'push':
          const pushResult = await sendPushNotification({
            userId: reminder.user_id,
            title: '⏰ Reminder',
            message: reminder.message,
            affirmation,
          });
          overallSuccess = pushResult.success;
          break;
        case 'in_app':
          const inAppResult = await createInAppNotification({
            userId: reminder.user_id,
            reminderId: reminder.id,
            title: '⏰ Reminder',
            message: reminder.message,
            affirmation,
            useServiceClient: true,
          });
          overallSuccess = inAppResult.success;
          break;
      }

      // Log fallback attempt
      await supabase.from('sent_logs').insert({
        user_id: reminder.user_id,
        reminder_id: reminderId,
        affirmation: affirmation,
        delivery_method: reminder.notification_method,
        status: overallSuccess ? 'delivered' : 'failed',
        success: overallSuccess,
      });
    }
  } catch (notificationError: unknown) {
    const errorInfo = logError(notificationError, {
      reminderId: reminder.id,
      userId: reminder.user_id,
    });
    if (!isProduction) {
      console.error('[Process-Overdue] Notification error:', errorInfo);
    }
  }

  // Update reminder status atomically (only if still pending to prevent race conditions)
  // This ensures only one process can mark the reminder as sent
  const { data: updateResult, error: updateError } = await supabase
    .from('reminders')
    .update({ status: overallSuccess ? 'sent' : 'failed' })
    .eq('id', reminderId)
    .eq('status', 'pending') // Atomic check: only update if still pending
    .select('id')
    .single();

  // If update failed because status changed (race condition), log it but don't fail
  if (updateError && updateResult === null) {
    if (!isProduction) {
      console.log('[Process-Overdue] Reminder status changed during processing (race condition):', {
        reminderId,
        error: updateError.message,
      });
    }
    // Status was already updated by another process (likely QStash webhook)
    // This is expected behavior to prevent duplicates
  }

  // Log reminder_triggered event when reminder actually fires
  await logEvent({
    userId: reminder.user_id,
    eventType: 'reminder_triggered',
    eventData: {
      reminder_id: reminderId,
      intended_fire_time: scheduledTime.toISOString(),
      actual_fire_time: new Date().toISOString(),
      notification_method: reminder.notification_method,
    },
    source: 'app',
    reminderId: reminderId,
    contactId: reminder.contact_id || undefined,
    useServiceClient: true,
  });

  // Log reminder_completed event when reminder is successfully sent
  if (overallSuccess) {
    // Record cooldown tracking
    await recordCooldownTracking(
      reminder.user_id,
      reminderId,
      reminder.contact_id
    );

    // Fetch contact name if contact_id exists
    let contactName: string | undefined;
    if (reminder.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name')
        .eq('id', reminder.contact_id)
        .single();
      contactName = contact?.name;
    }

    const eventResult = await logEvent({
      userId: reminder.user_id,
      eventType: 'reminder_completed',
      eventData: {
        reminder_id: reminderId,
        notification_method: reminder.notification_method,
        message: reminder.message,
        contact_name: contactName,
      },
      source: 'app',
      reminderId: reminderId,
      contactId: reminder.contact_id || undefined,
      useServiceClient: true,
    });

    // Update streak tracking and create popups
    if (eventResult.success) {
      const { updateStreakOnCompletion } = await import(
        '@/lib/streak-tracking'
      );
      await updateStreakOnCompletion(reminder.user_id, reminderId);

      // Process the reminder_completed event for triggers
      const { processEventForTriggers } = await import('@/lib/trigger-manager');
      await processEventForTriggers(
        reminder.user_id,
        'reminder_completed',
        eventResult.eventId!,
        { reminder_id: reminderId }
      );

      // Create popup from reminder_completed event
      const { createPopupsFromEvent } = await import('@/lib/popup-engine');
      await createPopupsFromEvent({
        userId: reminder.user_id,
        eventId: eventResult.eventId!,
        eventType: 'reminder_completed',
        eventData: {
          reminder_id: reminderId,
          notification_method: reminder.notification_method,
          message: reminder.message,
          contact_name: contactName,
        },
        contactId: reminder.contact_id || undefined,
        reminderId: reminderId,
      });
    }
  }

  // Create popup from reminder_due event (for reminder_due popup rules)
  if (dueEventResult.success && dueEventResult.eventId) {
    const { createPopupsFromEvent } = await import('@/lib/popup-engine');
    await createPopupsFromEvent({
      userId: reminder.user_id,
      eventId: dueEventResult.eventId,
      eventType: 'reminder_due',
      eventData: {
        reminder_id: reminderId,
        remind_at: scheduledTime.toISOString(),
        notification_method: reminder.notification_method,
      },
      contactId: reminder.contact_id || undefined,
      reminderId: reminderId,
    });
  }

  return {
    success: overallSuccess,
    reminderId,
    results: notificationResults,
  };
}

/**
 * POST /api/reminders/process-overdue
 * Process overdue reminders for the current user
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reminderIds = body.reminder_ids as string[] | undefined;

    const serviceSupabase = createServiceClient();
    const now = new Date();

    // Find overdue reminders
    let query = serviceSupabase
      .from('reminders')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('remind_at', now.toISOString());

    // If specific reminder IDs provided, filter by them
    if (reminderIds && reminderIds.length > 0) {
      query = query.in('id', reminderIds);
    }

    const { data: overdueReminders, error } = await query;

    if (error) {
      console.error('Failed to fetch overdue reminders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch overdue reminders' },
        { status: 500 }
      );
    }

    if (!overdueReminders || overdueReminders.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        results: [],
      });
    }

    // Process each overdue reminder
    const results = await Promise.allSettled(
      overdueReminders.map((reminder) => processReminder(reminder.id))
    );

    const processed = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    const processedResults = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: overdueReminders.length,
      results: processedResults,
    });
  } catch (error: unknown) {
    const errorInfo = logError(error, {
      endpoint: '/api/reminders/process-overdue',
      method: 'POST',
    });
    return NextResponse.json({ error: errorInfo.message }, { status: 500 });
  }
}
