import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getWorkerStaffIdFromRequest } from "../../../../lib/admin-auth";
import { checkRateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

// POST → returns the calling worker's own attendance history.
//
// Identity is read EXCLUSIVELY from the signed worker cookie set by
// /api/worker/identify. The phone field in the body (if present) is
// ignored — it used to be the identifier, which let any PIN-holder pull
// any coworker's records. Strict rejection of unauthenticated callers.
//
// Rate-limit keys on the verified staff_id (not IP) so an entire crew
// clocking in from the same site Wi-Fi can each fetch their history
// without throttling each other. 15/15min covers normal refresh patterns
// while still capping a runaway client.
export async function POST(req: NextRequest) {
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) {
    return NextResponse.json({ error: "יש להזדהות מחדש" }, { status: 401 });
  }

  const rl = checkRateLimit(`staff:${staffId}:worker-history`, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const supabase = createServerClient();

  // Worker name surfaced so the UI can show "הנוכחות שלי — <name>" without
  // a second roundtrip. Bail to 401 if the row was deactivated since the
  // cookie was issued — same posture as /api/worker/identify GET.
  const { data: worker } = await supabase
    .from("staff")
    .select("id, name, active")
    .eq("id", staffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worker || worker.active === false) {
    return NextResponse.json({ error: "יש להזדהות מחדש" }, { status: 401 });
  }

  const { data: records, error } = await supabase
    .from("attendance")
    .select("id, action, timestamp_label, clock_at, created_at, is_manual, status, project:project_id(id, name)")
    .is("deleted_at", null)
    .eq("staff_id", worker.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[worker/history]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Annotate the records with the worker's open correction requests so the
  // UI can swap the "דווח על טעות" button for a "תיקון נשלח" chip without
  // a second roundtrip. Same query for *all* statuses lets the UI also
  // surface approved/rejected outcomes later if we want.
  const rows = records ?? [];
  const ids = rows.map((r) => r.id);
  const corrections: Record<string, { id: string; status: string; proposed_time: string | null }> = {};
  if (ids.length > 0) {
    const { data: corrs } = await supabase
      .from("attendance_corrections")
      .select("id, attendance_id, status, proposed_time")
      .in("attendance_id", ids)
      .order("created_at", { ascending: false });
    if (corrs) {
      // First (newest) per attendance_id wins — the UI cares about the most
      // recent decision for each row.
      for (const c of corrs) {
        if (!corrections[c.attendance_id]) {
          corrections[c.attendance_id] = {
            id: c.id, status: c.status, proposed_time: c.proposed_time,
          };
        }
      }
    }
  }

  return NextResponse.json({ name: worker.name, records: rows, corrections });
}
