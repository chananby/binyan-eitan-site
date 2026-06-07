import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getWorkerStaffIdFromRequest } from "../../../../lib/admin-auth";
import { checkRateLimit } from "../../../../lib/rate-limit";
import { israelWallClockToISO } from "../../../../lib/israel-time";

export const runtime = "nodejs";

// POST { action, date, time, project_id? }
//
// Creates a manual attendance record (status="pending", is_manual=true) for
// the calling worker — same effect as before, but identity now comes from
// the signed worker cookie (/api/worker/identify) instead of a free-form
// `phone` field. The body's phone is ignored if present.
//
// Rate-limit keys on the verified staff_id (15/15min) so workers sharing the
// same on-site Wi-Fi don't throttle each other.
export async function POST(req: NextRequest) {
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) {
    return NextResponse.json({ success: false, error: "יש להזדהות מחדש" }, { status: 401 });
  }

  const rl = checkRateLimit(`staff:${staffId}:worker-manual`, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { action?: string; date?: string; time?: string; project_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const { action, date, time, project_id } = body;
  if (!action || !date || !time)
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });

  if (!["in", "out"].includes(action))
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  const parts = date.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d)
    return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });

  // Format matching nowLabel() output: "28.4.2026, 08:30"
  const timestamp_label = `${d}.${m}.${y}, ${time}`;
  const clock_at = israelWallClockToISO(date, time);

  const supabase = createServerClient();

  // Bail to 401 if the cookie still verifies but the underlying row was
  // deactivated/soft-deleted in the meantime — same posture as identify GET
  // and worker/history.
  const { data: worker } = await supabase
    .from("staff")
    .select("id, name, active")
    .eq("id", staffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worker || worker.active === false) {
    return NextResponse.json({ success: false, error: "יש להזדהות מחדש" }, { status: 401 });
  }

  const payload: Record<string, unknown> = {
    staff_id:        worker.id,
    action,
    timestamp_label,
    clock_at,
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
