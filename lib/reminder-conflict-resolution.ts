import { createServiceClient } from "@/lib/supabase/service";
import { getUserSnoozePreferences } from "@/lib/snooze-rules";
import { logEvent } from "@/lib/events";

export type BundleFormat = "list" | "summary" | "combined";

export interface ReminderConflict {
  reminderIds: string[];
  bundleTime: Date;
  userId: string;
}

export interface ReminderBundle {
  id: string;
  user_id: string;
  bundle_time: string;
  reminder_ids: string[];
  delivery_format: BundleFormat;
  delivered: boolean;
}

/**
 * Detect reminders that are due within the same time window (conflicts)
 */
export async function detectReminderConflicts(
  userId: string,
  reminderId: string,
  scheduledTime: Date,
  windowMinutes: number = 5
): Promise<ReminderConflict | null> {
  try {
    const supabase = createServiceClient();

    // Calculate time window
    const windowStart = new Date(scheduledTime.getTime() - windowMinutes * 60 * 1000);
    const windowEnd = new Date(scheduledTime.getTime() + windowMinutes * 60 * 1000);

    // Find reminders due in the same window
    const { data: conflicts } = await supabase
      .from("reminders")
      .select("id, remind_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("remind_at", windowStart.toISOString())
      .lte("remind_at", windowEnd.toISOString())
      .neq("id", reminderId);

    if (!conflicts || conflicts.length === 0) {
      return null; // No conflicts
    }

    // Group reminders by time (within 1 minute)
    const conflictIds = [reminderId, ...conflicts.map((c) => c.id)];
    const bundleTime = scheduledTime;

    return {
      reminderIds: conflictIds,
      bundleTime,
      userId,
    };
  } catch (error) {
    console.error("Failed to detect reminder conflicts:", error);
    return null;
  }
}

/**
 * Create a bundle for conflicting reminders
 */
export async function createReminderBundle(
  userId: string,
  reminderIds: string[],
  bundleTime: Date,
  format: BundleFormat
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data: bundle, error } = await supabase
      .from("reminder_bundles")
      .insert({
        user_id: userId,
        bundle_time: bundleTime.toISOString(),
        reminder_ids: reminderIds,
        delivery_format: format,
        delivered: false,
      })
      .select("id")
      .single();

    if (error) throw error;

    return bundle?.id || null;
  } catch (error) {
    console.error("Failed to create reminder bundle:", error);
    return null;
  }
}

/**
 * Format bundled reminder message
 */
export async function formatBundleMessage(
  reminderIds: string[],
  format: BundleFormat
): Promise<string> {
  try {
    const supabase = createServiceClient();

    // Fetch all reminders
    const { data: reminders } = await supabase
      .from("reminders")
      .select("id, message, contact_id, contacts:contact_id(name)")
      .in("id", reminderIds);

    if (!reminders || reminders.length === 0) {
      return "You have multiple reminders due.";
    }

    if (format === "list") {
      // List format: Show each reminder
      const items = reminders.map((r, idx) => {
        const contactName = (r.contacts as { name?: string } | null)?.name;
        const prefix = contactName ? `${contactName}: ` : "";
        return `${idx + 1}. ${prefix}${r.message}`;
      });
      return `You have ${reminders.length} reminders due:\n\n${items.join("\n")}`;
    } else if (format === "summary") {
      // Summary format: Count and brief summary
      const contactCount = reminders.filter((r) => r.contact_id).length;
      const genericCount = reminders.length - contactCount;
      let summary = `You have ${reminders.length} reminder${reminders.length > 1 ? "s" : ""} due`;
      if (contactCount > 0) {
        summary += ` (${contactCount} follow-up${contactCount > 1 ? "s" : ""}`;
        if (genericCount > 0) {
          summary += `, ${genericCount} other${genericCount > 1 ? "s" : ""}`;
        }
        summary += ")";
      }
      return summary;
    } else {
      // Combined format: Single combined message
      return `You have ${reminders.length} reminder${reminders.length > 1 ? "s" : ""} due. Check your reminders to see details.`;
    }
  } catch (error) {
    console.error("Failed to format bundle message:", error);
    return "You have multiple reminders due.";
  }
}

