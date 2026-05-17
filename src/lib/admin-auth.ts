import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_COOKIE   = "be_admin_token";
const FOREMAN_COOKIE = "be_foreman_token";

export type AdminRole = "admin" | "foreman" | null;

// ── Shared HMAC helpers ───────────────────────────────────────────────────────

function hmacHex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

// ── Signed token: "{iat}:{hmac}" (used for internal-staff cookie) ─────────────

function signToken(secret: string): string {
  const iat = Math.floor(Date.now() / 1000);
  return `${iat}:${hmacHex(secret, String(iat))}`;
}

function verifyToken(token: string, secret: string, maxAgeSec: number): boolean {
  const colonIdx = token.indexOf(":");
  if (colonIdx < 0) return false;
  const iat = parseInt(token.slice(0, colonIdx), 10);
  const provided = token.slice(colonIdx + 1);
  if (isNaN(iat)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - iat > maxAgeSec || now < iat) return false;
  const expected = hmacHex(secret, String(iat));
  return safeEqual(provided, expected);
}

// ── Identity-bearing token: "{id}:{iat}:{hmac(id:iat)}" ───────────────────────
// Used for admin cookie so server-side code can identify the logged-in admin.

function signIdentityToken(secret: string, id: string): string {
  const iat = Math.floor(Date.now() / 1000);
  return `${id}:${iat}:${hmacHex(secret, `${id}:${iat}`)}`;
}

function verifyIdentityToken(
  token: string,
  secret: string,
  maxAgeSec: number,
): { id: string; iat: number } | null {
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [id, iatStr, provided] = parts;
  if (!id) return null;
  const iat = parseInt(iatStr, 10);
  if (isNaN(iat)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - iat > maxAgeSec || now < iat) return null;
  const expected = hmacHex(secret, `${id}:${iat}`);
  if (!safeEqual(provided, expected)) return null;
  return { id, iat };
}

// ── Admin token helpers ───────────────────────────────────────────────────────

const ADMIN_MAX_AGE = 60 * 60 * 8; // 8 h

// Single shared HMAC secret for signing both admin and foreman cookies.
// ADMIN_PASSWORD is no longer used for cryptography — auth is now bcrypt
// against admins.password_hash (see /api/admin-auth).
function getTokenSecret(): string | null {
  return process.env.AUTH_TOKEN_SECRET ?? null;
}

// ── Foreman token helpers (HMAC-signed staffId) ───────────────────────────────

function foremanSig(staffId: string): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET env var is required");
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
  return getAdminIdFromRequest(req) ? "admin" : null;
}

export function getAdminIdFromRequest(req: NextRequest): string | null {
  const secret = getTokenSecret();
  if (!secret) return null;
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyIdentityToken(token, secret, ADMIN_MAX_AGE)?.id ?? null;
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

// ── Server-component helpers ───────────────────────────────────────────────────
export function isAdminAuthed(): boolean {
  const secret = getTokenSecret();
  if (!secret) return false;
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyIdentityToken(token, secret, ADMIN_MAX_AGE) !== null;
}

/** Server-component variant of verifyInternalToken — reads cookies() directly. */
export function isInternalAuthed(): boolean {
  const token = cookies().get(INTERNAL_COOKIE)?.value;
  if (!token) return false;
  return verifyInternalToken(token);
}

// ── Cookie builders ────────────────────────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge:   ADMIN_MAX_AGE,
  path:     "/",
};

export function buildAuthCookie(adminId: string) {
  const secret = getTokenSecret();
  if (!secret) throw new Error("AUTH_TOKEN_SECRET env var is required");
  return { name: ADMIN_COOKIE, value: signIdentityToken(secret, adminId), options: COOKIE_OPTS };
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

// ── Internal (worker) token helpers ──────────────────────────────────────────

const INTERNAL_COOKIE   = "be_internal_token";
const INTERNAL_MAX_AGE  = 60 * 60 * 12; // 12 h

export function buildInternalCookie(): { name: string; value: string; options: typeof COOKIE_OPTS } {
  const secret = process.env.INTERNAL_STAFF_PIN;
  if (!secret) throw new Error("INTERNAL_STAFF_PIN env var is required");
  return {
    name:    INTERNAL_COOKIE,
    value:   signToken(secret),
    options: { ...COOKIE_OPTS, maxAge: INTERNAL_MAX_AGE },
  };
}

export function verifyInternalToken(token: string): boolean {
  const secret = process.env.INTERNAL_STAFF_PIN;
  if (!secret) return false;
  return verifyToken(token, secret, INTERNAL_MAX_AGE);
}
