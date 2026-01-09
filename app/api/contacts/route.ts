import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // Order by first_name, then last_name, falling back to name for legacy data
    const { data: contacts, error } = await query.order("first_name", {
      ascending: true,
    }).order("last_name", {
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
    const { 
      name, // Legacy support
      first_name, 
      last_name, 
      company, 
      job_title, 
      tags, 
      source,
      email, 
      phone, 
      notes 
    } = body;

    // Handle backward compatibility: if name is provided but first_name is not, split it
    let firstName = first_name?.trim() || "";
    let lastName = last_name?.trim() || "";
    
    if (!firstName && name) {
      // Legacy: split name into first_name and last_name
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length === 1) {
        firstName = nameParts[0];
        lastName = "";
      } else if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
      }
    }

    // Validate: first_name OR email required (per spec)
    if (!firstName && (!email || email.trim() === "")) {
      return NextResponse.json(
        { error: "First name or email is required" },
        { status: 400 }
      );
    }

    // Normalize tags: ensure it's an array
    let tagsArray: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags.filter(t => t && t.trim() !== "").map(t => t.trim());
      } else if (typeof tags === "string") {
        // Support comma-separated string
        tagsArray = tags.split(",").map(t => t.trim()).filter(t => t !== "");
      }
    }

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name: firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || name?.trim() || null, // Keep name for backward compatibility
        first_name: firstName || null,
        last_name: lastName || null,
        company: company?.trim() || null,
        job_title: job_title?.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        source: source?.trim() || "manual",
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

