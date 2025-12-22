import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";

// GET /api/digests/preferences - Get user's digest preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: preferences, error } = await supabase
      .from("user_digest_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    return NextResponse.json({ preferences: preferences || null });
  } catch (error: unknown) {
    console.error("Failed to fetch digest preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch digest preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/digests/preferences - Update user's digest preferences
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
      weekly_digest_enabled,
      digest_day,
      digest_time,
      digest_channel,
      digest_detail_level,
      only_when_active,
    } = body;

    // Validate inputs
    if (weekly_digest_enabled !== undefined && typeof weekly_digest_enabled !== "boolean") {
      return NextResponse.json(
        { error: "weekly_digest_enabled must be a boolean" },
        { status: 400 }
      );
    }

    if (digest_day !== undefined && (digest_day < 0 || digest_day > 6)) {
      return NextResponse.json(
        { error: "digest_day must be between 0 and 6" },
        { status: 400 }
      );
    }

    if (digest_time !== undefined && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(digest_time)) {
      return NextResponse.json(
        { error: "digest_time must be in HH:mm:ss format" },
        { status: 400 }
      );
    }

    if (
      digest_channel !== undefined &&
      !["email", "in_app", "both"].includes(digest_channel)
    ) {
      return NextResponse.json(
        { error: "digest_channel must be 'email', 'in_app', or 'both'" },
        { status: 400 }
      );
    }

    if (
      digest_detail_level !== undefined &&
      !["light", "standard"].includes(digest_detail_level)
    ) {
      return NextResponse.json(
        { error: "digest_detail_level must be 'light' or 'standard'" },
        { status: 400 }
      );
    }

    // Get existing preferences to track changes
    const { data: existingPrefs } = await supabase
      .from("user_digest_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from("user_digest_preferences")
      .upsert(
        {
          user_id: user.id,
          weekly_digest_enabled:
            weekly_digest_enabled !== undefined ? weekly_digest_enabled : existingPrefs?.weekly_digest_enabled ?? false,
          digest_day: digest_day !== undefined ? digest_day : existingPrefs?.digest_day ?? 1,
          digest_time: digest_time !== undefined ? digest_time : existingPrefs?.digest_time ?? "08:00:00",
          digest_channel:
            digest_channel !== undefined ? digest_channel : existingPrefs?.digest_channel ?? "email",
          digest_detail_level:
            digest_detail_level !== undefined
              ? digest_detail_level
              : existingPrefs?.digest_detail_level ?? "standard",
          only_when_active:
            only_when_active !== undefined
              ? only_when_active
              : existingPrefs?.only_when_active ?? false,
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

    if (weekly_digest_enabled !== undefined && existingPrefs?.weekly_digest_enabled !== weekly_digest_enabled) {
      changes.push({
        key: "weekly_digest_enabled",
        old_value: existingPrefs?.weekly_digest_enabled,
        new_value: weekly_digest_enabled,
      });
    }

    if (digest_day !== undefined && existingPrefs?.digest_day !== digest_day) {
      changes.push({
        key: "digest_day",
        old_value: existingPrefs?.digest_day,
        new_value: digest_day,
      });
    }

    if (digest_time !== undefined && existingPrefs?.digest_time !== digest_time) {
      changes.push({
        key: "digest_time",
        old_value: existingPrefs?.digest_time,
        new_value: digest_time,
      });
    }

    if (digest_channel !== undefined && existingPrefs?.digest_channel !== digest_channel) {
      changes.push({
        key: "digest_channel",
        old_value: existingPrefs?.digest_channel,
        new_value: digest_channel,
      });
    }

    if (digest_detail_level !== undefined && existingPrefs?.digest_detail_level !== digest_detail_level) {
      changes.push({
        key: "digest_detail_level",
        old_value: existingPrefs?.digest_detail_level,
        new_value: digest_detail_level,
      });
    }

    if (only_when_active !== undefined && existingPrefs?.only_when_active !== only_when_active) {
      changes.push({
        key: "only_when_active",
        old_value: existingPrefs?.only_when_active,
        new_value: only_when_active,
      });
    }

    // Log preference changes as events
    if (changes.length > 0) {
      await logEvent({
        userId: user.id,
        eventType: "preference_changed",
        eventData: {
          preference_type: "digest",
          changes: changes,
        },
        source: "app",
        useServiceClient: true,
      });
    }

    return NextResponse.json({ preferences });
  } catch (error: unknown) {
    console.error("Failed to save digest preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save digest preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

