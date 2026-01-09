import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  getAllCategoryPreferences,
  getCategorySnoozePreferences,
  type ReminderCategory,
} from "@/lib/snooze-rules";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/snooze/preferences/category - Get all category preferences
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getAllCategoryPreferences(user.id);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: unknown) {
    console.error("Failed to get category preferences:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get category preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/snooze/preferences/category - Update category preferences
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
    const { category, default_duration_minutes, intensity, enabled } = body;

    if (!category || !["follow_up", "affirmation", "generic"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    if (
      default_duration_minutes !== undefined &&
      (typeof default_duration_minutes !== "number" ||
        default_duration_minutes < 1 ||
        default_duration_minutes > 1440)
    ) {
      return NextResponse.json(
        { error: "default_duration_minutes must be between 1 and 1440" },
        { status: 400 }
      );
    }

    if (
      intensity !== undefined &&
      !["low", "medium", "high"].includes(intensity)
    ) {
      return NextResponse.json(
        { error: "intensity must be low, medium, or high" },
        { status: 400 }
      );
    }

    // Upsert category preferences
    const { data: preferences, error } = await supabase
      .from("category_snooze_preferences")
      .upsert(
        {
          user_id: user.id,
          category: category as ReminderCategory,
          default_duration_minutes:
            default_duration_minutes !== undefined
              ? default_duration_minutes
              : undefined,
          intensity: intensity !== undefined ? intensity : undefined,
          enabled: enabled !== undefined ? enabled : undefined,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,category",
        }
      )
      .select()
      .single();

    if (error) throw error;

    // Log preference change
    const { logEvent } = await import("@/lib/events");
    await logEvent({
      userId: user.id,
      eventType: "preference_changed",
      eventData: {
        preference_key: `category_${category}`,
        preference_type: "category_snooze",
        category,
        default_duration_minutes,
        intensity,
        enabled,
      },
      source: "app",
      useServiceClient: true,
    });

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: unknown) {
    console.error("Failed to update category preferences:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update category preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
