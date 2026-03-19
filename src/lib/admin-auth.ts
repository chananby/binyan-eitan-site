import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

const ADMIN_COOKIE   = "be_admin_token";
const FOREMAN_COOKIE = "be_foreman_token";

export type AdminRole = "admin" | "foreman" | null;

// ── Admin token helpers ───────────────────────────────────────────────────────
function adminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? Buffer.from(pw).toString("base64") : null;
}

// ── Foreman token helpers (HMAC-signed staffId) ───────────────────────────────
function foremanSig(staffId: string): string {
  const secret = process.env.ADMIN_PASSWORD ?? "be_internal_secret";
  return createHmac("sha256", secret).update(staffId).digest("hex").slice(0, 32);
}

export function buildForemanTokenForStaff(staffId: string): string {
  return Buffer.from(`${staffId}:${foremanSig(staffId)}`).toString("base64");
}

/** Verify cookie value and return staffId, or null if invalid */
export function verifyForemanToken(cookieValue: string): string | null {
  try {
    const decoded  = Buffer.from(cookieValue, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    const staffId = decoded.slice(0, colonIdx);
    const sig     = decoded.slice(colonIdx + 1);
    if (!staffId || sig !== foremanSig(staffId)) return null;
    return staffId;
  } catch { return null; }
}

// ── Role detection ────────────────────────────────────────────────────────────
export function getAdminRoleFromRequest(req: NextRequest): "admin" | null {
  const at = req.cookies.get(ADMIN_COOKIE)?.value;
  const ae = adminToken();
  return (ae && at === ae) ? "admin" : null;
}

export function getForemanStaffIdFromRequest(req: NextRequest): string | null {
  const ft = req.cookies.get(FOREMAN_COOKIE)?.value;
  if (!ft) return null;
  return verifyForemanToken(ft);
}

export function getRoleFromRequest(req: NextRequest): AdminRole {
  if (getAdminRoleFromRequest(req)) return "admin";
  if (getForemanStaffIdFromRequest(req)) return "foreman";
  return null;
}

/** Both admin and foreman are authed */
export function isAuthedFromRequest(req: NextRequest): boolean {
  return getRoleFromRequest(req) !== null;
}

/** Admin only */
export function isAdminAuthedFromRequest(req: NextRequest): boolean {
  return getAdminRoleFromRequest(req) === "admin";
}

// ── Server-component helper ────────────────────────────────────────────────────
export function isAdminAuthed(): boolean {
  const token    = cookies().get(ADMIN_COOKIE)?.value;
  const expected = adminToken();
  return !!expected && !!token && token === expected;
}

// ── Cookie builders ────────────────────────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge:   60 * 60 * 8,
  path:     "/",
};

export function buildAuthCookie() {
  return { name: ADMIN_COOKIE, value: adminToken() ?? "", options: COOKIE_OPTS };
}

export function buildClearCookie() {
  return { name: ADMIN_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}

export function buildForemanAuthCookie(staffId: string) {
  return { name: FOREMAN_COOKIE, value: buildForemanTokenForStaff(staffId), options: COOKIE_OPTS };
}

export function buildForemanClearCookie() {
  return { name: FOREMAN_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}
