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
  const search = searchParams.get("search"); // optional customer-name search
  const limit  = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

  const supabase = createServerClient();
  let query = supabase
    .from("quotes")
    .select("id, quote_number, customer_name, issue_date, total_before_vat, status, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("customer_name", `%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/quotes GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quotes: data ?? [] });
}

// ── POST /api/admin/quotes — create a new quote ─────────────────────────────
// Body: { data: {...full quote state...} }
// Returns: { id, created_at }
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
  // Extract indexable fields from the state object (defensive — all optional)
  const quote_number    = typeof data.quoteNumber === "string" ? data.quoteNumber : null;
  const customer_name   = typeof data.customerName === "string" ? data.customerName : null;
  const issue_date      = typeof data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : null;
  const total_before_vat = computeTotal(data);
  const adminId         = getAdminIdFromRequest(req);

  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("quotes")
    .insert({
      quote_number,
      customer_name,
      issue_date,
      total_before_vat,
      data,
      created_by: adminId,
    })
    .select("id, created_at, updated_at")
    .single();

  if (error) {
    console.error("[admin/quotes POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: row.id, created_at: row.created_at, updated_at: row.updated_at });
}

// ── Helper: compute total from quote state ─────────────────────────────────
// Mirrors the in-browser grandTotal(): sum of (quantity × unitPrice) across
// all section items. Defensive — returns 0 if shape is unexpected.
function computeTotal(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const sections = (data as Record<string, unknown>).sections;
  if (!Array.isArray(sections)) return 0;
  let total = 0;
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
  return total;
}
