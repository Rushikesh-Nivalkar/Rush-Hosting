/**
 * proxy.ts — THE GUARD
 *
 * Responsibilities:
 *  1. Refresh the Supabase session on every request (keeps auth alive).
 *  2. Redirect unauthenticated users to /login for protected routes.
 *  3. Redirect non-admins away from /(admin) routes → /dashboard.
 *  4. Redirect authenticated users away from /login and /signup → /dashboard.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/lib/supabase/database.types";

// ── Route classification ─────────────────────────────────────────────────────
const PUBLIC_ROUTES = ["/login", "/signup", "/onboard", "/auth"];
const PUBLIC_EXACT = ["/"];
const ADMIN_ROUTE_PREFIX = "/admin";

// ── Middleware ────────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Passthrough for Next.js internals, static assets, and public pages
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/webhooks") // Stripe webhooks bypass auth
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Build the Supabase SSR client (reads/writes cookies on the response)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always call getUser() — this refreshes the session token if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_EXACT.includes(pathname) || PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTE_PREFIX);

  // ── 1. Unauthenticated ───────────────────────────────────────────────────
  if (!user) {
    if (isPublicRoute) return response; // allow /login, /signup
    // Everything else requires auth
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role via Supabase REST API using service-role key (bypasses RLS,
  // works in Edge runtime without importing @supabase/supabase-js).
  let userRole: UserRole = "client";
  try {
    const profileRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      }
    );
    const [profile] = await profileRes.json();
    if (profile?.role === "admin") userRole = "admin";
  } catch { /* fallback to client on error */ }

  // ── 2. Authenticated — redirect away from auth pages ────────────────────
  if (isPublicRoute) {
    const destination = userRole === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // ── 3. Admin route guard ─────────────────────────────────────────────────
  if (isAdminRoute && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
