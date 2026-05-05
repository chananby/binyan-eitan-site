import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { verifyInternalToken } from "../../../../lib/admin-auth";
import { normalizePhone, phoneVariants } from "../../../../lib/phone";

export const runtime = "nodejs";

const INTERNAL_COOKIE = "be_internal_token";

// POST { phone } → returns that worker's own attendance history
// Requires the internal staff PIN cookie (set by /api/internal-auth)
export async function POST(req: NextRequest) {
  const token = req.cookies.get(INTERNAL_COOKIE)?.value ?? "";
  if (!verifyInternalToken(token))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { phone?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { phone } = body;
  if (!phone?.trim())
    return NextResponse.json({ error: "phone required" }, { status: 400 });

  const supabase = createServerClient();
  const normalized = normalizePhone(phone.trim());
  const variants   = phoneVariants(normalized);

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, name")
    .in("phone", variants)
    .limit(1);

  const worker = staffRows?.[0];
  if (!worker)
    return NextResponse.json({ error: "phone_not_found" }, { status: 404 });

  const { data: records, error } = await supabase
    .from("attendance")
    .select("id, action, timestamp_label, clock_at, created_at, is_manual, status, project:project_id(id, name)")
    .eq("staff_id", worker.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[worker/history]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ name: worker.name, records: records ?? [] });
}
