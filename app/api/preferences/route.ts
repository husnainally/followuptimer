import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  validatePreferences,
  mergeWithDefaults,
  getDefaultPreferences,
  clearPreferencesCache,
  type UserPreferences,
} from "@/lib/user-preferences";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// GET /api/preferences - Get user's preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceClient();
    const { data: preferences, error } = await serviceSupabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    // If no preferences found, return defaults
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          user_id: user.id,
          ...getDefaultPreferences(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    // Parse JSONB fields
    const result: UserPreferences = {
      user_id: preferences.user_id,
      tone_style: preferences.tone_style as UserPreferences["tone_style"],
      notification_channels: preferences.notification_channels as string[],
      notification_intensity:
        preferences.notification_intensity as UserPreferences["notification_intensity"],
      category_notifications: preferences.category_notifications as {
        followups: boolean;
        affirmations: boolean;
        general: boolean;
      },
      default_snooze_minutes: preferences.default_snooze_minutes,
      default_followup_interval_days: preferences.default_followup_interval_days,
      auto_create_followup: preferences.auto_create_followup,
      overdue_handling: preferences.overdue_handling as UserPreferences["overdue_handling"],
      suppression_transparency:
        preferences.suppression_transparency as UserPreferences["suppression_transparency"],
      digest_tone_inherit: preferences.digest_tone_inherit,
      created_at: preferences.created_at,
      updated_at: preferences.updated_at,
    };

    return NextResponse.json({ preferences: result });
  } catch (error: unknown) {
    console.error("Failed to fetch preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/preferences - Update user's preferences
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
      tone_style,
      notification_channels,
      notification_intensity,
      category_notifications,
      default_snooze_minutes,
      default_followup_interval_days,
      auto_create_followup,
      overdue_handling,
      suppression_transparency,
      digest_tone_inherit,
    } = body;

    // Build update object with only provided fields
    const updateData: Partial<UserPreferences> = {};

    // Milestone 9: Gate tone_style based on plan
    if (tone_style !== undefined) {
      // Check if user has PRO access for advanced tones
      const { getUserPlan, isFeatureEnabled } = await import("@/lib/entitlements");
      const plan = await getUserPlan(user.id);
      
      if (plan) {
        const hasToneAccess = isFeatureEnabled(plan, "tone_variants");
        
        // FREE users can only use "neutral" tone
        // Check if trying to use a PRO-only tone
        const proOnlyTones = ["supportive", "direct", "motivational", "minimal"];
        if (proOnlyTones.includes(tone_style) && !hasToneAccess) {
          return NextResponse.json(
            {
              error:
                "Advanced tone variants are available on PRO. Upgrade to unlock all tones.",
            },
            { status: 403 }
          );
        }
      }
      
      updateData.tone_style = tone_style;
    }
    if (notification_channels !== undefined)
      updateData.notification_channels = notification_channels;
    if (notification_intensity !== undefined)
      updateData.notification_intensity = notification_intensity;
    if (category_notifications !== undefined)
      updateData.category_notifications = category_notifications;
    if (default_snooze_minutes !== undefined)
      updateData.default_snooze_minutes = default_snooze_minutes;
    if (default_followup_interval_days !== undefined)
      updateData.default_followup_interval_days = default_followup_interval_days;
    if (auto_create_followup !== undefined)
      updateData.auto_create_followup = auto_create_followup;
    if (overdue_handling !== undefined) updateData.overdue_handling = overdue_handling;
    if (suppression_transparency !== undefined)
      updateData.suppression_transparency = suppression_transparency;
    if (digest_tone_inherit !== undefined)
      updateData.digest_tone_inherit = digest_tone_inherit;

    // Validate preferences
    const validation = validatePreferences(updateData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid preferences", details: validation.errors },
        { status: 400 }
      );
    }

    // Merge with defaults to ensure all fields are present
    const merged = mergeWithDefaults(updateData);

    const serviceSupabase = createServiceClient();

    // Try to update existing preferences
    const { data: existing } = await serviceSupabase
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await serviceSupabase
        .from("user_preferences")
        .update({
          ...merged,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await serviceSupabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          ...merged,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Clear cache
    clearPreferencesCache(user.id);

    // Log preference change event
    await logEvent({
      userId: user.id,
      eventType: "preference_changed",
      eventData: {
        action: "update",
        changed_fields: Object.keys(updateData),
      },
      source: "app",
      useServiceClient: true,
    });

    // Parse JSONB fields for response
    const response: UserPreferences = {
      user_id: result.user_id,
      tone_style: result.tone_style as UserPreferences["tone_style"],
      notification_channels: result.notification_channels as string[],
      notification_intensity:
        result.notification_intensity as UserPreferences["notification_intensity"],
      category_notifications: result.category_notifications as {
        followups: boolean;
        affirmations: boolean;
        general: boolean;
      },
      default_snooze_minutes: result.default_snooze_minutes,
      default_followup_interval_days: result.default_followup_interval_days,
      auto_create_followup: result.auto_create_followup,
      overdue_handling: result.overdue_handling as UserPreferences["overdue_handling"],
      suppression_transparency:
        result.suppression_transparency as UserPreferences["suppression_transparency"],
      digest_tone_inherit: result.digest_tone_inherit,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };

    return NextResponse.json({ preferences: response });
  } catch (error: unknown) {
    console.error("Failed to update preferences:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

