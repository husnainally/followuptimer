import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/contacts - Get all contacts for the user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("include_archived") === "true";
    const archivedOnly = searchParams.get("archived_only") === "true";

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id);

    // Filter by archive status
    if (archivedOnly) {
      query = query.not("archived_at", "is", null);
    } else if (!includeArchived) {
      // Default: exclude archived contacts
      query = query.is("archived_at", null);
    }

    const { data: contacts, error } = await query.order("name", {
      ascending: true,
    });

    if (error) {
      console.error("Failed to fetch contacts:", error);
      throw error;
    }

    return NextResponse.json({ contacts });
  } catch (error: unknown) {
    console.error("Failed to fetch contacts:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
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
    const { name, email, phone, notes } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create contact:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

