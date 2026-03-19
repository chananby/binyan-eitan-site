import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";
import { buildForemanAuthCookie, buildForemanClearCookie } from "../../../lib/admin-auth";

export const runtime = "nodejs";

// POST — verify PIN against staff table, set foreman cookie
export async function POST(req: NextRequest) {
  let code: string;
  try { ({ code } = await req.json()); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  if (!code || code.trim().length < 4) {
    return NextResponse.json({ ok: false, error: "wrong_pin" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name")
    .eq("pin", code.trim())
    .eq("role", "ממונה")
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("[foreman-auth POST]", JSON.stringify(error));
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "wrong_pin" }, { status: 401 });
  }

  const { name, value, options } = buildForemanAuthCookie(data.id);
  const res = NextResponse.json({ ok: true, name: data.name });
  res.cookies.set(name, value, options);
  return res;
}

// DELETE — logout foreman
export async function DELETE() {
  const { name, value, options } = buildForemanClearCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}
