import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  EXEC_COOKIE, buildExecAuthCookie, getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

/** GET — check cookie, return author */
export async function GET(req: NextRequest) {
  const author = getExecAuthorFromRequest(req);
  if (!author) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, author });
}

/** POST — verify PIN, identify user, set cookie */
export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { pin } = body;
  if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 400 });

  // Fetch PINs from settings table (fallback to env / hardcoded gematria defaults)
  const supabase = createServerClient();
  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["executive_pin_hanan", "executive_pin_moti"]);

  const pinMap = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]));
  const hananPin = pinMap["executive_pin_hanan"] ?? process.env.EXECUTIVE_PIN_HANAN ?? "108";
  const motiPin  = pinMap["executive_pin_moti"]  ?? process.env.EXECUTIVE_PIN_MOTI  ?? "274";

  let author: "Hanan" | "Moti" | null = null;
  if (pin === hananPin) author = "Hanan";
  else if (pin === motiPin) author = "Moti";

  if (!author) {
    return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
  }

  const { name, value, options } = buildExecAuthCookie(author);
  const res = NextResponse.json({ ok: true, author });
  res.cookies.set(name, value, options);
  return res;
}

/** DELETE — logout */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EXEC_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
