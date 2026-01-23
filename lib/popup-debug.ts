import { createServiceClient } from "@/lib/supabase/service";

/**
 * Log a blocked popup attempt for debugging
 */
export async function logPopupBlock({
  userId,
  ruleId,
  sourceEventId,
  reminderId,
  contactId,
  reason,
  context = {},
}: {
  userId: string;
  ruleId?: string;
  sourceEventId?: string;
  reminderId?: string;
  contactId?: string;
  reason: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("popup_blocks").insert({
      user_id: userId,
      rule_id: ruleId || null,
      source_event_id: sourceEventId || null,
      reminder_id: reminderId || null,
      contact_id: contactId || null,
      block_reason: reason,
      context,
    });
  } catch (error) {
    // Don't fail the main flow if logging fails
    console.error("[PopupDebug] Failed to log popup block:", error);
  }
}

/**
 * Log a popup creation attempt (success or failure)
 */
export async function logPopupCreationAttempt({
  userId,
  reminderId,
  eventLogged,
  eventId,
  popupCreated,
  popupId,
  errorMessage,
  context = {},
}: {
  userId: string;
  reminderId?: string;
  eventLogged: boolean;
  eventId?: string;
  popupCreated: boolean;
  popupId?: string;
  errorMessage?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("popup_creation_attempts").insert({
      user_id: userId,
      reminder_id: reminderId || null,
      event_logged: eventLogged,
      event_id: eventId || null,
      popup_created: popupCreated,
      popup_id: popupId || null,
      error_message: errorMessage || null,
      context,
    });
  } catch (error) {
    // Don't fail the main flow if logging fails
    console.error("[PopupDebug] Failed to log popup creation attempt:", error);
  }
}

/**
 * Get recent popup blocks for a user (for debugging)
 */
export async function getRecentPopupBlocks(
  userId: string,
  limit = 50
): Promise<{
  success: boolean;
  blocks?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("popup_blocks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      blocks: data || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get popup creation statistics for a user
 */
export async function getPopupCreationStats(
  userId: string,
  hours = 24
): Promise<{
  success: boolean;
  stats?: {
    total_attempts: number;
    successful_creations: number;
    failed_creations: number;
    event_logging_failures: number;
    success_rate: number;
    blocks_by_reason: Record<string, number>;
  };
  error?: string;
}> {
  try {
    const supabase = createServiceClient();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get creation attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from("popup_creation_attempts")
      .select("event_logged, popup_created")
      .eq("user_id", userId)
      .gte("created_at", cutoff);

    if (attemptsError) throw attemptsError;

    // Get blocks by reason
    const { data: blocks, error: blocksError } = await supabase
      .from("popup_blocks")
      .select("block_reason")
      .eq("user_id", userId)
      .gte("created_at", cutoff);

    if (blocksError) throw blocksError;

    const totalAttempts = attempts?.length || 0;
    const successfulCreations =
      attempts?.filter((a) => a.popup_created).length || 0;
    const failedCreations = totalAttempts - successfulCreations;
    const eventLoggingFailures =
      attempts?.filter((a) => !a.event_logged).length || 0;
    const successRate =
      totalAttempts > 0 ? (successfulCreations / totalAttempts) * 100 : 0;

    // Count blocks by reason
    const blocksByReason: Record<string, number> = {};
    blocks?.forEach((block) => {
      const reason = block.block_reason;
      blocksByReason[reason] = (blocksByReason[reason] || 0) + 1;
    });

    return {
      success: true,
      stats: {
        total_attempts: totalAttempts,
        successful_creations: successfulCreations,
        failed_creations: failedCreations,
        event_logging_failures: eventLoggingFailures,
        success_rate: Math.round(successRate * 100) / 100,
        blocks_by_reason: blocksByReason,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate a temporary event ID when event logging fails
 */
export function generateTempEventId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Check if an event ID is temporary
 */
export function isTempEventId(eventId: string): boolean {
  return eventId.startsWith("temp-");
}
