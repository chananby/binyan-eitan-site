import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE_NAME = "be_internal_token";

export async function POST(req: NextRequest) {
  const pin = process.env.INTERNAL_STAFF_PIN;
  if (!pin) {
    return NextResponse.json({ ok: false, error: "PIN not configured" }, { status: 500 });
  }
  const { code } = await req.json();
  if (typeof code === "string" && code === pin) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });
    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
