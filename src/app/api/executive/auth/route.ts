import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  EXEC_COOKIE, buildExecAuthCookie, getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

// ── Hardcoded bypass PINs (temporary — replace when DB sync is confirmed) ─────
const BYPASS_PINS: Record<string, "Hanan" | "Moti"> = {
  "108": "Hanan",
  "274": "Moti",
};

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

  const pin = (body.pin ?? "").trim();
  console.log("[executive/auth] PIN received:", pin);

  if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 400 });

  // ── Step 1: Hardcoded bypass (no DB, no env vars) ─────────────────────────
  const bypassAuthor = BYPASS_PINS[pin];
  if (bypassAuthor) {
    console.log("[executive/auth] BYPASS match →", bypassAuthor);
    const { name, value, options } = buildExecAuthCookie(bypassAuthor);
    console.log("[executive/auth] Cookie set:", name, "=", value);
    const res = NextResponse.json({ ok: true, author: bypassAuthor });
    res.cookies.set(name, value, options);
    return res;
  }

  // ── Step 2: DB lookup (fallback for custom PINs) ───────────────────────────
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const supabase    = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: rows, error: dbErr } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["executive_pin_hanan", "executive_pin_moti"]);

    if (dbErr) console.log("[executive/auth] DB error:", dbErr.message);

    const pinMap   = Object.fromEntries((rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const hananPin = (pinMap["executive_pin_hanan"] ?? "").trim();
    const motiPin  = (pinMap["executive_pin_moti"]  ?? "").trim();

    console.log("[executive/auth] DB PINs — Hanan:", hananPin || "(empty)", "Moti:", motiPin || "(empty)");

    let author: "Hanan" | "Moti" | null = null;
    if (hananPin && pin === hananPin) author = "Hanan";
    else if (motiPin && pin === motiPin) author = "Moti";

    if (author) {
      const { name, value, options } = buildExecAuthCookie(author);
      console.log("[executive/auth] DB match → Cookie set:", name, "=", value);
      const res = NextResponse.json({ ok: true, author });
      res.cookies.set(name, value, options);
      return res;
    }
  } catch (e) {
    console.log("[executive/auth] DB lookup failed:", String(e));
  }

  console.log("[executive/auth] No match — rejecting PIN");
  return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
}

/** DELETE — logout */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EXEC_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
