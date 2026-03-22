import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  EXEC_COOKIE, EXEC_COOKIE_OPTS, isExecAuthedFromRequest, getExecToken,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

/** GET — check if cookie is valid */
export async function GET(req: NextRequest) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

/** POST — verify PIN, set cookie */
export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { pin } = body;
  if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 400 });

  // PIN stored in settings table (key = "executive_pin") or env fallback
  const supabase = createServerClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "executive_pin")
    .maybeSingle();

  const correctPin = data?.value ?? process.env.EXECUTIVE_PIN ?? "0000";

  if (pin !== correctPin) {
    return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(EXEC_COOKIE, getExecToken(), EXEC_COOKIE_OPTS);
  return res;
}

/** DELETE — logout */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EXEC_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
