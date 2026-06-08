import { NextRequest } from "next/server";
import { createHmac } from "crypto";

// Executive (founders' area) auth — HMAC-signed cookie. Mirrors the same
// pattern as admin / foreman / worker tokens in admin-auth.ts so we share
// the AUTH_TOKEN_SECRET environment variable, and use a distinct "e:"
// signing prefix so a leaked/intercepted worker, foreman, or admin token
// can never be replayed against an executive endpoint (and vice versa).
//
// Before this change the cookie value was the literal string "AUTHORIZED_HANAN"
// or "AUTHORIZED_MOTI" — predictable from the source, so anyone who could
// set the cookie could impersonate Hanan or Moti against the executive +
// holding APIs. The current cookie format is `base64("<author>:<sig>")`
// where sig = HMAC-SHA256(secret, "e:<author>").slice(0, 32).
//
// Existing browsers carrying the old literal cookie will fail verification
// on first request after deploy and be redirected through /executive/auth
// to re-enter their PIN — same UX as a normal session expiry.

export const EXEC_COOKIE = "be_exec_token";

export const EXEC_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge:   60 * 60 * 24 * 30, // 30 days
  path:     "/",
};

export type ExecAuthor = "Hanan" | "Moti";

const VALID_AUTHORS: ExecAuthor[] = ["Hanan", "Moti"];

function execSig(author: ExecAuthor): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET env var is required");
  // "e:" namespace inside the HMAC input — distinct from "w:" (worker) and
  // the admin/foreman sigs in admin-auth.ts so cross-replay is impossible.
  return createHmac("sha256", secret).update(`e:${author}`).digest("hex").slice(0, 32);
}

export function buildExecToken(author: ExecAuthor): string {
  return Buffer.from(`${author}:${execSig(author)}`).toString("base64");
}

/** Verify cookie value and return author, or null if invalid. */
export function verifyExecToken(cookieValue: string): ExecAuthor | null {
  try {
    const decoded  = Buffer.from(cookieValue, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    const authorStr = decoded.slice(0, colonIdx);
    const sig       = decoded.slice(colonIdx + 1);
    if (!VALID_AUTHORS.includes(authorStr as ExecAuthor)) return null;
    const author = authorStr as ExecAuthor;
    if (!sig || sig !== execSig(author)) return null;
    return author;
  } catch { return null; }
}

export function getExecAuthorFromRequest(req: NextRequest): ExecAuthor | null {
  const cookie = req.cookies.get(EXEC_COOKIE)?.value;
  if (!cookie) return null;
  return verifyExecToken(cookie);
}

export function isExecAuthedFromRequest(req: NextRequest): boolean {
  return getExecAuthorFromRequest(req) !== null;
}

export function buildExecAuthCookie(author: ExecAuthor) {
  return { name: EXEC_COOKIE, value: buildExecToken(author), options: EXEC_COOKIE_OPTS };
}
