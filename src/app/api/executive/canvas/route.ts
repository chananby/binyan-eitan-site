import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isExecAuthedFromRequest } from "../../../../lib/exec-auth";

export const runtime = "nodejs";

/** GET — fetch canvas content */
export async function GET(req: NextRequest) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("executive_canvas")
    .select("content, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: data?.content ?? "", updated_at: data?.updated_at });
}

/** PUT — save canvas content (upsert row id=1) */
export async function PUT(req: NextRequest) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { content?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("executive_canvas")
    .upsert({ id: 1, content: body.content ?? "", updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
