/**
 * /api/admin/schedule/copy-week — copy a whole week's schedule to the
 * next week (source_sunday + 7).
 *
 *   POST { source_sunday, force? }
 *
 *     1. SELECT every schedule_assignments row whose date is in the
 *        5-day source range. Preserves status + note so out-of-band
 *        rows don't lose semantics on the way over.
 *     2. SELECT vacation_days for the target week so any (staff_id,
 *        target_date) that overlaps a vacation is skipped — vacation
 *        in the target wins over a copied site. Temps (staff_id null)
 *        are never filtered; they have no vacation concept.
 *     3. Guard: if the target week already has rows AND `force` is
 *        not true, return 409 with { existing_count }. The client
 *        re-POSTs with force:true after an admin confirm so we never
 *        silently overwrite. The guard is server-side specifically to
 *        kill the TOCTOU race between a client's "is it empty?" GET
 *        and the POST.
 *     4. With force (or empty target): bulk DELETE target dates,
 *        then bulk INSERT the transformed rows. Same DELETE-then-
 *        INSERT pattern the rest of /api/admin/schedule uses (the
 *        partial UNIQUE on staff_id rules out a clean upsert).
 *
 * Atomicity: two queries, not a transaction (Supabase service_role
 * REST doesn't expose one). If DELETE succeeds and INSERT fails the
 * target week is left empty — acceptable because the admin already
 * authorised the overwrite. If this becomes a real problem in
 * production we'll move to a Postgres RPC; for now we match the
 * existing apply-week shape.
 *
 * Admin only. service_role.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import {
  weekRange,
  buildCopyTargetRows,
  type CopyableScheduleRow,
} from "../../../../../lib/schedule-state";
import { addWeeks } from "../../../../../lib/israel-week";
import { resolveActorLabel } from "../../../../../lib/audit-actor";

export const runtime = "nodejs";

// Includes status + note so the copy preserves them; the broader
// /api/admin/schedule reads use a narrower set.
const COPY_SELECT_COLUMNS =
  "staff_id, temp_name, date, project_id, project_name, status, note";

function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { source_sunday?: string; force?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!isDate(body.source_sunday)) {
    return NextResponse.json(
      { error: "source_sunday required (YYYY-MM-DD, Sunday)" },
      { status: 400 },
    );
  }
  const sourceSunday = body.source_sunday;
  const targetSunday = addWeeks(sourceSunday, 1);
  const sourceDates  = weekRange(sourceSunday);
  const targetDates  = weekRange(targetSunday);
  const force        = body.force === true;

  const supabase = createServerClient();

  // ── 1. Read source rows (we need status + note too) ──────────────────────
  const sourceRes = await supabase
    .from("schedule_assignments")
    .select(COPY_SELECT_COLUMNS)
    .in("date", sourceDates);
  if (sourceRes.error) {
    console.error("[copy-week — source select]", sourceRes.error.message);
    return NextResponse.json({ error: sourceRes.error.message }, { status: 500 });
  }
  const sourceRows = (sourceRes.data ?? []) as CopyableScheduleRow[];

  // ── 2. Guard against silent overwrite ────────────────────────────────────
  //   A non-empty target without `force` returns 409 carrying the count so
  //   the client confirm dialog can show a real number. No write happens.
  if (!force) {
    const countRes = await supabase
      .from("schedule_assignments")
      .select("id", { count: "exact", head: true })
      .in("date", targetDates);
    if (countRes.error) {
      console.error("[copy-week — target count]", countRes.error.message);
      return NextResponse.json({ error: countRes.error.message }, { status: 500 });
    }
    const existing = countRes.count ?? 0;
    if (existing > 0) {
      return NextResponse.json(
        { error: "target week not empty", existing_count: existing },
        { status: 409 },
      );
    }
  }

  // ── 3. Vacation days that intersect the target week ──────────────────────
  //   One query for every staff at every target date — used as a set
  //   the pure helper can ask in O(1).
  const vacRes = await supabase
    .from("vacation_days")
    .select("staff_id, date")
    .in("date", targetDates);
  if (vacRes.error) {
    // Soft-fail mirroring apply-week — losing the vacation lookup
    // shouldn't block the copy; the worst case is we copy onto a
    // vacation day, which the admin can clear.
    console.warn("[copy-week — vacation lookup]", JSON.stringify(vacRes.error));
  }
  const vacationKeys = new Set(
    (vacRes.data ?? []).map((v) => v.staff_id + "|" + v.date),
  );

  // ── 4. Transform — pure helper, tested in isolation ──────────────────────
  const { inserts, skippedVacation } = buildCopyTargetRows(
    sourceRows,
    vacationKeys,
    sourceDates,
    targetDates,
  );

  // ── 5. Clear target week + insert transformed rows ───────────────────────
  const delRes = await supabase
    .from("schedule_assignments")
    .delete()
    .in("date", targetDates);
  if (delRes.error) {
    console.error("[copy-week — target delete]", delRes.error.message);
    return NextResponse.json({ error: delRes.error.message }, { status: 500 });
  }

  if (inserts.length === 0) {
    return NextResponse.json({
      inserted: 0,
      skipped_vacation: skippedVacation,
      target_sunday: targetSunday,
    });
  }

  const created_by = await resolveActorLabel(supabase, req);
  const updated_at = new Date().toISOString();
  const rows = inserts.map((r) => ({ ...r, created_by, updated_at }));

  const insRes = await supabase
    .from("schedule_assignments")
    .insert(rows)
    .select("id");
  if (insRes.error) {
    console.error("[copy-week — insert]", JSON.stringify(insRes.error));
    return NextResponse.json({ error: insRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: insRes.data?.length ?? rows.length,
    skipped_vacation: skippedVacation,
    target_sunday: targetSunday,
  });
}
