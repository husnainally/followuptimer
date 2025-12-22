import { createServiceClient } from "@/lib/supabase/service";

export type ToneStyle = "neutral" | "supportive" | "direct" | "motivational" | "minimal";
export type NotificationIntensity = "standard" | "reduced" | "essential_only";
export type OverdueHandling = "gentle_nudge" | "escalation" | "none";
export type SuppressionTransparency = "proactive" | "on_open";

export interface UserPreferences {
  user_id: string;
  tone_style: ToneStyle;
  notification_channels: string[]; // ['push', 'email', 'in_app']
  notification_intensity: NotificationIntensity;
  category_notifications: {
    followups: boolean;
    affirmations: boolean;
    general: boolean;
  };
  default_snooze_minutes: number;
  default_followup_interval_days: number;
  auto_create_followup: boolean;
  overdue_handling: OverdueHandling;
  suppression_transparency: SuppressionTransparency;
  digest_tone_inherit: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get default user preferences
 */
export function getDefaultPreferences(): Omit<UserPreferences, "user_id" | "created_at" | "updated_at"> {
  return {
    tone_style: "neutral",
    notification_channels: ["email"],
    notification_intensity: "standard",
    category_notifications: {
      followups: true,
      affirmations: true,
      general: true,
    },
    default_snooze_minutes: 30,
    default_followup_interval_days: 3,
    auto_create_followup: false,
    overdue_handling: "gentle_nudge",
    suppression_transparency: "proactive",
    digest_tone_inherit: true,
  };
}

/**
 * Validate user preferences
 */
export function validatePreferences(
  prefs: Partial<UserPreferences>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (prefs.default_snooze_minutes !== undefined) {
    if (prefs.default_snooze_minutes < 5 || prefs.default_snooze_minutes > 1440) {
      errors.push("default_snooze_minutes must be between 5 and 1440 (24 hours)");
    }
  }

  if (prefs.default_followup_interval_days !== undefined) {
    if (prefs.default_followup_interval_days < 1 || prefs.default_followup_interval_days > 365) {
      errors.push("default_followup_interval_days must be between 1 and 365");
    }
  }

  if (prefs.notification_channels !== undefined) {
    if (!Array.isArray(prefs.notification_channels)) {
      errors.push("notification_channels must be an array");
    } else if (prefs.notification_channels.length === 0) {
      errors.push("At least one notification channel must be enabled");
    }
    const validChannels = ["push", "email", "in_app"];
    const invalidChannels = prefs.notification_channels.filter(
      (ch) => !validChannels.includes(ch)
    );
    if (invalidChannels.length > 0) {
      errors.push(`Invalid notification channels: ${invalidChannels.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge preferences with defaults
 */
export function mergeWithDefaults(
  prefs: Partial<UserPreferences>
): Omit<UserPreferences, "user_id" | "created_at" | "updated_at"> {
  const defaults = getDefaultPreferences();
  return {
    ...defaults,
    ...prefs,
    category_notifications: {
      ...defaults.category_notifications,
      ...(prefs.category_notifications || {}),
    },
  };
}

/**
 * Get user preferences with caching
 */
let preferencesCache: Map<string, { prefs: UserPreferences; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getUserPreferences(
  userId: string,
  useCache: boolean = true
): Promise<UserPreferences> {
  // Check cache first
  if (useCache) {
    const cached = preferencesCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.prefs;
    }
  }

  const supabase = createServiceClient();

  // Try to fetch from database
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    console.error("Failed to fetch user preferences:", error);
    // Return defaults on error
    return {
      user_id: userId,
      ...getDefaultPreferences(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  if (!data) {
    // No preferences found, create default record
    const defaults = getDefaultPreferences();
    const { data: newPrefs, error: insertError } = await supabase
      .from("user_preferences")
      .insert({
        user_id: userId,
        ...defaults,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create default preferences:", insertError);
      return {
        user_id: userId,
        ...defaults,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const result = {
      user_id: newPrefs.user_id,
      tone_style: newPrefs.tone_style as ToneStyle,
      notification_channels: newPrefs.notification_channels as string[],
      notification_intensity: newPrefs.notification_intensity as NotificationIntensity,
      category_notifications: newPrefs.category_notifications as {
        followups: boolean;
        affirmations: boolean;
        general: boolean;
      },
      default_snooze_minutes: newPrefs.default_snooze_minutes,
      default_followup_interval_days: newPrefs.default_followup_interval_days,
      auto_create_followup: newPrefs.auto_create_followup,
      overdue_handling: newPrefs.overdue_handling as OverdueHandling,
      suppression_transparency: newPrefs.suppression_transparency as SuppressionTransparency,
      digest_tone_inherit: newPrefs.digest_tone_inherit,
      created_at: newPrefs.created_at,
      updated_at: newPrefs.updated_at,
    };

    // Cache the result
    preferencesCache.set(userId, { prefs: result, timestamp: Date.now() });
    return result;
  }

  // Parse and return preferences
  const result: UserPreferences = {
    user_id: data.user_id,
    tone_style: data.tone_style as ToneStyle,
    notification_channels: data.notification_channels as string[],
    notification_intensity: data.notification_intensity as NotificationIntensity,
    category_notifications: data.category_notifications as {
      followups: boolean;
      affirmations: boolean;
      general: boolean;
    },
    default_snooze_minutes: data.default_snooze_minutes,
    default_followup_interval_days: data.default_followup_interval_days,
    auto_create_followup: data.auto_create_followup,
    overdue_handling: data.overdue_handling as OverdueHandling,
    suppression_transparency: data.suppression_transparency as SuppressionTransparency,
    digest_tone_inherit: data.digest_tone_inherit,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  // Cache the result
  preferencesCache.set(userId, { prefs: result, timestamp: Date.now() });
  return result;
}

/**
 * Clear preferences cache for a user
 */
export function clearPreferencesCache(userId?: string): void {
  if (userId) {
    preferencesCache.delete(userId);
  } else {
    preferencesCache.clear();
  }
}

