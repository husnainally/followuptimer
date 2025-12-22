import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // First, handle Supabase session updates
  const response = await updateSession(request);

  // Get user from the response (we'll need to check admin status)
  // Since updateSession already handles auth, we'll add admin route protection here
  const pathname = request.nextUrl.pathname;

  // Admin routes - only accessible to admins
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // User dashboard routes - redirect admins away (optional, or allow both)
  const userDashboardRoutes = [
    "/dashboard",
    "/reminder",
    "/reminders",
    "/contacts",
    "/settings",
    "/notifications",
  ];
  const isUserDashboardRoute = userDashboardRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // For admin routes, the admin layout will handle the check
  // For user routes, we could optionally redirect admins, but let's allow both for now
  // The admin layout already protects admin routes

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

