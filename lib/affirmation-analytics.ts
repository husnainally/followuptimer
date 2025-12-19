import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export interface UserAffirmationAnalytics {
  shown_count: number;
  suppressed_count: number;
  top_categories: Array<{ category: string; count: number }>;
  last_shown_at: string | null;
  suppression_reasons: Array<{ reason: string; count: number }>;
  current_daily_count: number;
  daily_cap: number;
  cooldown_remaining_minutes: number | null;
}

export interface AdminAffirmationAnalytics {
  enabled_users_pct: number;
  total_shown: number;
  total_suppressed: number;
  category_mix: Array<{ category: string; count: number; percentage: number }>;
  suppression_reasons: Array<{ reason: string; count: number; percentage: number }>;
  action_click_rate_with_affirmation: number | null;
  action_click_rate_without_affirmation: number | null;
  engagement_uplift: number | null;
}

/**
 * Get user-level affirmation analytics
 */
export async function getUserAffirmationAnalytics(
  userId: string,
  rangeDays: number = 7
): Promise<UserAffirmationAnalytics> {
  const supabase = createServiceClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);

  // Get shown count
  const { count: shownCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "affirmation_shown")
    .gte("created_at", startDate.toISOString());

  // Get suppressed count
  const { count: suppressedCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "affirmation_suppressed")
    .gte("created_at", startDate.toISOString());

  // Get top categories
  const { data: categoryData } = await supabase
    .from("events")
    .select("event_data")
    .eq("user_id", userId)
    .eq("event_type", "affirmation_shown")
    .gte("created_at", startDate.toISOString());

  const categoryCounts: Record<string, number> = {};
  (categoryData || []).forEach((event) => {
    const category = (event.event_data as Record<string, unknown>)?.category as string;
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });

  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Get last shown timestamp
  const { data: lastShown } = await supabase
    .from("events")
    .select("created_at")
    .eq("user_id", userId)
    .eq("event_type", "affirmation_shown")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get suppression reasons
  const { data: suppressionData } = await supabase
    .from("events")
    .select("event_data")
    .eq("user_id", userId)
    .eq("event_type", "affirmation_suppressed")
    .gte("created_at", startDate.toISOString());

  const reasonCounts: Record<string, number> = {};
  (suppressionData || []).forEach((event) => {
    const reason = (event.event_data as Record<string, unknown>)?.reason as string;
    if (reason) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  });

  const suppressionReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Get current daily count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from("affirmation_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("shown_at", todayStart.toISOString());

  // Get user preferences for daily cap
  const { data: preferences } = await supabase
    .from("user_affirmation_preferences")
    .select("daily_cap, global_cooldown_minutes")
    .eq("user_id", userId)
    .single();

  const dailyCap = preferences?.daily_cap || 10;

  // Get cooldown remaining
  const { data: lastUsage } = await supabase
    .from("affirmation_usage")
    .select("shown_at")
    .eq("user_id", userId)
    .order("shown_at", { ascending: false })
    .limit(1)
    .single();

  let cooldownRemaining: number | null = null;
  if (lastUsage && preferences?.global_cooldown_minutes) {
    const lastShownTime = new Date(lastUsage.shown_at).getTime();
    const now = Date.now();
    const minutesSince = (now - lastShownTime) / (1000 * 60);
    const remaining = preferences.global_cooldown_minutes - minutesSince;
    cooldownRemaining = remaining > 0 ? Math.ceil(remaining) : 0;
  }

  return {
    shown_count: shownCount || 0,
    suppressed_count: suppressedCount || 0,
    top_categories: topCategories,
    last_shown_at: lastShown?.created_at || null,
    suppression_reasons: suppressionReasons,
    current_daily_count: todayCount || 0,
    daily_cap,
    cooldown_remaining_minutes: cooldownRemaining,
  };
}

/**
 * Get admin-level affirmation analytics
 */
