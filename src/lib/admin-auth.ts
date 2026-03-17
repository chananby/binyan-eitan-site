import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "be_admin_token";

// Derive the expected cookie token from the ADMIN_PASSWORD env var.
// Simple base64 — sufficient for an internal tool behind HTTPS.
function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return Buffer.from(pw).toString("base64");
}

// ── Server-component helper (reads via next/headers) ──────────────────────────
export function isAdminAuthed(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  const expected = expectedToken();
  return !!expected && !!token && token === expected;
}

// ── API-route helper (reads from the Request object) ──────────────────────────
export function isAdminAuthedFromRequest(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const expected = expectedToken();
  return !!expected && !!token && token === expected;
}

// ── Cookie builders ────────────────────────────────────────────────────────────
export function buildAuthCookie(): { name: string; value: string; options: object } {
  return {
    name: COOKIE_NAME,
    value: expectedToken() ?? "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    },
  };
}

export function buildClearCookie(): { name: string; value: string; options: object } {
  return {
    name: COOKIE_NAME,
    value: "",
    options: { httpOnly: true, path: "/", maxAge: 0 },
  };
}
