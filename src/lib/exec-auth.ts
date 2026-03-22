import { NextRequest } from "next/server";
import { createHmac } from "crypto";

export const EXEC_COOKIE = "be_exec_token";

export const EXEC_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge:   60 * 60 * 24 * 30, // 30 days
  path:     "/",
};

export type ExecAuthor = "Hanan" | "Moti";

function execToken(author: ExecAuthor): string {
  const secret = process.env.ADMIN_PASSWORD ?? "be_internal_secret";
  return createHmac("sha256", secret + "-exec").update(`exec-v1-${author}`).digest("hex");
}

export function getExecAuthorFromRequest(req: NextRequest): ExecAuthor | null {
  const cookie = req.cookies.get(EXEC_COOKIE)?.value;
  if (!cookie) return null;
  if (cookie === execToken("Hanan")) return "Hanan";
  if (cookie === execToken("Moti"))  return "Moti";
  return null;
}

export function isExecAuthedFromRequest(req: NextRequest): boolean {
  return getExecAuthorFromRequest(req) !== null;
}

export function buildExecAuthCookie(author: ExecAuthor) {
  return { name: EXEC_COOKIE, value: execToken(author), options: EXEC_COOKIE_OPTS };
}
