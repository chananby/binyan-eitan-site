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
export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const role     = getRoleFromRequest(req);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("projects")
    .select("id, name, status, foreman_id, address, lat, lng")
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
