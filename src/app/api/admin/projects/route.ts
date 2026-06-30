import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — list projects. Foreman only sees their own (foreman_id match).
//
// Optional ?include= narrows or widens the project_type set. Default is
// 'site' so existing UI consumers (admin tab, ScheduleTab, IncomeTab,
// the foreman portal) continue to see exactly what they saw before the
// overhead/meta concept landed. Documents-related screens pass
// ?include=site,overhead so the project picker can offer "תקורות" as a
// destination for company-wide expense receipts.
//
//   ?include=site            → default, only site projects
//   ?include=site,overhead   → both
//   ?include=overhead        → only overhead (rare; admin tooling)
//
// Unknown values are dropped silently. An empty/missing param falls
// back to ['site'].
export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const role     = getRoleFromRequest(req);

  const includeRaw = req.nextUrl.searchParams.get("include");
  const validTypes = new Set(["site", "overhead"]);
  const includeTypes = includeRaw
    ? includeRaw.split(",").map(s => s.trim()).filter(t => validTypes.has(t))
    : [];
  // Empty after filtering → fall back to safe default rather than
  // accidentally returning nothing.
  const projectTypes = includeTypes.length > 0 ? includeTypes : ["site"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("projects")
    .select("id, name, status, foreman_id, address, lat, lng, project_type")
    .in("project_type", projectTypes)
    .order("status", { ascending: true })
    .order("name",   { ascending: true });

  if (role === "foreman") {
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ projects: [] });
    query = query.eq("foreman_id", staffId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

// POST — create new project (admin only). Geocodes address if provided.
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; foreman_id?: string; address?: string; lat?: number; lng?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, foreman_id, address } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "שם הפרויקט הוא שדה חובה" }, { status: 400 });
  }

  // If caller passed lat/lng explicitly use them; else try to geocode the
  // address. Address-only project (no coords) is fine — admin can still
  // save and add coords later.
  let lat: number | null = body.lat ?? null;
  let lng: number | null = body.lng ?? null;
  let geocodeFailed = false;
  if (lat == null && lng == null && address?.trim()) {
    const { geocodeAddress } = await import("../../../../lib/geocode");
    const r = await geocodeAddress(address.trim());
    if (r) { lat = r.lat; lng = r.lng; }
    else { geocodeFailed = true; }
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      status: "active",
      foreman_id: foreman_id || null,
      address: address?.trim() || null,
      lat, lng,
    })
    .select("id, name, status, foreman_id, address, lat, lng")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data, geocode_failed: geocodeFailed }, { status: 201 });
}
