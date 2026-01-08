import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { type EventType } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /popup/rules - Get user's popup rules (aligned with requirements)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rules, error } = await supabase
      .from("popup_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      rules: rules || [],
    });
  } catch (error: unknown) {
    console.error("Failed to get popup rules:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get popup rules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /popup/rules - Create or update popup rule (aligned with requirements)
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
      id, // If provided, update existing rule
      rule_name,
      trigger_event_type,
      template_key,
      conditions,
      priority,
      cooldown_seconds,
      max_per_day,
      ttl_seconds,
      enabled,
    } = body;

    // Validation
    if (!rule_name || !trigger_event_type || !template_key) {
      return NextResponse.json(
        { error: "rule_name, trigger_event_type, and template_key are required" },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes: EventType[] = [
      "email_opened",
      "link_clicked",
      "reminder_due",
      "reminder_completed",
      "no_reply_after_n_days",
      "manual_reminder_created",
    ];
    if (!validEventTypes.includes(trigger_event_type as EventType)) {
      return NextResponse.json(
        { error: "Invalid trigger_event_type" },
        { status: 400 }
      );
    }

    // Validate template_key
    const validTemplateKeys = [
      "email_opened",
      "link_clicked",
      "reminder_due",
      "reminder_completed",
      "no_reply_after_n_days",
      "manual_reminder_created",
    ];
    if (!validTemplateKeys.includes(template_key)) {
      return NextResponse.json(
        { error: "Invalid template_key" },
        { status: 400 }
      );
    }

    // Validate priority (1-10)
    if (priority !== undefined && (priority < 1 || priority > 10)) {
      return NextResponse.json(
        { error: "Priority must be between 1 and 10" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing rule
      const { data: existingRule } = await supabase
        .from("popup_rules")
        .select("user_id")
        .eq("id", id)
        .single();

      if (!existingRule) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      if (existingRule.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: updatedRule, error: updateError } = await supabase
        .from("popup_rules")
        .update({
          rule_name,
          trigger_event_type,
          template_key,
          conditions: conditions || {},
          priority: priority || 5,
          cooldown_seconds: cooldown_seconds || 0,
          max_per_day: max_per_day || null,
          ttl_seconds: ttl_seconds || 86400, // Default 24 hours
          enabled: enabled !== undefined ? enabled : true,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        rule: updatedRule,
      });
    } else {
      // Create new rule
      const { data: newRule, error: insertError } = await supabase
        .from("popup_rules")
        .insert({
          user_id: user.id,
          rule_name,
          trigger_event_type,
          template_key,
          conditions: conditions || {},
          priority: priority || 5,
          cooldown_seconds: cooldown_seconds || 0,
          max_per_day: max_per_day || null,
          ttl_seconds: ttl_seconds || 86400, // Default 24 hours
          enabled: enabled !== undefined ? enabled : true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json({
        success: true,
        rule: newRule,
      });
    }
  } catch (error: unknown) {
    console.error("Failed to create/update popup rule:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create/update popup rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

