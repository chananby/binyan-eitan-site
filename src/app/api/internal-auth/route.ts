import { NextRequest, NextResponse } from "next/server";
import { buildInternalCookie, verifyInternalToken } from "../../../lib/admin-auth";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const INTERNAL_COOKIE = "be_internal_token";

// Cookie probe — used by InternalClientLayout to decide whether to show the PIN gate.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(INTERNAL_COOKIE)?.value;
  if (token && verifyInternalToken(token)) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`${clientIp(req)}:internal-auth`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const pin = process.env.INTERNAL_STAFF_PIN;
  if (!pin) {
    return NextResponse.json({ ok: false, error: "PIN not configured" }, { status: 500 });
  }
  const { code } = await req.json();
  if (typeof code === "string" && code === pin) {
    const res = NextResponse.json({ ok: true });
    const { name, value, options } = buildInternalCookie();
    res.cookies.set(name, value, options);
    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
