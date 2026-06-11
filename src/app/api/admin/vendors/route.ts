/**
 * /api/admin/vendors — financial-inbox vendor directory
 *   GET  — list vendors (deleted_at IS NULL), optional q (ILIKE on name).
 *   POST — create a vendor { name, tax_id?, notes? }.
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// ── GET — list vendors ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || null;

  const supabase = createServerClient();
  let query = supabase
    .from("vendors")
    .select("id, name, tax_id, notes, created_at")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/vendors GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ vendors: data ?? [] });
}

// ── POST — create a vendor ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; tax_id?: string; notes?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "שם ספק נדרש" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("vendors")
    .insert({
      name,
      tax_id: body.tax_id?.trim() || null,
      notes:  body.notes?.trim()  || null,
    })
    .select("id, name, tax_id, notes, created_at")
    .single();

  if (error) {
    console.error("[admin/vendors POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vendor: row }, { status: 201 });
}
