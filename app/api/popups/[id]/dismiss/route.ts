import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/popups/[id]/dismiss - Dismiss popup
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

    // Get popup to verify ownership
    const { data: popup, error: fetchError } = await supabase
      .from("popups")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !popup) {
      return NextResponse.json(
        { error: "Popup not found" },
        { status: 404 }
      );
    }

    // Update popup status to dismissed
    const { data: updatedPopup, error: updateError } = await supabase
      .from("popups")
      .update({
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      popup: updatedPopup,
    });
  } catch (error: unknown) {
    console.error("Failed to dismiss popup:", error);
    const message =
      error instanceof Error ? error.message : "Failed to dismiss popup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

