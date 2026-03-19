import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const ADMIN_COOKIE   = "be_admin_token";
const FOREMAN_COOKIE = "be_foreman_token";

export type AdminRole = "admin" | "foreman" | null;

function adminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? Buffer.from(pw).toString("base64") : null;
}

function foremanToken(): string | null {
  const pin = process.env.FOREMAN_PIN;
  return pin ? Buffer.from(pin).toString("base64") : null;
}

// ── Role detection ────────────────────────────────────────────────────────────
export function getRoleFromRequest(req: NextRequest): AdminRole {
  const at = req.cookies.get(ADMIN_COOKIE)?.value;
  const ft = req.cookies.get(FOREMAN_COOKIE)?.value;
  const ae = adminToken();
  const fe = foremanToken();
  if (ae && at === ae) return "admin";
  if (fe && ft === fe) return "foreman";
  return null;
}

/** Both admin and foreman are authed */
export function isAuthedFromRequest(req: NextRequest): boolean {
  return getRoleFromRequest(req) !== null;
}

/** Admin only */
export function isAdminAuthedFromRequest(req: NextRequest): boolean {
  const at = req.cookies.get(ADMIN_COOKIE)?.value;
  const ae = adminToken();
  return !!ae && at === ae;
}

// ── Server-component helper ────────────────────────────────────────────────────
export function isAdminAuthed(): boolean {
  const token    = cookies().get(ADMIN_COOKIE)?.value;
  const expected = adminToken();
  return !!expected && !!token && token === expected;
}

// ── Cookie builders ────────────────────────────────────────────────────────────
export function buildAuthCookie() {
  return {
    name: ADMIN_COOKIE,
    value: adminToken() ?? "",
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, maxAge: 60 * 60 * 8, path: "/" },
  };
}

export function buildClearCookie() {
  return { name: ADMIN_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}

export function buildForemanAuthCookie() {
  return {
    name: FOREMAN_COOKIE,
    value: foremanToken() ?? "",
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, maxAge: 60 * 60 * 8, path: "/" },
  };
}

export function buildForemanClearCookie() {
  return { name: FOREMAN_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}
