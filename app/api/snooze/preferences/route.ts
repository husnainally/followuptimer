import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserSnoozePreferences } from "@/lib/snooze-rules";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// GET /api/snooze/preferences - Get user snooze preferences
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getUserSnoozePreferences(user.id);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: unknown) {
    console.error("Failed to get snooze preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/snooze/preferences - Update user snooze preferences
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      working_hours_start,
      working_hours_end,
      working_days,
      quiet_hours_start,
      quiet_hours_end,
      max_reminders_per_day,
      cooldown_minutes,
      allow_weekends,
      default_snooze_options,
      follow_up_cadence,
      smart_suggestions_enabled,
      dnd_enabled,
      dnd_override_rules,
    } = body;

    // Get existing preferences to track changes
    const existingPrefs = await getUserSnoozePreferences(user.id);

    // Validate working days array
    if (
      working_days &&
      (!Array.isArray(working_days) || working_days.length === 0)
    ) {
      return NextResponse.json(
        { error: "working_days must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate max_reminders_per_day
    if (
      max_reminders_per_day !== undefined &&
      (typeof max_reminders_per_day !== "number" || max_reminders_per_day < 1)
    ) {
      return NextResponse.json(
        { error: "max_reminders_per_day must be a positive number" },
        { status: 400 }
      );
    }

    // Validate cooldown_minutes
    if (
      cooldown_minutes !== undefined &&
      (typeof cooldown_minutes !== "number" || cooldown_minutes < 0 || cooldown_minutes > 1440)
    ) {
      return NextResponse.json(
        { error: "cooldown_minutes must be between 0 and 1440 (24 hours)" },
        { status: 400 }
      );
    }

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from("user_snooze_preferences")
      .upsert(
        {
          user_id: user.id,
          working_hours_start: working_hours_start || undefined,
          working_hours_end: working_hours_end || undefined,
          working_days: working_days || undefined,
          quiet_hours_start:
            quiet_hours_start !== undefined ? quiet_hours_start : null,
          quiet_hours_end:
            quiet_hours_end !== undefined ? quiet_hours_end : null,
          max_reminders_per_day: max_reminders_per_day || undefined,
          cooldown_minutes: cooldown_minutes !== undefined ? cooldown_minutes : undefined,
          allow_weekends:
            allow_weekends !== undefined ? allow_weekends : undefined,
          default_snooze_options: default_snooze_options || undefined,
          follow_up_cadence: follow_up_cadence || undefined,
          smart_suggestions_enabled:
            smart_suggestions_enabled !== undefined
              ? smart_suggestions_enabled
              : undefined,
          dnd_enabled: dnd_enabled !== undefined ? dnd_enabled : undefined,
          dnd_override_rules: dnd_override_rules || undefined,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) throw error;

    // Log preference changes
    const changes: Array<{ key: string; old_value: unknown; new_value: unknown }> = [];

    if (
      working_hours_start !== undefined &&
      working_hours_start !== existingPrefs.working_hours_start
    ) {
      changes.push({
        key: "working_hours_start",
        old_value: existingPrefs.working_hours_start,
        new_value: working_hours_start,
      });
    }
    if (
      working_hours_end !== undefined &&
      working_hours_end !== existingPrefs.working_hours_end
    ) {
      changes.push({
        key: "working_hours_end",
        old_value: existingPrefs.working_hours_end,
        new_value: working_hours_end,
      });
    }
    if (
      working_days !== undefined &&
      JSON.stringify(working_days) !== JSON.stringify(existingPrefs.working_days)
    ) {
      changes.push({
        key: "working_days",
        old_value: existingPrefs.working_days,
        new_value: working_days,
      });
    }
    if (
      max_reminders_per_day !== undefined &&
      max_reminders_per_day !== existingPrefs.max_reminders_per_day
    ) {
      changes.push({
        key: "max_reminders_per_day",
        old_value: existingPrefs.max_reminders_per_day,
        new_value: max_reminders_per_day,
      });
    }
    if (
      cooldown_minutes !== undefined &&
      cooldown_minutes !== existingPrefs.cooldown_minutes
    ) {
      changes.push({
        key: "cooldown_minutes",
        old_value: existingPrefs.cooldown_minutes,
        new_value: cooldown_minutes,
      });
    }
    if (
      allow_weekends !== undefined &&
      allow_weekends !== existingPrefs.allow_weekends
    ) {
      changes.push({
        key: "allow_weekends",
        old_value: existingPrefs.allow_weekends,
        new_value: allow_weekends,
      });
    }
    if (
      smart_suggestions_enabled !== undefined &&
      smart_suggestions_enabled !== existingPrefs.smart_suggestions_enabled
    ) {
      changes.push({
        key: "smart_suggestions_enabled",
        old_value: existingPrefs.smart_suggestions_enabled,
        new_value: smart_suggestions_enabled,
      });
    }
    if (
      follow_up_cadence !== undefined &&
      follow_up_cadence !== existingPrefs.follow_up_cadence
    ) {
      changes.push({
        key: "follow_up_cadence",
        old_value: existingPrefs.follow_up_cadence,
        new_value: follow_up_cadence,
      });
    }
    if (
      dnd_enabled !== undefined &&
      dnd_enabled !== existingPrefs.dnd_enabled
    ) {
      changes.push({
        key: "dnd_enabled",
        old_value: existingPrefs.dnd_enabled,
        new_value: dnd_enabled,
      });
    }
    if (
      dnd_override_rules !== undefined &&
      JSON.stringify(dnd_override_rules) !== JSON.stringify(existingPrefs.dnd_override_rules)
    ) {
      changes.push({
        key: "dnd_override_rules",
        old_value: existingPrefs.dnd_override_rules,
        new_value: dnd_override_rules,
      });
    }

    // Log each preference change
    for (const change of changes) {
      await logEvent({
        userId: user.id,
        eventType: "preference_changed",
        eventData: {
          preference_key: change.key,
          old_value: change.old_value,
          new_value: change.new_value,
          preference_type: "snooze",
        },
        source: "app",
        useServiceClient: true,
      });
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: unknown) {
    console.error("Failed to update snooze preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
