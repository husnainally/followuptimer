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
    let firstName = first_name?.trim();
    let lastName = last_name?.trim();
    
    if (name !== undefined && !firstName) {
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
    // Only validate if we're updating first_name or email
    if (firstName !== undefined && !firstName && (email === undefined || !email || email.trim() === "")) {
      // Check existing contact to see if it has email
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("email, first_name")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      
      const hasEmail = existingContact?.email || (email && email.trim() !== "");
      const hasFirstName = existingContact?.first_name || firstName;
      
      if (!hasFirstName && !hasEmail) {
        return NextResponse.json(
          { error: "First name or email is required" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    
    // Update name fields
    if (firstName !== undefined) updateData.first_name = firstName || null;
    if (lastName !== undefined) updateData.last_name = lastName || null;
    
    // Keep name field in sync for backward compatibility
    if (firstName !== undefined || lastName !== undefined || name !== undefined) {
      const finalFirstName = firstName !== undefined ? firstName : (await supabase.from("contacts").select("first_name").eq("id", id).single()).data?.first_name || "";
      const finalLastName = lastName !== undefined ? lastName : (await supabase.from("contacts").select("last_name").eq("id", id).single()).data?.last_name || "";
      updateData.name = finalFirstName && finalLastName 
        ? `${finalFirstName} ${finalLastName}`.trim() 
        : finalFirstName || name?.trim() || null;
    } else if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (company !== undefined) updateData.company = company?.trim() || null;
    if (job_title !== undefined) updateData.job_title = job_title?.trim() || null;
    
    // Normalize tags: ensure it's an array
    if (tags !== undefined) {
      let tagsArray: string[] = [];
      if (tags) {
        if (Array.isArray(tags)) {
          tagsArray = tags.filter(t => t && t.trim() !== "").map(t => t.trim());
        } else if (typeof tags === "string") {
          // Support comma-separated string
          tagsArray = tags.split(",").map(t => t.trim()).filter(t => t !== "");
        }
      }
      updateData.tags = tagsArray.length > 0 ? tagsArray : null;
    }
    
    if (source !== undefined) updateData.source = source?.trim() || "manual";
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

