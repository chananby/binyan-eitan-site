import { NextRequest, NextResponse } from "next/server";
import { buildForemanAuthCookie, buildForemanClearCookie } from "../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const pin = process.env.FOREMAN_PIN;
  if (!pin) return NextResponse.json({ ok: false, error: "FOREMAN_PIN not configured" }, { status: 500 });

  let code: string;
  try { ({ code } = await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  if (code !== pin) return NextResponse.json({ ok: false, error: "wrong_pin" }, { status: 401 });

  const { name, value, options } = buildForemanAuthCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}

export async function DELETE() {
  const { name, value, options } = buildForemanClearCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}
