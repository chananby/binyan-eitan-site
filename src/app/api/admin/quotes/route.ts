import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest, getAdminIdFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// ── GET /api/admin/quotes — list all quotes (newest first) ─────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter
  const search = searchParams.get("search")?.trim() || null;
  const limit  = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const supabase = createServerClient();
  let query = supabase
    .from("quotes")
    .select("id, quote_number, customer_name, issue_date, total_before_vat, status, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  // Search both customer_name and quote_number — customers think in either.
  // The customer_name GIN trigram index (quotes_customer_trgm_idx) accelerates
  // the ILIKE when the pattern has ≥3 chars between wildcards.
  if (search) {
    const pat = `%${search}%`;
    query = query.or(`customer_name.ilike.${pat},quote_number.ilike.${pat}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/quotes GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quotes: data ?? [] });
}

// ── POST /api/admin/quotes — create a new quote ─────────────────────────────
// Body: { data: {...full quote state...} }
// Returns: { id, quote_number, created_at, updated_at }
//
// Quote-number allocation: if the client sends an empty/missing quoteNumber,
// the server queries MAX(numeric quote_number) + 1 and assigns it. The DB has
// a partial UNIQUE index on quote_number, so a concurrent allocator that hits
// the same MAX surfaces as 23505 and we retry once with a freshly-read MAX.
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body.data ?? {};
  const clientQuoteNumber = typeof data.quoteNumber === "string" ? data.quoteNumber.trim() : "";
  const customer_name    = typeof data.customerName === "string" ? data.customerName : null;
  const issue_date       = typeof data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : null;
  const total_before_vat = computeTotal(data);
  const adminId          = getAdminIdFromRequest(req);
  const supabase         = createServerClient();

  async function nextQuoteNumber(): Promise<string> {
    // RPC-less: read the current max numeric quote_number and add 1.
    // PostgREST can't sort text as int, so we filter to all-digit values,
    // pull the small candidate set, and reduce client-side.
    const { data: rows, error } = await supabase
      .from("quotes")
      .select("quote_number")
      .not("quote_number", "is", null)
      .neq("quote_number", "");
    if (error) throw error;
    let max = 0;
    for (const r of rows ?? []) {
      const v = (r as { quote_number: string | null }).quote_number;
      if (v && /^\d+$/.test(v)) {
        const n = parseInt(v, 10);
        if (n > max) max = n;
      }
    }
    return String(max + 1);
  }

  async function insertOnce(quote_number: string) {
    return await supabase
      .from("quotes")
      .insert({ quote_number, customer_name, issue_date, total_before_vat, data, created_by: adminId })
      .select("id, quote_number, created_at, updated_at")
      .single();
  }

  let assigned = clientQuoteNumber;
  let attempt: Awaited<ReturnType<typeof insertOnce>>;

  if (!assigned) {
    assigned = await nextQuoteNumber();
    // Keep the JSON blob in sync with the column we're about to write. If
    // we don't, a later iframe reload hydrates state from this blob, sees
    // an empty quoteNumber, and the PATCH handler then overwrites the
    // column to "" — the regression that filled the table with empty-
    // numbered rows from 2026-05-18T12:08 onward.
    if (data && typeof data === "object") {
      (data as Record<string, unknown>).quoteNumber = assigned;
    }
    attempt = await insertOnce(assigned);
    // 23505 = unique_violation. A racing POST grabbed the same MAX.
    // Re-read MAX and try one more time before giving up.
    if (attempt.error && attempt.error.code === "23505") {
      assigned = await nextQuoteNumber();
      if (data && typeof data === "object") {
        (data as Record<string, unknown>).quoteNumber = assigned;
      }
      attempt = await insertOnce(assigned);
    }
  } else {
    attempt = await insertOnce(assigned);
  }

  if (attempt.error) {
    console.error("[admin/quotes POST]", JSON.stringify(attempt.error));
    return NextResponse.json({ error: attempt.error.message }, { status: 500 });
  }

  const row = attempt.data!;
  return NextResponse.json({
    id:           row.id,
    quote_number: row.quote_number,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
  });
}

// ── Helper: compute total from quote state ─────────────────────────────────
// Mirrors the in-browser effectiveBase(): sum of (quantity × unitPrice) across
// all section items; when that's 0 (a lump-sum quote with no priced sections)
// fall back to the manual `totalOverride` so the quotes list shows the real
// price instead of ₪0. Defensive — returns 0 if the shape is unexpected.
function computeTotal(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const d = data as Record<string, unknown>;
  const sections = d.sections;
  let total = 0;
  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (!section || typeof section !== "object") continue;
      const items = (section as Record<string, unknown>).items;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const q = Number((item as Record<string, unknown>).quantity) || 0;
        const p = Number((item as Record<string, unknown>).unitPrice) || 0;
        total += q * p;
      }
    }
  }
  if (total === 0) {
    const override = Number(d.totalOverride) || 0;
    if (override > 0) return override;
  }
  return total;
}
