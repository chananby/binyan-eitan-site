import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
  console.log("[executive/auth] PIN received:", pin);

  if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 400 });

  // Fetch PINs from settings table
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabase    = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: rows, error: dbErr } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["executive_pin_hanan", "executive_pin_moti"]);

  if (dbErr) console.log("[executive/auth] DB error:", dbErr.message);

  const pinMap   = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]));
  const hananPin = (pinMap["executive_pin_hanan"] ?? process.env.EXECUTIVE_PIN_HANAN ?? "108").trim();
  const motiPin  = (pinMap["executive_pin_moti"]  ?? process.env.EXECUTIVE_PIN_MOTI  ?? "274").trim();

  console.log("[executive/auth] PIN from DB — Hanan:", hananPin, "Moti:", motiPin);

  const trimmedPin = pin.trim();
  let author: "Hanan" | "Moti" | null = null;
  if (trimmedPin === hananPin) author = "Hanan";
  else if (trimmedPin === motiPin) author = "Moti";

  if (!author) {
    console.log("[executive/auth] PIN mismatch — rejecting");
    return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
  }

  const { name, value, options } = buildExecAuthCookie(author);
  console.log("[executive/auth] Cookie set —", name, "=", value);

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
