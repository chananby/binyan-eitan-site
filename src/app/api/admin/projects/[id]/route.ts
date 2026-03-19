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
  let body: { status?: string; name?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update(body)
    .eq("id", params.id)
    .select("id, name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
