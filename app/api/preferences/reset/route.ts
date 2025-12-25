import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getDefaultPreferences, clearPreferencesCache } from "@/lib/user-preferences";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// POST /api/preferences/reset?section=tone|notifications|behaviour|all
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "all";

    const serviceSupabase = createServiceClient();
    const defaults = getDefaultPreferences();

    // Get current preferences
    const { data: current } = await serviceSupabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let updateData: Partial<typeof defaults> = {};

    if (section === "all") {
      // Reset all preferences
      updateData = defaults;
    } else if (section === "tone") {
      // Reset only tone
      updateData = { tone_style: defaults.tone_style };
    } else if (section === "notifications") {
      // Reset notification settings
      updateData = {
        notification_channels: defaults.notification_channels,
        notification_intensity: defaults.notification_intensity,
        category_notifications: defaults.category_notifications,
      };
    } else if (section === "behaviour") {
      // Reset behavior controls
      updateData = {
        default_snooze_minutes: defaults.default_snooze_minutes,
        default_followup_interval_days: defaults.default_followup_interval_days,
        auto_create_followup: defaults.auto_create_followup,
        overdue_handling: defaults.overdue_handling,
        suppression_transparency: defaults.suppression_transparency,
      };
    } else {
      return NextResponse.json(
        { error: "Invalid section. Must be: tone, notifications, behaviour, or all" },
        { status: 400 }
      );
    }

    if (current) {
      // Update existing preferences
      const { data, error } = await serviceSupabase
        .from("user_preferences")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
    } else {
      // Create new preferences with defaults
      const { data, error } = await serviceSupabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          ...defaults,
          ...updateData,
        })
        .select()
        .single();

      if (error) throw error;
    }

    // Clear cache
    clearPreferencesCache(user.id);

    // Log reset event
    await logEvent({
      userId: user.id,
      eventType: "preference_changed",
      eventData: {
        action: "reset",
        section,
      },
      source: "app",
      useServiceClient: true,
    });

    return NextResponse.json({
      success: true,
      message: `Preferences reset for section: ${section}`,
    });
  } catch (error: unknown) {
    console.error("Failed to reset preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to reset preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

