import { NextRequest, NextResponse } from "next/server";
import { buildAuthCookie, buildClearCookie } from "../../../lib/admin-auth";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

export const runtime = "nodejs";

// POST — verify password and set auth cookie
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`${clientIp(req)}:admin-auth`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD env var is not set" },
      { status: 500 }
    );
  }

  let password: string;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  const { name, value, options } = buildAuthCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}

// DELETE — logout (clear cookie)
export async function DELETE() {
  const { name, value, options } = buildClearCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}
