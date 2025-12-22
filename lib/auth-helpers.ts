import { createClient } from "@/lib/supabase/server";
import { createClient as createClientBrowser } from "@/lib/supabase/client";

/**
 * Get the appropriate redirect path based on user's admin status
 * @param userId - The user's ID
 * @returns The redirect path ('/admin' for admins, '/dashboard' for regular users)
 */
export async function getRedirectPath(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return "/dashboard";
    }

    return profile.is_admin ? "/admin" : "/dashboard";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return "/dashboard";
  }
}

/**
 * Get the appropriate redirect path based on user's admin status (client-side)
 * @param userId - The user's ID
 * @returns The redirect path ('/admin' for admins, '/dashboard' for regular users)
 */
export async function getRedirectPathClient(userId: string): Promise<string> {
  try {
    const supabase = createClientBrowser();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return "/dashboard";
    }

    return profile.is_admin ? "/admin" : "/dashboard";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return "/dashboard";
  }
}

/**
 * Check if a user is an admin (server-side)
 * @param userId - The user's ID
 * @returns True if user is admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return false;
    }

    return profile.is_admin ?? false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
