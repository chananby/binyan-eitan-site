import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// PATCH — update project (status toggle or rename)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { status?: string; name?: string; foreman_id?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow updating known fields
  const update: Record<string, unknown> = {};
  if (body.status     !== undefined) update.status     = body.status;
  if (body.name       !== undefined) update.name       = body.name?.trim() || null;
  if (body.foreman_id !== undefined) update.foreman_id = body.foreman_id || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", params.id)
    .select("id, name, status, foreman_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
