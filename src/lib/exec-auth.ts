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

function execToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? "be_internal_secret";
  return createHmac("sha256", secret + "-exec").update("exec-v1").digest("hex");
}

export function isExecAuthedFromRequest(req: NextRequest): boolean {
  return req.cookies.get(EXEC_COOKIE)?.value === execToken();
}

export function getExecToken(): string {
  return execToken();
}
