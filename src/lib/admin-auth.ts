import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_COOKIE   = "be_admin_token";
const FOREMAN_COOKIE = "be_foreman_token";
const VIEW_COOKIE    = "be_view_token";   // admin "view-as-foreman" (read-only)

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

// Admin sessions use a sliding 90-minute idle timeout. Each admin API
// request through proxy.ts re-signs the cookie with a fresh `iat`, so an
// active admin keeps their session as long as they're working. Combined
// with the client-side activity tracker in AdminPortal (which stops the
// 2-minute polling once the user has been idle past 90 min), this gives
// a true idle timeout — not an absolute one.
const ADMIN_MAX_AGE = 60 * 90; // 90 min
const VIEW_MAX_AGE  = 60 * 30; // 30 min — admin view-as-foreman window

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

// ── View token (admin "view-as-foreman", read-only) ──────────────────────────
// Lets an admin open the foreman portal exactly as a given foreman sees it,
// for support/training. The HMAC binds the acting admin_id together with the
// viewed foreman staff_id, so the actor behind a view is always recoverable.
// The token grants NOTHING on its own: getViewContext only honors it while a
// live admin session with the matching admin_id is present, and there is no
// reverse path (foreman can never become admin).

function viewSig(secret: string, adminId: string, staffId: string, iat: number): string {
  return hmacHex(secret, `view:foreman:${adminId}:${staffId}:${iat}`);
}

export function buildViewToken(adminId: string, staffId: string): string {
  const secret = getTokenSecret();
  if (!secret) throw new Error("AUTH_TOKEN_SECRET env var is required");
  const iat = Math.floor(Date.now() / 1000);
  return `${adminId}:${staffId}:${iat}:${viewSig(secret, adminId, staffId, iat)}`;
}

function verifyViewToken(token: string): { adminId: string; staffId: string } | null {
  const secret = getTokenSecret();
  if (!secret) return null;
  const parts = token.split(":");
  if (parts.length !== 4) return null;
  const [adminId, staffId, iatStr, provided] = parts;
  if (!adminId || !staffId) return null;
  const iat = parseInt(iatStr, 10);
  if (isNaN(iat)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - iat > VIEW_MAX_AGE || now < iat) return null;
  if (!safeEqual(provided, viewSig(secret, adminId, staffId, iat))) return null;
  return { adminId, staffId };
}

/** Active view context, or null. Requires BOTH a valid view token AND a live
 *  admin session whose id matches the token's admin_id — a view token alone
 *  grants nothing, and it dies the moment the admin session does. */
export function getViewContext(req: NextRequest): { adminId: string; staffId: string } | null {
  const vt = req.cookies.get(VIEW_COOKIE)?.value;
  if (!vt) return null;
  const view = verifyViewToken(vt);
  if (!view) return null;
  // Real admin identity — read RAW (getAdminIdFromRequest is NOT view-suppressed).
  if (getAdminIdFromRequest(req) !== view.adminId) return null;
  return view;
}

// ── Role detection ────────────────────────────────────────────────────────────

export function getAdminRoleFromRequest(req: NextRequest): "admin" | null {
  // While viewing-as-foreman, the request is intentionally NOT treated as
  // admin on the data plane, so shared endpoints scope to the viewed foreman
  // (and admin-only write endpoints reject — view mode is read-only).
  if (getViewContext(req)) return null;
  return getAdminIdFromRequest(req) ? "admin" : null;
}

// RAW admin id — unaffected by view mode. Used by getViewContext, whoami, the
// proxy cookie-refresh, and the impersonate endpoint to find the real admin.
export function getAdminIdFromRequest(req: NextRequest): string | null {
  const secret = getTokenSecret();
  if (!secret) return null;
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyIdentityToken(token, secret, ADMIN_MAX_AGE)?.id ?? null;
}

