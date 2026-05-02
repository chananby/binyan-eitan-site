import { NextRequest, NextResponse } from "next/server";
import { buildInternalCookie } from "../../../lib/admin-auth";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

export const runtime = "nodejs";

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
