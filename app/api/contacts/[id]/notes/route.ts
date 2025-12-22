import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// POST /api/contacts/[id]/notes - Add a timestamped note to a contact
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { note_text, reminder_id } = body;

    if (!note_text || !note_text.trim()) {
      return NextResponse.json(
        { error: "note_text is required" },
        { status: 400 }
      );
    }

    // Verify contact exists and belongs to user
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, name, notes")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Add note to history
    const { data: noteHistory, error: historyError } = await supabase
      .from("contact_notes_history")
      .insert({
        contact_id: id,
        user_id: user.id,
        reminder_id: reminder_id || null,
        note_text: note_text.trim(),
      })
      .select()
      .single();

    if (historyError) throw historyError;

    // Update contact notes field (append with timestamp)
    const timestamp = new Date().toLocaleString();
    const currentNotes = contact.notes || "";
    const newNotes = currentNotes
      ? `${currentNotes}\n\n[${timestamp}] ${note_text.trim()}`
      : `[${timestamp}] ${note_text.trim()}`;

    const { error: updateError } = await supabase
      .from("contacts")
      .update({ notes: newNotes })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Log event
    await logEvent({
      userId: user.id,
      eventType: "preference_changed", // Using existing event type
      eventData: {
        action: "note_added",
        contact_id: id,
        contact_name: contact.name,
        reminder_id: reminder_id || null,
      },
      source: "app",
      contactId: id,
      reminderId: reminder_id || undefined,
    });

    return NextResponse.json({
      success: true,
      note: noteHistory,
    });
  } catch (error: unknown) {
    console.error("Failed to add note:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/contacts/[id]/notes - Get note history for a contact
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify contact exists and belongs to user
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get note history
    const { data: notes, error } = await supabase
      .from("contact_notes_history")
      .select("id, note_text, created_at, reminder_id")
      .eq("contact_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notes: notes || [] });
  } catch (error: unknown) {
    console.error("Failed to fetch notes:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

