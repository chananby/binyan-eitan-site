import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { verifyInternalToken } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const INTERNAL_COOKIE = "be_internal_token";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return "0" + digits.slice(3);
  if (digits.startsWith("0"))   return digits;
  return "0" + digits;
}

// POST { phone, action, date, time, project_id? }
// Creates a manual attendance record with status="pending" for admin approval.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(INTERNAL_COOKIE)?.value ?? "";
  if (!verifyInternalToken(token))
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let body: { phone?: string; action?: string; date?: string; time?: string; project_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const { phone, action, date, time, project_id } = body;
  if (!phone?.trim() || !action || !date || !time)
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });

  if (!["in", "out"].includes(action))
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  const parts = date.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d)
    return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });

  // Format matching nowLabel() output: "28.4.2026, 08:30"
  const timestamp_label = `${d}.${m}.${y}, ${time}`;

  const supabase = createServerClient();
  const normalized = normalizePhone(phone.trim());
  const variants = [
    normalized,
    normalized.slice(1),
    "972" + normalized.slice(1),
    "+972" + normalized.slice(1),
  ];

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, name")
    .in("phone", variants)
    .limit(1);

  const worker = staffRows?.[0];
  if (!worker)
    return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 404 });

  const payload: Record<string, unknown> = {
    staff_id:        worker.id,
    action,
    timestamp_label,
    is_manual:       true,
    status:          "pending",
    lat:             null,
    lng:             null,
  };
  if (project_id) payload.project_id = project_id;

  const { error } = await supabase.from("attendance").insert(payload);
  if (error) {
    console.error("[worker/manual-entry]", JSON.stringify(error));
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, name: worker.name });
}
