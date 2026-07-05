/**
 * /api/admin/documents/[id]/suggest-split — propose a per-project split
 * for a salary document, based on the linked worker's attendance in the
 * doc's calendar month.
 *
 * Flow:
 *   1. Load the doc → need vendor_id, doc_date, amount (amount_ils or
 *      total_amount fallback).
 *   2. Load the vendor → need staff_id.
 *   3. Load that staff's attendance for the month of doc_date, widened
 *      by ±1 day (TZ edges), rows joined to project_id.
 *   4. Aggregate hours per project via the pure helper (dominant project
 *      of the day → firstIn/lastOut hours attributed to it).
 *   5. Turn hours into ILS amounts proportional to the doc total,
 *      residual absorbed into the largest row so the sum matches
 *      exactly.
 *
 * Never mutates state — this is a pure proposal. The client seeds the
 * split panel with the returned rows and the user still saves through
 * POST /splits.
 *
 * Error codes returned as JSON `{error, code}`:
 *   • no_vendor           — doc has no vendor_id
 *   • vendor_not_linked   — vendor exists but staff_id is null
 *   • no_doc_date         — doc has no doc_date
 *   • no_amount           — doc has no amount_ils / total_amount > 0
 *   • no_attendance       — the worker didn't clock this month
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";
import {
  computeAttendanceProjectShares,
  shareHoursToIls,
  type AttendanceProjectRow,
} from "../../../../../../lib/attendance-project-shares";

export const runtime = "nodejs";

function reject(code: string, message: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

// "YYYY-MM-DD" → { prefix: "YYYY-MM", monthStart, monthEndExclusive }.
// Widened by ±1 day so the DB query catches TZ edges (a clock at 23:15
// on the last day of the month may land at UTC 20:15 on the same day but
// serialise to a boundary that trips a naïve range filter).
function monthWindow(docDate: string): { prefix: string; from: string; to: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(docDate)) return null;
  const [y, m] = docDate.split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const first = new Date(Date.UTC(y, m - 1, 1));
  const nextFirst = new Date(Date.UTC(y, m, 1));
  // Widen ±1 day around the month.
  const from = new Date(first.getTime() - 86_400_000).toISOString().slice(0, 10);
  const to   = new Date(nextFirst.getTime()).toISOString().slice(0, 10);   // exclusive
  return { prefix: `${y}-${String(m).padStart(2, "0")}`, from, to };
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  const supabase = createServerClient();

  // 1. Load doc.
  const { data: doc, error: docErr } = await supabase
    .from("financial_documents")
    .select("id, vendor_id, doc_date, amount_ils, total_amount, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (docErr) {
    console.error("[suggest-split doc]", JSON.stringify(docErr));
    return NextResponse.json({ error: docErr.message }, { status: 500 });
  }
  if (!doc || doc.deleted_at) return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  if (!doc.vendor_id) return reject("no_vendor", "למסמך אין ספק מקושר");
  if (!doc.doc_date) return reject("no_doc_date", "למסמך אין תאריך — לא ניתן לזהות חודש נוכחות");

  const docTotal = typeof doc.amount_ils === "number" && doc.amount_ils > 0
    ? doc.amount_ils
    : typeof doc.total_amount === "number" && doc.total_amount > 0
      ? doc.total_amount
      : null;
  if (docTotal == null) return reject("no_amount", "למסמך אין סכום חיובי");

  const win = monthWindow(doc.doc_date);
  if (!win) return reject("no_doc_date", "תאריך המסמך אינו תקין");

  // 2. Load vendor → staff link.
  const { data: vendor, error: vErr } = await supabase
    .from("vendors")
    .select("id, name, staff_id")
    .eq("id", doc.vendor_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (vErr) {
    console.error("[suggest-split vendor]", JSON.stringify(vErr));
    return NextResponse.json({ error: vErr.message }, { status: 500 });
  }
  if (!vendor) return reject("no_vendor", "ספק לא נמצא");
  if (!vendor.staff_id) return reject("vendor_not_linked", "הספק לא מקושר לעובד");

  // 3. Load staff attendance for the widened month window.
  // clock_at range chosen so we widen ±1 day around the calendar month;
  // the pure aggregator drops rows outside the actual month prefix.
  const fromISO = `${win.from}T00:00:00Z`;
  const toISO   = `${win.to}T23:59:59Z`;
  const { data: att, error: aErr } = await supabase
    .from("attendance")
    .select("action, clock_at, created_at, project_id")
    .eq("staff_id", vendor.staff_id)
    .is("deleted_at", null)
    .gte("clock_at", fromISO)
    .lte("clock_at", toISO);
  if (aErr) {
    console.error("[suggest-split attendance]", JSON.stringify(aErr));
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  const rows: AttendanceProjectRow[] = (att ?? []).map((r) => ({
    action: r.action ?? "",
    clock_at: r.clock_at ?? null,
    created_at: r.created_at ?? new Date().toISOString(),
    project_id: r.project_id ?? null,
  }));

  const { shares, totalHours, unassignedHours } = computeAttendanceProjectShares(rows, win.prefix);
  if (shares.length === 0) {
    return reject("no_attendance", `העובד לא צבר שעות עם פרויקט משויך בחודש ${win.prefix}`);
  }

  // 4. Turn hours → ILS proportional split.
  const draft = shareHoursToIls(shares, docTotal);
  if (draft.length === 0) {
    return reject("no_attendance", "לא ניתן לחשב פיצול (סה\"כ שעות = 0)");
  }

  // 5. Enrich with project names for the UI.
  const pids = draft.map((r) => r.project_id);
  const { data: projs } = await supabase
    .from("projects")
    .select("id, name")
    .in("id", pids);
  const nameMap = new Map<string, string>((projs ?? []).map((p) => [p.id, p.name]));

  return NextResponse.json({
    month: win.prefix,
    docTotal,
    totalHours,
    unassignedHours,
    staff_id: vendor.staff_id,
    vendor_name: vendor.name,
    proposal: draft.map((r) => ({
      project_id: r.project_id,
      project_name: nameMap.get(r.project_id) ?? "?",
      hours: r.hours,
      amount: r.amount,
    })),
  });
}
