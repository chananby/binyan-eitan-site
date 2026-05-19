import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// ── GET /api/admin/quotes/[id] — fetch a single quote with full state ─────
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, quote_number, customer_name, issue_date, total_before_vat, status, data, created_at, updated_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[admin/quotes/[id] GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ quote: data });
}

// ── PATCH /api/admin/quotes/[id] — update an existing quote ────────────────
// Body: { data: {...full quote state...}, status?: "draft"|"sent"|... }
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { data?: Record<string, unknown>; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.data !== undefined) {
    const data = body.data;
    updates.data = data;
    // Refresh extracted indexable fields from new data
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.quoteNumber === "string")  updates.quote_number    = d.quoteNumber;
      if (typeof d.customerName === "string") updates.customer_name   = d.customerName;
      if (typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) updates.issue_date = d.date;
      updates.total_before_vat = computeTotal(data);
    }
  }

  if (typeof body.status === "string") {
    const allowed = ["draft", "sent", "accepted", "rejected", "archived"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .update(updates)
    .eq("id", params.id)
    .select("id, updated_at")
    .maybeSingle();

  if (error) {
    console.error("[admin/quotes/[id] PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, updated_at: data.updated_at });
}

// ── DELETE /api/admin/quotes/[id] — delete a quote ─────────────────────────
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("[admin/quotes/[id] DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Mirrors the helper in /api/admin/quotes/route.ts
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
