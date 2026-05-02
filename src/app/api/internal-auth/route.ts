import { NextRequest, NextResponse } from "next/server";
import { buildInternalCookie } from "../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
