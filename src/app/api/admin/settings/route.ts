import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

/** PATCH /api/admin/settings  — upsert one or more key/value pairs */
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { key: string; value: string } | { pairs: { key: string; value: string }[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const pairs: { key: string; value: string }[] =
    "pairs" in body ? body.pairs : [{ key: body.key, value: body.value }];

  if (!pairs.length) return NextResponse.json({ error: "No pairs provided" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("settings")
    .upsert(pairs.map(p => ({ key: p.key, value: p.value })), { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: pairs.map(p => p.key) });
}
