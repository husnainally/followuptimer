import { createServiceClient } from "@/lib/supabase/service";
import { logEvent } from "@/lib/events";

export type AffirmationCategory =
  | "sales_momentum"
  | "calm_productivity"
  | "consistency"
  | "resilience"
  | "focus"
  | "general_positive";

export interface AffirmationResult {
  text: string;
  category: AffirmationCategory;
  affirmation_id: string;
}

interface AffirmationContext {
  popupType?: string;
  eventType?: string;
  reminderId?: string;
  contactId?: string;
}

/**
 * Get affirmation for user based on context and preferences
 * Returns null if affirmations should not be shown (cooldown, daily cap, disabled, etc.)
 */
export async function getAffirmationForUser(
  userId: string,
  context?: AffirmationContext,
  popupId?: string
): Promise<AffirmationResult | null> {
  const supabase = createServiceClient();

  try {
    // 1. Check if affirmations are enabled for user
    const { data: profile } = await supabase
      .from("profiles")
      .select("affirmation_frequency")
      .eq("id", userId)
      .single();

    if (!profile?.affirmation_frequency) {
      return null; // Affirmations disabled
    }

    // 2. Get or create user preferences
    const preferences = await getUserPreferences(userId);

    // 3. Check global cooldown
    const cooldownCheck = await checkGlobalCooldown(userId, preferences.global_cooldown_minutes);
    if (!cooldownCheck.allowed) {
      return null;
    }

    // 4. Check daily cap
    const dailyCapCheck = await checkDailyCap(userId, preferences.daily_cap);
    if (!dailyCapCheck.allowed) {
      return null;
    }

    // 5. Determine allowed categories based on context
    const allowedCategories = getCategoriesForContext(context, preferences);

    if (allowedCategories.length === 0) {
      return null; // No categories enabled
    }

    // 6. Get recently shown affirmations (avoid repetition)
    const recentAffirmations = await getRecentAffirmations(userId, 10); // Last 10

    // 7. Select category and affirmation
    const affirmation = await selectAffirmation(
      allowedCategories,
      recentAffirmations,
      preferences
    );

    if (!affirmation) {
      return null; // No available affirmations
    }

    // 8. Record usage
    await recordAffirmationUsage(userId, affirmation.id, popupId, affirmation.category);

    // 9. Log event
    await logEvent({
      userId,
      eventType: "affirmation_shown",
      eventData: {
        affirmation_id: affirmation.id,
        category: affirmation.category,
        popup_id: popupId,
        reminder_id: context?.reminderId,
        contact_id: context?.contactId,
      },
      source: "app",
      reminderId: context?.reminderId,
      contactId: context?.contactId,
      useServiceClient: true,
    });

    return {
      text: affirmation.text,
      category: affirmation.category,
      affirmation_id: affirmation.id,
    };
  } catch (error) {
    console.error("Failed to get affirmation:", error);
    return null; // Fail silently - affirmations are non-critical
  }
}

/**
 * Get or create user affirmation preferences
 */
