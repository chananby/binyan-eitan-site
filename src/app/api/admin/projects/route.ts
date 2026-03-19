import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — list all projects (admin view, all statuses)
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status")
    .order("status", { ascending: true })
    .order("name",   { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

// POST — create new project
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; address?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "שם הפרויקט הוא שדה חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name: name.trim(), status: "active" })
    .select("id, name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
