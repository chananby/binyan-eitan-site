import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Never apply middleware to API routes or internal routes
  if (pathname.startsWith("/api") || pathname.startsWith("/internal")) {
    return NextResponse.next();
  }

  // preview mode bypass via query or cookie
  const previewQuery = searchParams.get("preview") === "true";
  const previewCookie = req.cookies.get("preview_mode")?.value === "true" ||
    req.cookies.get("__prerender_bypass") != null;
  
  let response = NextResponse.next();
  
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

  // redirect sections that are not yet live back to their respective home
  const redirectPattern = /^\/(en|he)\/(projects)(\/|$)/;
  if (redirectPattern.test(pathname)) {
    const locale = pathname.startsWith("/he") ? "/he" : "/en";
    const dest = req.nextUrl.clone();
    dest.pathname = locale;
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: ["/en/:path*", "/he/:path*", "/api/:path*", "/internal/:path*"],
};
