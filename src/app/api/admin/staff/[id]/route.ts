import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// PATCH — toggle active status (deactivate / reactivate)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active field (boolean) is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .update({ active: body.active })
    .eq("id", params.id)
    .select("id, name, phone, role, active")
    .single();

  if (error) {
    console.error("[admin/staff PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ staff: data });
}

// DELETE — hard delete (only if no attendance records linked)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check for linked attendance records first
  const { count } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("staff_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `לא ניתן למחוק — קיימות ${count} רשומות נוכחות. השתמש בהשבתה במקום.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("[admin/staff DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
