import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getRedirectPath } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("[Auth Callback] OAuth error:", {
      error,
      errorDescription,
      url: request.url,
    });
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "Authentication failed")}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError && data.session) {
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
    } else {
      // Log the error for debugging
      console.error("[Auth Callback] Code exchange error:", {
        error: exchangeError,
        code: code.substring(0, 20) + "...",
        url: request.url,
      });
      
      // Redirect with error details
      const errorMessage = exchangeError?.message || "Invalid or expired confirmation link";
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError?.message || "exchange_failed")}&message=${encodeURIComponent(errorMessage)}`
      );
    }
  }

  // No code provided
  console.error("[Auth Callback] No code provided:", request.url);
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?error=no_code&message=${encodeURIComponent("No confirmation code provided")}`
  );
}
