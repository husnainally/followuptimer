import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// POST /api/contacts/[id]/restore - Restore an archived contact
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

    // Check if contact exists, belongs to user, and is archived
    const { data: contact, error: checkError } = await supabase
      .from("contacts")
      .select("id, archived_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (checkError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (!contact.archived_at) {
      return NextResponse.json(
        { error: "Contact is not archived" },
        { status: 400 }
      );
    }

    // Restore contact (set archived_at to null)
    const { data: restoredContact, error } = await supabase
      .from("contacts")
      .update({ archived_at: null })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ contact: restoredContact });
  } catch (error: unknown) {
    console.error("Failed to restore contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to restore contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

