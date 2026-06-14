import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshAdminCookieIfValid, getViewContext } from "./lib/admin-auth";

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ── View-as-foreman read-only guard ───────────────────────────────────────
  // While an admin is viewing-as-foreman (valid view token + matching live
  // admin session), block every mutating API call so the session is strictly
  // read-only. The impersonate endpoint itself is exempt (the admin must be
  // able to exit / re-target). This guard is INERT when no view is active —
  // getViewContext returns null, so legitimate admin/foreman/worker writes are
  // never touched.
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/admin/impersonate") &&
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS" &&
    getViewContext(req)
  ) {
    return NextResponse.json(
      { error: "מצב צפייה בלבד — פעולה חסומה. צא ממצב הצפייה כדי לבצע שינויים." },
      { status: 403 },
    );
  }

  // ── Admin sliding session refresh ─────────────────────────────────────────
  // Every authenticated admin API hit re-signs the cookie with a fresh
  // `iat`, giving us a true 90-minute *idle* timeout (not absolute). If the
  // cookie is missing, invalid, or expired we pass through and let the
  // handler return 401 normally. The /api/admin-auth endpoints (login +
  // logout) handle their own cookie set/clear and don't need this layer.
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin-auth")) {
    const res = NextResponse.next();
    const refreshed = refreshAdminCookieIfValid(req.cookies.get("be_admin_token")?.value);
    if (refreshed) res.cookies.set(refreshed.name, refreshed.value, refreshed.options);
    return res;
  }

  // Never apply middleware to API routes or internal routes
  if (pathname.startsWith("/api") || pathname.startsWith("/internal")) {
    return NextResponse.next();
  }

  // ── Maintenance mode ───────────────────────────────────────────────────────
  // Skip: admin workspace, the maintenance page itself, static assets
  const isAdminRoute       = pathname.startsWith("/admin");
  const isMaintenancePage  = pathname.startsWith("/maintenance");
  if (!isAdminRoute && !isMaintenancePage) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/settings?key=eq.maintenance_mode&select=value&limit=1`,
          {
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
            next: { revalidate: 30, tags: ["maintenance_mode"] },
          }
        );
        if (res.ok) {
          const rows: { value: string }[] = await res.json();
          if (rows[0]?.value === "true") {
            return NextResponse.redirect(new URL("/maintenance", req.url));
          }
        }
      }
    } catch {
      // If the check fails, never block the user — fail open
    }
  }

  // preview mode bypass via query or cookie
  const previewQuery = searchParams.get("preview") === "true";
  const previewCookie = req.cookies.get("preview_mode")?.value === "true" ||
    req.cookies.get("__prerender_bypass") != null;
  
  const response = NextResponse.next();

  // Expose pathname to server components (used by root layout for lang/dir)
  response.headers.set("x-pathname", pathname);

  // Set preview_mode cookie when preview=true is detected
  if (previewQuery) {
    response.cookies.set("preview_mode", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });
    return response;
  }
  
  if (previewQuery || previewCookie) {
    return response;
  }

  // Redirect deleted static pages to unified expertise routes (301 permanent)
  const legacyRedirects: Record<string, string> = {
    "/en/building-from-afar": "/en/expertise/building-from-abroad",
    "/he/building-from-afar": "/he/expertise/building-from-abroad",
    "/en/behind-the-walls":   "/en/expertise/behind-the-walls",
    "/he/behind-the-walls":   "/he/expertise/behind-the-walls",
  };
  for (const [from, to] of Object.entries(legacyRedirects)) {
    if (pathname === from || pathname.startsWith(from + "/")) {
      return NextResponse.redirect(new URL(to, req.url), 301);
    }
  }

  // ⚠️ PRE-LAUNCH GUARD: Only the four projects whose dedicated content pages
  // aren't ready yet still redirect home. The /projects index and the amshinov
  // detail page are live as of May 2026. To launch the remaining projects,
  // remove their slug from BLOCKED_PROJECT_SLUGS once the content lands.
  // See: internal-docs/PROJECT_STATUS.md "Project pages live launch"
  const BLOCKED_PROJECT_SLUGS = new Set([
    "bayit-vegan-luxury-apartment",
    "ohel-avshalom-synagogue-jerusalem",
    "ramat-eshkol-penthouse",
    "jerusalem-luxury-residence",
  ]);
  const projectMatch = pathname.match(/^\/(en|he)\/projects\/([^/]+)/);
  if (projectMatch && BLOCKED_PROJECT_SLUGS.has(projectMatch[2])) {
    const dest = req.nextUrl.clone();
    dest.pathname = `/${projectMatch[1]}`;
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: [
    "/en/:path*",
    "/he/:path*",
    "/api/:path*",
    "/internal/:path*",
    "/attendance",
    "/",
  ],
};
