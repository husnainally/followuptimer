import { Client } from "@upstash/qstash";

// Use local QStash in development if QSTASH_URL is set to localhost
const isLocalQStash =
  process.env.QSTASH_URL?.includes("127.0.0.1") ||
  process.env.QSTASH_URL?.includes("localhost");

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
  baseUrl: process.env.QSTASH_URL || "https://qstash.upstash.io",
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
  // Ensure remindAt is a Date object
  const remindAtDate = remindAt instanceof Date ? remindAt : new Date(remindAt);

  // Check if the time is in the future
  const now = new Date();
  if (remindAtDate <= now) {
    throw new Error(
      `Cannot schedule reminder in the past. remindAt: ${remindAtDate.toISOString()}, now: ${now.toISOString()}`
    );
  }

  // Calculate delay in seconds
  const delaySeconds = Math.floor(
    (remindAtDate.getTime() - now.getTime()) / 1000
  );

  // QStash requires at least 1 second delay
  if (delaySeconds < 1) {
    throw new Error(`Reminder time must be at least 1 second in the future`);
  }

  console.log("[QStash] Scheduling reminder:", {
    reminderId,
    remindAt: remindAtDate.toISOString(),
    delaySeconds,
    callbackUrl,
  });

  try {
    const result = await qstash.publishJSON({
      url: callbackUrl,
      notBefore: Math.floor(remindAtDate.getTime() / 1000), // Unix timestamp in seconds
      body: {
        reminderId,
      },
    });

    console.log("[QStash] Successfully scheduled:", {
      messageId: result.messageId,
      reminderId,
      scheduledFor: remindAtDate.toISOString(),
    });

    return result.messageId;
  } catch (error) {
    console.error("[QStash] Scheduling error:", {
      error,
      reminderId,
      remindAt: remindAtDate.toISOString(),
      callbackUrl,
    });
    throw error;
  }
}

export async function cancelScheduledReminder(messageId: string) {
  try {
    await qstash.messages.delete(messageId);
    return true;
  } catch (error) {
    console.error("Failed to cancel QStash message:", error);
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
