import { NextRequest } from "next/server";

export const EXEC_COOKIE = "be_exec_token";

export const EXEC_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge:   60 * 60 * 24 * 30, // 30 days
  path:     "/",
};

export type ExecAuthor = "Hanan" | "Moti";

export function getExecAuthorFromRequest(req: NextRequest): ExecAuthor | null {
  const cookie = req.cookies.get(EXEC_COOKIE)?.value ?? "";
  if (cookie === "AUTHORIZED_HANAN") return "Hanan";
  if (cookie === "AUTHORIZED_MOTI")  return "Moti";
  return null;
}

export function isExecAuthedFromRequest(req: NextRequest): boolean {
  return getExecAuthorFromRequest(req) !== null;
}

export function buildExecAuthCookie(author: ExecAuthor) {
  const value = author === "Hanan" ? "AUTHORIZED_HANAN" : "AUTHORIZED_MOTI";
  return { name: EXEC_COOKIE, value, options: EXEC_COOKIE_OPTS };
}
