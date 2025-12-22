import { getUserPreferences, ToneStyle } from "./user-preferences";
import { getToneCopy, formatTimeForTone } from "./tone-copy";

/**
 * Get user's tone preference
 */
export async function getUserTone(userId: string): Promise<ToneStyle> {
  const prefs = await getUserPreferences(userId);
  return prefs.tone_style;
}

/**
 * Get tone-specific copy with context
 */
export function getToneMessage(
  key: string,
  tone: ToneStyle,
  context?: Record<string, string | number | Date>
): string {
  // Convert Date objects to formatted strings
  const processedContext: Record<string, string | number> = {};
  if (context) {
    for (const [k, v] of Object.entries(context)) {
      if (v instanceof Date) {
        processedContext[k] = formatTimeForTone(v, tone);
      } else {
        processedContext[k] = v;
      }
    }
  }

  return getToneCopy(key, tone, processedContext);
}

/**
 * Apply tone to a message (for dynamic message transformation if needed)
 * Currently returns the message as-is, but can be extended for tone transformations
 */
export function applyToneToMessage(
  message: string,
  tone: ToneStyle
): string {
  // For now, tone doesn't transform existing messages
  // It only affects system-generated copy
  // This function can be extended in the future if needed
  return message;
}

/**
 * Get tone-specific subject line for emails
 */
export function getToneSubject(
  baseSubject: string,
  tone: ToneStyle
): string {
  switch (tone) {
    case "supportive":
      return baseSubject.replace("⏰", "✨").replace("Reminder", "Friendly Reminder");
    case "direct":
      return baseSubject.replace("⏰", "").trim();
    case "motivational":
      return baseSubject.replace("⏰", "🚀").replace("Reminder", "Action Reminder");
    case "minimal":
      return baseSubject.replace("⏰ Reminder from FollowUpTimer", "Reminder");
    case "neutral":
    default:
      return baseSubject;
  }
}