async function getUserPreferences(userId: string) {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("user_affirmation_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create default preferences
  const { data: newPrefs } = await supabase
    .from("user_affirmation_preferences")
    .insert({
      user_id: userId,
      sales_momentum_enabled: true,
      calm_productivity_enabled: true,
      consistency_enabled: true,
      resilience_enabled: true,
      focus_enabled: true,
      general_positive_enabled: true,
      global_cooldown_minutes: 30,
      daily_cap: 10,
    })
    .select()
    .single();

  return newPrefs || {
    user_id: userId,
    sales_momentum_enabled: true,
    calm_productivity_enabled: true,
    consistency_enabled: true,
    resilience_enabled: true,
    focus_enabled: true,
    general_positive_enabled: true,
    global_cooldown_minutes: 30,
    daily_cap: 10,
  };
}

/**
 * Check if global cooldown allows showing affirmation
 */
async function checkGlobalCooldown(
  userId: string,
  cooldownMinutes: number
): Promise<{ allowed: boolean; lastShown?: Date }> {
  const supabase = createServiceClient();

  const { data: lastUsage } = await supabase
    .from("affirmation_usage")
    .select("shown_at")
    .eq("user_id", userId)
    .order("shown_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastUsage) {
    return { allowed: true };
  }

  const lastShown = new Date(lastUsage.shown_at);
  const now = new Date();
  const minutesSince = (now.getTime() - lastShown.getTime()) / (1000 * 60);

  return {
    allowed: minutesSince >= cooldownMinutes,
    lastShown,
  };
}

/**
 * Check if daily cap allows showing affirmation
 */
async function checkDailyCap(
  userId: string,
  dailyCap: number
): Promise<{ allowed: boolean; countToday: number }> {
  const supabase = createServiceClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("affirmation_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("shown_at", startOfDay.toISOString());

  return {
    allowed: (count || 0) < dailyCap,
    countToday: count || 0,
  };
}

/**
 * Determine allowed categories based on context and user preferences
 */
function getCategoriesForContext(
  context: AffirmationContext | undefined,
  preferences: {
    sales_momentum_enabled: boolean;
    calm_productivity_enabled: boolean;
    consistency_enabled: boolean;
    resilience_enabled: boolean;
    focus_enabled: boolean;
    general_positive_enabled: boolean;
  }
): AffirmationCategory[] {
  const categories: AffirmationCategory[] = [];

  // Context-aware category selection
  if (context?.eventType === "email_opened" || context?.eventType === "reminder_due") {
    // Sales/follow-up context
    if (preferences.sales_momentum_enabled) categories.push("sales_momentum");
    if (preferences.focus_enabled) categories.push("focus");
  }

  if (context?.eventType === "reminder_completed") {
    // Completion context
    if (preferences.consistency_enabled) categories.push("consistency");
    if (preferences.general_positive_enabled) categories.push("general_positive");
  }

  if (context?.eventType === "reminder_missed" || context?.eventType === "inactivity_detected") {
    // Resilience context
    if (preferences.resilience_enabled) categories.push("resilience");
    if (preferences.calm_productivity_enabled) categories.push("calm_productivity");
  }

  // Always include general_positive if enabled (fallback)
  if (preferences.general_positive_enabled && !categories.includes("general_positive")) {
    categories.push("general_positive");
  }

  // If no context-specific categories, use all enabled categories
  if (categories.length === 0) {
    if (preferences.sales_momentum_enabled) categories.push("sales_momentum");
    if (preferences.calm_productivity_enabled) categories.push("calm_productivity");
    if (preferences.consistency_enabled) categories.push("consistency");
    if (preferences.resilience_enabled) categories.push("resilience");
    if (preferences.focus_enabled) categories.push("focus");
    if (preferences.general_positive_enabled) categories.push("general_positive");
  }

  return categories;
}

/**
 * Get recently shown affirmations to avoid repetition
 */
async function getRecentAffirmations(
  userId: string,
  limit: number
): Promise<string[]> {
  const supabase = createServiceClient();

  const { data: recent } = await supabase
    .from("affirmation_usage")
    .select("affirmation_id")
    .eq("user_id", userId)
    .order("shown_at", { ascending: false })
    .limit(limit);

  return (recent || []).map((r) => r.affirmation_id);
}

/**
 * Select an affirmation from allowed categories, avoiding recent ones
 */
async function selectAffirmation(
  allowedCategories: AffirmationCategory[],
  recentAffirmationIds: string[],
  preferences: {
    sales_momentum_enabled: boolean;
    calm_productivity_enabled: boolean;
    consistency_enabled: boolean;
    resilience_enabled: boolean;
    focus_enabled: boolean;
    general_positive_enabled: boolean;
  }
): Promise<{ id: string; text: string; category: AffirmationCategory } | null> {
  const supabase = createServiceClient();

  // Select a random category from allowed categories (weighted by enabled status)
  const category = selectRandomCategory(allowedCategories);

  // Get all affirmations in this category
  const { data: affirmations } = await supabase
    .from("affirmations")
    .select("id, text, category")
    .eq("category", category)
    .eq("enabled", true);

  if (!affirmations || affirmations.length === 0) {
    return null;
  }

  // Filter out recently shown affirmations
  const available = affirmations.filter((aff) => !recentAffirmationIds.includes(aff.id));

  // If all affirmations were recently shown, use the full pool (allow repetition after cycling)
  const poolToUse = available.length > 0 ? available : affirmations;

  // Select random affirmation from pool
  const selected = poolToUse[Math.floor(Math.random() * poolToUse.length)];

  return {
    id: selected.id,
    text: selected.text,
    category: selected.category as AffirmationCategory,
  };
}

/**
 * Select a random category from allowed categories
 * Uses weighted random selection (all categories have equal weight for now)
 */
function selectRandomCategory(categories: AffirmationCategory[]): AffirmationCategory {
  if (categories.length === 0) {
    return "general_positive"; // Fallback
  }

  return categories[Math.floor(Math.random() * categories.length)];
}

/**
 * Record affirmation usage for tracking
 */
async function recordAffirmationUsage(
  userId: string,
  affirmationId: string,
  popupId: string | undefined,
  category: AffirmationCategory
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from("affirmation_usage").insert({
    user_id: userId,
    affirmation_id: affirmationId,
    popup_id: popupId || null,
    category,
  });
}