export function getForemanStaffIdFromRequest(req: NextRequest): string | null {
  // Real foreman cookie wins and is checked first — when present and valid the
  // view branch is never reached, so a normal foreman is 100% unaffected.
  const ft = req.cookies.get(FOREMAN_COOKIE)?.value;
  if (ft) {
    const real = verifyForemanToken(ft);
    if (real) return real;
  }
  // No valid foreman cookie → honor an active admin view-as-foreman, if any.
  return getViewContext(req)?.staffId ?? null;
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
export async function isAdminAuthed(): Promise<boolean> {
  const secret = getTokenSecret();
  if (!secret) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyIdentityToken(token, secret, ADMIN_MAX_AGE) !== null;
}

/** Server-component variant of verifyInternalToken — reads cookies() directly. */
export async function isInternalAuthed(): Promise<boolean> {
  const token = (await cookies()).get(INTERNAL_COOKIE)?.value;
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

/** Sliding-refresh helper for the middleware proxy.
 *  If `cookieValue` parses, verifies, and is within the 90-min window,
 *  returns a freshly-signed cookie value + options to set on the response.
 *  Returns null when the existing token is missing, malformed, or expired —
 *  in which case the middleware passes through and the handler will 401.
 */
export function refreshAdminCookieIfValid(cookieValue: string | undefined):
  | { name: string; value: string; options: typeof COOKIE_OPTS }
  | null
{
  if (!cookieValue) return null;
  const secret = getTokenSecret();
  if (!secret) return null;
  const verified = verifyIdentityToken(cookieValue, secret, ADMIN_MAX_AGE);
  if (!verified) return null;
  return {
    name:  ADMIN_COOKIE,
    value: signIdentityToken(secret, verified.id),
    options: COOKIE_OPTS,
  };
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

// View-as-foreman cookie (read-only, 30-min window).
export function buildViewAuthCookie(adminId: string, staffId: string) {
  return { name: VIEW_COOKIE, value: buildViewToken(adminId, staffId), options: { ...COOKIE_OPTS, maxAge: VIEW_MAX_AGE } };
}

export function buildViewClearCookie() {
  return { name: VIEW_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}

// ── Worker session token ────────────────────────────────────────────────────
// Same HMAC-of-staffId shape as the foreman token (base64-encoded
// "staffId:sig"), set after a worker enters their phone on the staff portal
// and /api/worker/identify confirms a match. Distinct cookie name so a worker
// session never collides with a foreman session on the same device. 12-hour
// max-age matches the PIN cookie — the two refresh on the same cadence.

const WORKER_COOKIE  = "be_worker_token";
const WORKER_MAX_AGE = 60 * 60 * 12; // 12 h

function workerSig(staffId: string): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET env var is required");
  // Distinct sig prefix from the foreman sig prevents a foreman cookie from
  // being replayed as a worker cookie (or vice versa) even if both were ever
  // logged together. "w:" namespace lives inside the HMAC input.
  return createHmac("sha256", secret).update(`w:${staffId}`).digest("hex").slice(0, 32);
}

export function buildWorkerTokenForStaff(staffId: string): string {
  return Buffer.from(`${staffId}:${workerSig(staffId)}`).toString("base64");
}

/** Verify cookie value and return staffId, or null if invalid. */
export function verifyWorkerToken(cookieValue: string): string | null {
  try {
    const decoded  = Buffer.from(cookieValue, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    const staffId = decoded.slice(0, colonIdx);
    const sig     = decoded.slice(colonIdx + 1);
    if (!staffId || sig !== workerSig(staffId)) return null;
    return staffId;
  } catch { return null; }
}

export function getWorkerStaffIdFromRequest(req: NextRequest): string | null {
  const wt = req.cookies.get(WORKER_COOKIE)?.value;
  if (!wt) return null;
  return verifyWorkerToken(wt);
}

export function buildWorkerAuthCookie(staffId: string) {
  return {
    name:    WORKER_COOKIE,
    value:   buildWorkerTokenForStaff(staffId),
    options: { ...COOKIE_OPTS, maxAge: WORKER_MAX_AGE },
  };
}

export function buildWorkerClearCookie() {
  return { name: WORKER_COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
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
