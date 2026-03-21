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
    .select("id, name, status, foreman_id")
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

// POST — create new project (admin only)
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; foreman_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, foreman_id } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "שם הפרויקט הוא שדה חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name: name.trim(), status: "active", foreman_id: foreman_id || null })
    .select("id, name, status, foreman_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
