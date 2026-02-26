import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // redirect specific sections back to their respective home
  const redirectPattern = /^\/(en|he)\/(projects|about|expertise)(\/|$)/;
  if (redirectPattern.test(pathname)) {
    const locale = pathname.startsWith("/he") ? "/he" : "/en";
    return NextResponse.redirect(new URL(locale, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/en/:path*", "/he/:path*"],
};
