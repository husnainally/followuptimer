import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
  baseUrl: process.env.QSTASH_URL || 'https://qstash.upstash.io',
});

interface ScheduleReminderOptions {
  reminderId: string;
  remindAt: Date;
  callbackUrl: string;
}

export async function scheduleReminder({
  reminderId,
  remindAt,
  callbackUrl,
}: ScheduleReminderOptions) {
  const result = await qstash.publishJSON({
    url: callbackUrl,
    notBefore: Math.floor(remindAt.getTime() / 1000), // Unix timestamp in seconds
    body: {
      reminderId,
    },
  });

  return result.messageId;
}

export async function cancelScheduledReminder(messageId: string) {
  try {
    await qstash.messages.delete(messageId);
    return true;
  } catch (error) {
    console.error('Failed to cancel QStash message:', error);
    return false;
  }
}

export async function rescheduleReminder(
  oldMessageId: string,
  options: ScheduleReminderOptions
) {
  await cancelScheduledReminder(oldMessageId);
  return await scheduleReminder(options);
}
