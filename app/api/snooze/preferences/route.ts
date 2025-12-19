import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserSnoozePreferences } from "@/lib/snooze-rules";

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
      allow_weekends,
      default_snooze_options,
      follow_up_cadence,
    } = body;

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
          allow_weekends:
            allow_weekends !== undefined ? allow_weekends : undefined,
          default_snooze_options: default_snooze_options || undefined,
          follow_up_cadence: follow_up_cadence || undefined,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) throw error;

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
