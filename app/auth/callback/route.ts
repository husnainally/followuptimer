import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getRedirectPath } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get user to check admin status
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If user is authenticated, determine redirect path based on admin status
      // But respect the 'next' parameter if it's explicitly provided (e.g., from password reset)
      let redirectPath = next;

      if (!next && user) {
        // Use admin-aware redirect if no specific next path is provided
        redirectPath = await getRedirectPath(user.id);
      } else if (!next) {
        // Fallback to dashboard if no user and no next
        redirectPath = "/dashboard";
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
