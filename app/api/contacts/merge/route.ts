import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// POST /api/contacts/merge - Merge two contacts
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
    const { primary_contact_id, secondary_contact_id } = body;

    if (!primary_contact_id || !secondary_contact_id) {
      return NextResponse.json(
        { error: "primary_contact_id and secondary_contact_id are required" },
        { status: 400 }
      );
    }

    if (primary_contact_id === secondary_contact_id) {
      return NextResponse.json(
        { error: "Cannot merge a contact with itself" },
        { status: 400 }
      );
    }

    // Verify both contacts exist and belong to user
    const { data: contacts, error: fetchError } = await supabase
      .from("contacts")
      .select("id, name, archived_at")
      .eq("user_id", user.id)
      .in("id", [primary_contact_id, secondary_contact_id]);

    if (fetchError) throw fetchError;

    if (!contacts || contacts.length !== 2) {
      return NextResponse.json(
        { error: "One or both contacts not found" },
        { status: 404 }
      );
    }

    const primary = contacts.find((c) => c.id === primary_contact_id);
    const secondary = contacts.find((c) => c.id === secondary_contact_id);

    if (!primary || !secondary) {
      return NextResponse.json(
        { error: "Contacts not found" },
        { status: 404 }
      );
    }

    if (primary.archived_at || secondary.archived_at) {
      return NextResponse.json(
        { error: "Cannot merge archived contacts. Please restore them first." },
        { status: 400 }
      );
    }

    // Move all reminders from secondary to primary
    const { error: updateRemindersError } = await supabase
      .from("reminders")
      .update({ contact_id: primary_contact_id })
      .eq("contact_id", secondary_contact_id)
      .eq("user_id", user.id);

    if (updateRemindersError) throw updateRemindersError;

    // Move all events from secondary to primary
    const { error: updateEventsError } = await supabase
      .from("events")
      .update({ contact_id: primary_contact_id })
      .eq("contact_id", secondary_contact_id)
      .eq("user_id", user.id);

    if (updateEventsError) throw updateEventsError;

    // Archive the secondary contact
    const { error: archiveError } = await supabase
      .from("contacts")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", secondary_contact_id)
      .eq("user_id", user.id);

    if (archiveError) throw archiveError;

    // Get the updated primary contact
    const { data: mergedContact, error: fetchMergedError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", primary_contact_id)
      .single();

    if (fetchMergedError) throw fetchMergedError;

    // Log merge event
    await logEvent({
      userId: user.id,
      eventType: "preference_changed", // Using existing event type
      eventData: {
        action: "contact_merged",
        primary_contact_id: primary_contact_id,
        secondary_contact_id: secondary_contact_id,
        primary_contact_name: primary.name,
        secondary_contact_name: secondary.name,
      },
      source: "app",
      contactId: primary_contact_id,
    });

    return NextResponse.json({
      success: true,
      contact: mergedContact,
      merged_contact_id: secondary_contact_id,
    });
  } catch (error: unknown) {
    console.error("Failed to merge contacts:", error);
    const message =
      error instanceof Error ? error.message : "Failed to merge contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

