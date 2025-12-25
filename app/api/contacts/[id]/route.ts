import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/contacts/[id] - Get a specific contact
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

    const { data: contact, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      throw error;
    }

    // Get linked reminders
    const { data: reminders } = await supabase
      .from("reminders")
      .select("*")
      .eq("contact_id", id)
      .eq("user_id", user.id)
      .order("remind_at", { ascending: true });

    return NextResponse.json({ contact, reminders: reminders || [] });
  } catch (error: unknown) {
    console.error("Failed to fetch contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/contacts/[id] - Update a contact
export async function PUT(
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
    const { name, email, phone, notes } = body;

    // Validate required fields
    if (name !== undefined && (!name || name.trim() === "")) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const { data: contact, error } = await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ contact });
  } catch (error: unknown) {
    console.error("Failed to update contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/contacts/[id] - Archive a contact (soft delete)
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    // Check if contact exists and belongs to user
    const { data: contact, error: checkError } = await supabase
      .from("contacts")
      .select("id, archived_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (checkError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (permanent) {
      // Hard delete (only if already archived)
      if (!contact.archived_at) {
        return NextResponse.json(
          { error: "Contact must be archived before permanent deletion" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    } else {
      // Soft delete (archive)
      const { error } = await supabase
        .from("contacts")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .is("archived_at", null); // Only archive if not already archived

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to archive contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to archive contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

