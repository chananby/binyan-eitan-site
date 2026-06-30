/**
 * /api/admin/payment-milestones — per-project collection-stage tracker.
 *
 *   GET ?project_id=…  — list a project's milestones (sort_order asc) +
 *                        per-status totals. project_id is required in
 *                        phase 1; the "global" view lives at
 *                        /api/admin/collections.
 *
 *   POST { project_id, title, amount, expected_date?, note? }
 *                      — create a milestone (status='future' default,
 *                        paid_amount=0 default, sort_order = MAX+1
 *                        within the project so new rows land at the
 *                        end of the list).
 *
 * Admin only. service_role; RLS-on with no policies, same posture as
 * financial_documents and the rest of /api/admin.
 *
 * Every SELECT here filters `deleted_at IS NULL` — the helper does it
 * too as defence-in-depth, but the query is the canonical gate.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";
import { computeMilestoneTotals } from "../../../../lib/payment-milestones";

export const runtime = "nodejs";

const MILESTONE_COLUMNS =
  "id, project_id, title, amount, paid_amount, status, sort_order, expected_date, note, marked_due_at, paid_at, created_at, updated_at";

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isISODate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// ── GET — list milestones for a project ─────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!isNonEmpty(projectId)) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payment_milestones")
    .select(MILESTONE_COLUMNS)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin/payment-milestones GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Totals come from the same filtered list — no extra round-trip and
  // they can't drift from what the client sees.
  const totals = computeMilestoneTotals(data ?? []);
  return NextResponse.json({ milestones: data ?? [], totals });
}

// ── POST — create a milestone ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    project_id?: string;
    title?: string;
    amount?: number;
    expected_date?: string | null;
    note?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!isNonEmpty(body.project_id)) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }
  if (!isNonEmpty(body.title)) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const amount = typeof body.amount === "number" ? body.amount : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (body.expected_date != null && body.expected_date !== "" && !isISODate(body.expected_date)) {
    return NextResponse.json({ error: "expected_date must be YYYY-MM-DD or null" }, { status: 400 });
  }

  const project_id = body.project_id.trim();
  const supabase = createServerClient();

  // sort_order = MAX(sort_order) + 1 within the project (0 if empty).
  // Computed here rather than via a DB trigger so the value comes back
  // in the response without a second SELECT.
  const { data: maxRow, error: maxErr } = await supabase
    .from("payment_milestones")
    .select("sort_order")
    .eq("project_id", project_id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) {
    console.error("[admin/payment-milestones POST — max sort]", JSON.stringify(maxErr));
    return NextResponse.json({ error: maxErr.message }, { status: 500 });
  }
  const nextSort = maxRow ? (maxRow.sort_order ?? -1) + 1 : 0;

  const { data, error } = await supabase
    .from("payment_milestones")
    .insert({
      project_id,
      title:         body.title.trim(),
      amount,
      expected_date: isISODate(body.expected_date) ? body.expected_date : null,
      note:          isNonEmpty(body.note) ? body.note.trim() : null,
      sort_order:    nextSort,
      // status defaults to 'future' + paid_amount defaults to 0 at the DB level.
    })
    .select(MILESTONE_COLUMNS)
    .single();

  if (error) {
    console.error("[admin/payment-milestones POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ milestone: data }, { status: 201 });
}
