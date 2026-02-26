import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // preview mode bypass via query or cookie
  const previewQuery = searchParams.get("preview") === "true";
  const previewCookie = req.cookies.get("preview_mode")?.value === "true" ||
    req.cookies.get("__prerender_bypass") != null;
  if (previewQuery || previewCookie) {
    return NextResponse.next();
  }

  // redirect specific sections back to their respective home
  const redirectPattern = /^\/(en|he)\/(projects|about|expertise)(\/|$)/;
  if (redirectPattern.test(pathname)) {
    const locale = pathname.startsWith("/he") ? "/he" : "/en";
    const dest = req.nextUrl.clone();
    dest.pathname = locale;
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/en/:path*", "/he/:path*"],
};
