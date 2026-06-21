/**
 * /api/admin/catalog-items — the fixed-items catalog backing the quote
 * generator's autocomplete and "save-as-fixed" flow.
 *
 *   GET  ?q=&limit=20  — list catalog items (live only). Optional `q`
 *                        substring-matches `name` via ILIKE (the
 *                        catalog_items_name_trgm_idx accelerates it).
 *                        Sorted usage_count DESC, name ASC so frequently
 *                        picked items surface at the top of autocomplete.
 *   POST { items }     — bulk add. Pre-filters against existing rows by
 *                        normalized name so duplicates from the client
 *                        are silently absorbed (no error, just counted
 *                        as skipped). The DB-level partial unique index
 *                        on LOWER(TRIM(name)) WHERE deleted_at IS NULL
 *                        is the last-line guard.
 *
 * Admin only. Service-role client — the table has RLS on with no
 * policies, matching the staff/quotes posture.
 *
 * Note on POST + functional unique index: supabase-js can't express
 * "ON CONFLICT ((LOWER(TRIM(name)))) DO NOTHING" because the constraint
 * target is an expression. We get the same outcome with a pre-filter
 * (SELECT live names → set difference) plus a try/catch on 23505 in
 * case a concurrent insert raced us. The catalog is small and admin-
 * only, so the round-trip cost is irrelevant.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest, getAdminIdFromRequest } from "../../../../lib/admin-auth";
import { normalizeName } from "../../../../lib/catalog-items-diff";

export const runtime = "nodejs";

const LIST_COLUMNS = "id, name, unit, unit_price, usage_count";
const MAX_LIMIT_DEFAULT = 20;
const MAX_LIMIT_CAP     = 200; // a paranoia cap so an enormous limit can't drag the autocomplete

// ── GET — list catalog items, optional name filter ──────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? String(MAX_LIMIT_DEFAULT), 10) || MAX_LIMIT_DEFAULT, 1),
    MAX_LIMIT_CAP,
  );

  const supabase = createServerClient();
  let query = supabase
    .from("catalog_items")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    // Hottest first, then alphabetical within a tier. Stable for the
    // autocomplete — repeat queries return rows in the same order.
    .order("usage_count", { ascending: false })
    .order("name",        { ascending: true })
    .limit(limit);

  // Escape ILIKE wildcards in user input so a "%" they typed doesn't
  // turn into a wildcard against their will.
  if (q) {
    const pat = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    query = query.ilike("name", pat);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/catalog-items GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

// ── POST — bulk add catalog items (dup-safe) ────────────────────────────────
//
// Body: { items: Array<{ name: string; unit?: string|null; unit_price?: number|null }> }
// Returns: { inserted: number, skipped: number, items: Array<inserted row> }
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: Array<{ name?: string; unit?: string | null; unit_price?: number | null }> };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const raw = Array.isArray(body.items) ? body.items : [];

  // Sanitize + dedupe within the request payload first. Empty names and
  // non-positive prices are dropped — same "worthy of catalog" rule the
  // diff helper applies on the client side.
  const offered = new Map<string, { name: string; unit: string | null; unit_price: number | null }>();
  for (const r of raw) {
    const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
    if (!name) continue;
    const price = typeof r.unit_price === "number" && r.unit_price > 0 ? r.unit_price : null;
    if (price == null) continue;
    const unit = typeof r.unit === "string" && r.unit.trim() ? r.unit.trim() : null;
    const key = normalizeName(name);
    if (!offered.has(key)) offered.set(key, { name, unit, unit_price: price });
  }

  if (offered.size === 0) {
    return NextResponse.json({ inserted: 0, skipped: raw.length, items: [] });
  }

  const supabase = createServerClient();

  // Filter against existing live rows. Pull just the `name` column — the
  // catalog is small (sub-thousand by design), so a full scan is cheaper
  // and simpler than narrowing with an .in() over normalized values that
  // the SQL side can't represent directly.
  const { data: existing, error: selErr } = await supabase
    .from("catalog_items")
    .select("name")
    .is("deleted_at", null);
  if (selErr) {
    console.error("[admin/catalog-items POST] select existing failed:", JSON.stringify(selErr));
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  const existingKeys = new Set(
    (existing ?? []).map((r) => normalizeName((r as { name: string }).name)),
  );

  const toInsert = [...offered.entries()]
    .filter(([key]) => !existingKeys.has(key))
    .map(([, row]) => row);
  const skipped = raw.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, skipped, items: [] });
  }

  // Tag the created_by so future audits can see who first added a name
  // to the catalog. Same FK shape the quotes table uses (admins.id).
  const adminId = getAdminIdFromRequest(req);
  const rows = toInsert.map((r) => ({ ...r, ...(adminId ? { created_by: adminId } : {}) }));

  const { data: inserted, error: insErr } = await supabase
    .from("catalog_items")
    .insert(rows)
    .select(LIST_COLUMNS);

  if (insErr) {
    // 23505 = unique_violation — a concurrent admin added the same name
    // between our SELECT and the INSERT. Treat as "they got there first":
    // re-read the catalog, recompute the residual, retry once. Anything
    // else is a real error.
    if ((insErr as { code?: string }).code === "23505") {
      const { data: existing2 } = await supabase
        .from("catalog_items").select("name").is("deleted_at", null);
      const keys2 = new Set((existing2 ?? []).map((r) => normalizeName((r as { name: string }).name)));
      const retryRows = rows.filter((r) => !keys2.has(normalizeName(r.name)));
      if (retryRows.length === 0) {
        return NextResponse.json({ inserted: 0, skipped: raw.length, items: [] });
      }
      const { data: inserted2, error: insErr2 } = await supabase
        .from("catalog_items").insert(retryRows).select(LIST_COLUMNS);
      if (insErr2) {
        console.error("[admin/catalog-items POST] retry insert failed:", JSON.stringify(insErr2));
        return NextResponse.json({ error: insErr2.message }, { status: 500 });
      }
      return NextResponse.json({
        inserted: inserted2?.length ?? 0,
        skipped:  raw.length - (inserted2?.length ?? 0),
        items:    inserted2 ?? [],
      });
    }
    console.error("[admin/catalog-items POST] insert failed:", JSON.stringify(insErr));
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: inserted?.length ?? 0,
    skipped,
    items:    inserted ?? [],
  });
}
