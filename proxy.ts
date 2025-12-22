import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Next.js App Router expects a `proxy` export for request interception.
// Forward to the existing `updateSession` helper which returns a NextResponse.
export async function proxy(request: NextRequest) {
  // First, handle Supabase session updates
  const response = await updateSession(request);

  // Get user to check admin status for route protection
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Cookies are handled by updateSession
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return response; // Let updateSession handle unauthenticated users
  }

  const pathname = request.nextUrl.pathname;

  // Admin routes - check if user is admin
  const isAdminRoute = pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      // Non-admin trying to access admin route - redirect to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // User dashboard routes - redirect admins to admin dashboard
  const userDashboardRoutes = [
    '/dashboard',
    '/reminder',
    '/reminders',
    '/contacts',
    '/settings',
    '/notifications',
  ];
  const isUserDashboardRoute = userDashboardRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isUserDashboardRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      // Admin trying to access user dashboard - redirect to admin dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