export async function getAdminAffirmationAnalytics(
  rangeDays: number = 30
): Promise<AdminAffirmationAnalytics> {
  const supabase = createServiceClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);

  // Get total users with affirmations enabled
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: enabledUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("affirmation_frequency", "is", null);

  const enabledUsersPct =
    totalUsers && totalUsers > 0 ? (enabledUsers || 0) / totalUsers : 0;

  // Get total shown
  const { count: totalShown } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "affirmation_shown")
    .gte("created_at", startDate.toISOString());

  // Get total suppressed
  const { count: totalSuppressed } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "affirmation_suppressed")
    .gte("created_at", startDate.toISOString());

  // Get category mix
  const { data: shownEvents } = await supabase
    .from("events")
    .select("event_data")
    .eq("event_type", "affirmation_shown")
    .gte("created_at", startDate.toISOString());

  const categoryCounts: Record<string, number> = {};
  (shownEvents || []).forEach((event) => {
    const category = (event.event_data as Record<string, unknown>)?.category as string;
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });

  const totalCategoryCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const categoryMix = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalCategoryCount > 0 ? (count / totalCategoryCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Get suppression reasons
  const { data: suppressedEvents } = await supabase
    .from("events")
    .select("event_data")
    .eq("event_type", "affirmation_suppressed")
    .gte("created_at", startDate.toISOString());

  const reasonCounts: Record<string, number> = {};
  (suppressedEvents || []).forEach((event) => {
    const reason = (event.event_data as Record<string, unknown>)?.reason as string;
    if (reason) {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  });

  const totalReasonCount = Object.values(reasonCounts).reduce((a, b) => a + b, 0);
  const suppressionReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalReasonCount > 0 ? (count / totalReasonCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Get action click rates (with vs without affirmation)
  // This requires checking popup_action_clicked events and correlating with affirmation_shown
  const { data: actionEvents } = await supabase
    .from("events")
    .select("event_data, created_at")
    .eq("event_type", "popup_action_clicked")
    .gte("created_at", startDate.toISOString());

  let withAffirmation = 0;
  let withoutAffirmation = 0;
  let totalWithAffirmation = 0;
  let totalWithoutAffirmation = 0;

  // For each action, check if popup had affirmation
  for (const actionEvent of actionEvents || []) {
    const popupId = (actionEvent.event_data as Record<string, unknown>)?.popup_id as string;
    if (popupId) {
      // Check if this popup had an affirmation
      const { data: popup } = await supabase
        .from("popups")
        .select("affirmation")
        .eq("id", popupId)
        .single();

      if (popup?.affirmation) {
        totalWithAffirmation++;
        withAffirmation++;
      } else {
        totalWithoutAffirmation++;
        withoutAffirmation++;
      }
    }
  }

  // Also count total popups shown (for denominator)
  const { data: popupShownEvents } = await supabase
    .from("events")
    .select("event_data")
    .eq("event_type", "popup_shown")
    .gte("created_at", startDate.toISOString());

  let popupsWithAffirmation = 0;
  let popupsWithoutAffirmation = 0;

  for (const popupEvent of popupShownEvents || []) {
    const popupId = (popupEvent.event_data as Record<string, unknown>)?.popup_id as string;
    if (popupId) {
      const { data: popup } = await supabase
        .from("popups")
        .select("affirmation")
        .eq("id", popupId)
        .single();

      if (popup?.affirmation) {
        popupsWithAffirmation++;
      } else {
        popupsWithoutAffirmation++;
      }
    }
  }

  const actionClickRateWith =
    popupsWithAffirmation > 0 ? (withAffirmation / popupsWithAffirmation) * 100 : null;
  const actionClickRateWithout =
    popupsWithoutAffirmation > 0
      ? (withoutAffirmation / popupsWithoutAffirmation) * 100
      : null;

  const engagementUplift =
    actionClickRateWith !== null && actionClickRateWithout !== null
      ? actionClickRateWith - actionClickRateWithout
      : null;

  return {
    enabled_users_pct: enabledUsersPct * 100,
    total_shown: totalShown || 0,
    total_suppressed: totalSuppressed || 0,
    category_mix: categoryMix,
    suppression_reasons: suppressionReasons,
    action_click_rate_with_affirmation: actionClickRateWith,
    action_click_rate_without_affirmation: actionClickRateWithout,
    engagement_uplift: engagementUplift,
  };
}

