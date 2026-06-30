import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// PATCH — update project (status toggle or rename)
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    status?: string; name?: string; foreman_id?: string | null;
    address?: string | null;
    lat?: number | null; lng?: number | null;
    budget?: number | null;
    geocode?: boolean; // if true, re-geocode the (possibly updated) address
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow updating known fields
  const update: Record<string, unknown> = {};
  if (body.status     !== undefined) update.status     = body.status;
  if (body.name       !== undefined) update.name       = body.name?.trim() || null;
  if (body.foreman_id !== undefined) update.foreman_id = body.foreman_id || null;
  if (body.address    !== undefined) update.address    = body.address?.trim() || null;
  if (body.lat        !== undefined) update.lat        = body.lat;
  if (body.lng        !== undefined) update.lng        = body.lng;
  // budget: a number sets it, null clears it ("no budget defined").
  if (body.budget     !== undefined) update.budget     = (typeof body.budget === "number" && Number.isFinite(body.budget)) ? body.budget : null;

  // Optional: trigger fresh geocoding. Useful when the admin updates the
  // address and wants coords refreshed. Done before the DB write so we
  // include lat/lng in a single transaction.
  let geocodeFailed = false;
  if (body.geocode) {
    const addressToUse = body.address?.trim();
    if (addressToUse) {
      const { geocodeAddress } = await import("../../../../../lib/geocode");
      const r = await geocodeAddress(addressToUse);
      if (r) { update.lat = r.lat; update.lng = r.lng; }
      else { geocodeFailed = true; }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", params.id)
    .select("id, name, status, foreman_id, address, lat, lng, budget")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data, geocode_failed: geocodeFailed });
}

// DELETE — refuses every request. The project lifecycle uses the
// status='inactive' toggle (see PATCH above) instead of hard delete:
// every FK that points at projects (attendance, schedule_assignments,
// daily_reports, materials, payment_milestones, financial_documents,
// …) would orphan without a cascade we don't want.
//
// Overhead projects get an extra-explicit 403 with the reason spelled
// out, because deleting the "תקורות" row would silently unlink every
// company-overhead receipt from its destination.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("projects")
    .select("project_type")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row)  return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });

  if (row.project_type === "overhead") {
    return NextResponse.json(
      { error: "אסור למחוק את פרויקט התקורות — הוא משויך למסמכים פיננסיים. אפשר להשבית אותו עם סטטוס=לא פעיל, אם נדרש." },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { error: "מחיקת פרויקטים אינה נתמכת — השבת את הפרויקט (סטטוס=לא פעיל) במקום." },
    { status: 405 },
  );
}