/**
 * Deliver a bundled reminder
 */
export async function deliverBundle(
  bundleId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    // Get bundle
    const { data: bundle } = await supabase
      .from("reminder_bundles")
      .select("*")
      .eq("id", bundleId)
      .eq("user_id", userId)
      .single();

    if (!bundle || bundle.delivered) {
      return false;
    }

    // Format message
    const message = await formatBundleMessage(
      bundle.reminder_ids,
      bundle.delivery_format as BundleFormat
    );

    // Mark all reminders in bundle as sent
    await supabase
      .from("reminders")
      .update({ status: "sent" })
      .in("id", bundle.reminder_ids);

    // Mark bundle as delivered
    await supabase
      .from("reminder_bundles")
      .update({ delivered: true })
      .eq("id", bundleId);

    // Log bundle delivery event
    await logEvent({
      userId,
      eventType: "reminder_scheduled",
      eventData: {
        bundle_id: bundleId,
        reminder_ids: bundle.reminder_ids,
        bundle_format: bundle.delivery_format,
        message,
      },
      source: "app",
      useServiceClient: true,
    });

    return true;
  } catch (error) {
    console.error("Failed to deliver bundle:", error);
    return false;
  }
}

/**
 * Check if reminder should be bundled and handle bundling
 */
export async function checkAndHandleConflicts(
  userId: string,
  reminderId: string,
  scheduledTime: Date
): Promise<{
  shouldBundle: boolean;
  bundleId?: string;
  conflict?: ReminderConflict;
}> {
  try {
    const prefs = await getUserSnoozePreferences(userId);

    // Check if bundling is enabled
    if (!prefs.bundle_enabled) {
      return { shouldBundle: false };
    }

    // Detect conflicts
    const conflict = await detectReminderConflicts(
      userId,
      reminderId,
      scheduledTime,
      prefs.bundle_window_minutes || 5
    );

    if (!conflict) {
      return { shouldBundle: false };
    }

    // Check if bundle already exists for this time window
    const supabase = createServiceClient();
    const windowStart = new Date(
      conflict.bundleTime.getTime() - (prefs.bundle_window_minutes || 5) * 60 * 1000
    );
    const windowEnd = new Date(
      conflict.bundleTime.getTime() + (prefs.bundle_window_minutes || 5) * 60 * 1000
    );

    const { data: existingBundle } = await supabase
      .from("reminder_bundles")
      .select("id")
      .eq("user_id", userId)
      .eq("delivered", false)
      .gte("bundle_time", windowStart.toISOString())
      .lte("bundle_time", windowEnd.toISOString())
      .single();

    if (existingBundle) {
      // Add reminder to existing bundle
      const { data: bundle } = await supabase
        .from("reminder_bundles")
        .select("reminder_ids")
        .eq("id", existingBundle.id)
        .single();

      if (bundle && !bundle.reminder_ids.includes(reminderId)) {
        await supabase
          .from("reminder_bundles")
          .update({
            reminder_ids: [...bundle.reminder_ids, reminderId],
          })
          .eq("id", existingBundle.id);
      }

      return {
        shouldBundle: true,
        bundleId: existingBundle.id,
        conflict,
      };
    }

    // Create new bundle
    const bundleId = await createReminderBundle(
      userId,
      conflict.reminderIds,
      conflict.bundleTime,
      (prefs.bundle_format as BundleFormat) || "list"
    );

    return {
      shouldBundle: true,
      bundleId: bundleId || undefined,
      conflict,
    };
  } catch (error) {
    console.error("Failed to check and handle conflicts:", error);
    return { shouldBundle: false };
  }
}
