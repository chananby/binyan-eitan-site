import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const pin = process.env.INTERNAL_STAFF_PIN;
  if (!pin) {
    return NextResponse.json({ ok: false, error: "PIN not configured" }, { status: 500 });
  }
  const { code } = await req.json();
  if (typeof code === "string" && code === pin) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
