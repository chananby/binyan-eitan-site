import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  EXEC_COOKIE, buildExecAuthCookie, getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

/**
 * GET — check exec cookie, return author.
 *
 * Note: admin-cookie auto-grant was removed (admins must enter their PIN
 * separately to access executive surfaces).
 */
export async function GET(req: NextRequest) {
  const cookieAuthor = getExecAuthorFromRequest(req);
  if (cookieAuthor) return NextResponse.json({ ok: true, author: cookieAuthor });
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** POST — verify PIN against settings table, identify user, set cookie */
export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const pin = (body.pin ?? "").trim();
  if (!pin) return NextResponse.json({ error: "PIN required" }, { status: 400 });

  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const supabase    = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: rows, error: dbErr } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["executive_pin_hanan", "executive_pin_moti"]);

    if (dbErr) {
      console.error("[executive/auth] DB error code:", dbErr.code);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const pinMap   = Object.fromEntries((rows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const hananPin = (pinMap["executive_pin_hanan"] ?? "").trim();
    const motiPin  = (pinMap["executive_pin_moti"]  ?? "").trim();

    let author: "Hanan" | "Moti" | null = null;
    if (hananPin && pin === hananPin) author = "Hanan";
    else if (motiPin && pin === motiPin) author = "Moti";

    if (author) {
      const { name, value, options } = buildExecAuthCookie(author);
      const res = NextResponse.json({ ok: true, author });
      res.cookies.set(name, value, options);
      return res;
    }
  } catch (e) {
    console.error("[executive/auth] lookup failed:", e instanceof Error ? e.message : "unknown");
  }

  return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
}

/** DELETE — logout */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EXEC_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
