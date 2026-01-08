import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function getStringFromRecord(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  return getString((obj as Record<string, unknown>)[key]);
}

// POST /api/popups/[id]/action - Handle popup action (complete/snooze/follow-up)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action_type, action_data, snooze_until } = body;

    if (!action_type) {
      return NextResponse.json(
        { error: "action_type is required" },
        { status: 400 }
      );
    }

    // Get popup to verify ownership
    const { data: popup, error: fetchError } = await supabase
      .from("popups")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !popup) {
      return NextResponse.json({ error: "Popup not found" }, { status: 404 });
    }

    // Prevent duplicate actions - check if popup already processed
    if (
      popup.status === "acted" ||
      popup.status === "dismissed" ||
      popup.status === "action_taken"
    ) {
      return NextResponse.json(
        { error: "Popup action already processed", popup },
        { status: 409 } // Conflict
      );
    }

    const normalizedAction = String(action_type).toUpperCase();

    // Update popup status (acted) + store action_taken
    const { data: updatedPopup, error: updateError } = await supabase
      .from("popups")
      .update({
        status: "acted",
        action_taken: normalizedAction,
        closed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log affirmation_action_clicked if popup had affirmation (for correlation analysis)
    const hadAffirmation = !!popup.affirmation;
    if (hadAffirmation) {
      await logEvent({
        userId: user.id,
        eventType: "affirmation_action_clicked",
        eventData: {
          popup_id: id,
          popup_instance_id: id,
          action: normalizedAction,
          had_affirmation: true,
          affirmation_id: null, // Could extract from popup if needed
        },
        source: "app",
        reminderId: popup.reminder_id || undefined,
        contactId: popup.contact_id || undefined,
        useServiceClient: true,
      });
    }

    // Record action
    const { error: actionError } = await supabase.from("popup_actions").insert({
      popup_id: id,
      user_id: user.id,
      action_type: normalizedAction,
      action_data: action_data || {},
    });

    if (actionError) throw actionError;

    // Log popup_action event
    await logEvent({
      userId: user.id,
      eventType: "popup_action_clicked",
      eventData: {
        popup_id: id,
        action_type: normalizedAction,
        reminder_id: popup.reminder_id,
        ...(action_data || {}),
      },
    });

    // Handle action-specific logic
    if (normalizedAction === "FOLLOW_UP_NOW") {
      const actionUrl =
        getStringFromRecord(popup.payload, "thread_link") ||
        getStringFromRecord(popup.action_data, "action_url") ||
        getStringFromRecord(action_data, "action_url");

      return NextResponse.json({
        success: true,
        popup: updatedPopup,
        action_url: actionUrl,
      });
    }

    if (
      (normalizedAction === "MARK_DONE" || normalizedAction === "COMPLETE") &&
      popup.reminder_id
    ) {
      // Mark reminder as completed
      await supabase
        .from("reminders")
        .update({ status: "sent" })
        .eq("id", popup.reminder_id);

      await logEvent({
        userId: user.id,
        eventType: "task_completed",
        eventData: {
          popup_id: id,
          reminder_id: popup.reminder_id,
        },
        source: "app",
        reminderId: popup.reminder_id,
        useServiceClient: true,
      });

      // Log reminder_completed event
      const { data: reminder } = await supabase
        .from("reminders")
        .select("contact_id")
        .eq("id", popup.reminder_id)
        .single();

      const eventResult = await logEvent({
        userId: user.id,
        eventType: "reminder_completed",
        eventData: {
          reminder_id: popup.reminder_id,
        },
        source: "app",
        reminderId: popup.reminder_id,
        contactId: reminder?.contact_id || undefined,
      });

      // Update streak tracking (which will create streak_incremented trigger if needed)
      if (eventResult.success && popup.reminder_id) {
        const { updateStreakOnCompletion } = await import(
          "@/lib/streak-tracking"
        );
        await updateStreakOnCompletion(user.id, popup.reminder_id);

        // Also process the reminder_completed event for any other triggers
        const { processEventForTriggers } = await import(
          "@/lib/trigger-manager"
        );
        await processEventForTriggers(
          user.id,
          "reminder_completed",
          eventResult.eventId!,
          { reminder_id: popup.reminder_id }
        );

        // Check if auto-create follow-up is enabled
        const { getUserPreferences } = await import("@/lib/user-preferences");
        const userPrefs = await getUserPreferences(user.id);

        if (userPrefs.auto_create_followup && reminder?.contact_id) {
          // Create follow-up prompt popup
          const { getDefaultFollowupDate } = await import(
            "@/lib/followup-creation"
          );
          const { data: profile } = await supabase
            .from("profiles")
            .select("timezone")
            .eq("id", user.id)
            .single();

          const timezone = profile?.timezone || "UTC";
          const followupDate = await getDefaultFollowupDate(
            user.id,
            new Date(),
            timezone
          );

          // Log follow_up_required event when follow-up is needed
          await logEvent({
            userId: user.id,
            eventType: "follow_up_required",
            eventData: {
              reminder_id: popup.reminder_id,
              contact_id: reminder.contact_id,
              suggested_date: followupDate.toISOString(),
            },
            source: "app",
            reminderId: popup.reminder_id,
            contactId: reminder.contact_id,
          });

          const { createPopup } = await import("@/lib/popup-trigger");
          await createPopup({
            userId: user.id,
            templateType: "follow_up_required", // Use existing template type
            title: "Create Next Follow-up?",
            message: `Would you like to schedule a follow-up for ${followupDate.toLocaleDateString()}?`,
            affirmation:
              "Staying consistent with follow-ups builds stronger relationships.",
            priority: 6,
            reminderId: popup.reminder_id,
            actionData: {
              suggested_date: followupDate.toISOString(),
              original_reminder_id: popup.reminder_id,
              followup_prompt: true,
            },
          });
        }
      }
    } else if (normalizedAction === "SNOOZE" && popup.reminder_id) {
      // Check if reminder is already sent/completed - don't allow snoozing
      const { data: reminder } = await supabase
        .from("reminders")
        .select("status")
        .eq("id", popup.reminder_id)
        .eq("user_id", user.id)
        .single();

      if (reminder?.status === "sent" || reminder?.status === "completed") {
        return NextResponse.json(
          { error: "Cannot snooze a reminder that has already been sent" },
          { status: 400 }
        );
      }

      const minutes =
        typeof action_data?.minutes === "number" ? action_data.minutes : 60;
      const scheduledTime =
        typeof action_data?.scheduled_time === "string"
          ? action_data.scheduled_time
          : undefined;
      const candidateType =
        typeof action_data?.candidate_type === "string"
          ? action_data.candidate_type
          : undefined;
      const wasRecommended =
        typeof action_data?.was_recommended === "boolean"
          ? action_data.was_recommended
          : false;

      const computedSnoozeUntil =
        scheduledTime ||
        (typeof snooze_until === "string"
          ? snooze_until
          : new Date(Date.now() + minutes * 60 * 1000).toISOString());

      // Persist snooze on popup instance
      await supabase
        .from("popups")
        .update({ snooze_until: computedSnoozeUntil })
        .eq("id", id)
        .eq("user_id", user.id);

      // Trigger snooze API for reminder scheduling
      await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/reminders/${popup.reminder_id}/snooze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minutes: scheduledTime ? undefined : minutes,
            scheduled_time: scheduledTime,
            candidate_type: candidateType,
            was_recommended: wasRecommended,
            is_smart_suggestion: candidateType !== undefined,
          }),
        }
      );

      await logEvent({
        userId: user.id,
        eventType: "popup_snoozed",
        eventData: {
          popup_id: id,
          snooze_until: computedSnoozeUntil,
          minutes,
          reminder_id: popup.reminder_id,
        },
        source: "app",
        reminderId: popup.reminder_id,
        useServiceClient: true,
      });

      await logEvent({
        userId: user.id,
        eventType: "reminder_scheduled",
        eventData: {
          reminder_id: popup.reminder_id,
          snooze_until: computedSnoozeUntil,
          minutes,
        },
        source: "app",
        reminderId: popup.reminder_id,
        useServiceClient: true,
      });
    }

    return NextResponse.json({
      success: true,
      popup: updatedPopup,
    });
  } catch (error: unknown) {
    console.error("Failed to handle popup action:", error);
    const message =
      error instanceof Error ? error.message : "Failed to handle popup action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
