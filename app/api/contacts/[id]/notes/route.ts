import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Add note to history (if table exists)
    let noteHistory = null;
    const { data: historyData, error: historyError } = await supabase
      .from("contact_notes_history")
      .insert({
        contact_id: id,
        user_id: user.id,
        reminder_id: reminder_id || null,
        note_text: note_text.trim(),
      })
      .select()
      .single();

    if (historyError) {
      // If table doesn't exist, log warning but continue (migration not applied)
      if (
        historyError.message?.includes("could not find the table") ||
        historyError.message?.includes("does not exist")
      ) {
        console.warn(
          "contact_notes_history table not found - migration may not be applied:",
          historyError.message
        );
        // Continue without history tracking - still update contact notes
      } else {
        // Other errors are more serious
        console.error("Failed to insert note to history:", {
          error: historyError,
          contact_id: id,
          user_id: user.id,
          reminder_id: reminder_id || null,
        });
        throw new Error(`Failed to save note: ${historyError.message}`);
      }
    } else {
      noteHistory = historyData;
    }

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

    if (updateError) {
      console.error("Failed to update contact notes:", {
        error: updateError,
        contact_id: id,
        user_id: user.id,
      });
      throw new Error(`Failed to update contact notes: ${updateError.message}`);
    }

    // Log event (non-blocking - don't fail note creation if event logging fails)
    logEvent({
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
    }).catch((error) => {
      // Log error but don't throw - event logging is non-critical
      console.error("Failed to log note_added event:", error);
    });

    return NextResponse.json({
      success: true,
      note: noteHistory,
      warning: noteHistory
        ? undefined
        : "Note history table not available - migration may need to be applied",
    });
  } catch (error: unknown) {
    console.error("Failed to add note:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add note";

    // Return more specific error information
    const statusCode = message.includes("not found")
      ? 404
      : message.includes("Unauthorized")
      ? 401
      : message.includes("required")
      ? 400
      : 500;

    return NextResponse.json({ error: message }, { status: statusCode });
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
