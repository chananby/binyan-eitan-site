/**
 * /api/admin/vendors/[id] — PATCH a single vendor.
 *
 * Currently the only field the UI edits post-creation is `staff_id` —
 * links the vendor to one of our own workers so the salary-doc
 * auto-split (attendance × project) knows whose attendance to read.
 * Other columns (name/tax_id/notes) still flow through creation and
 * inline edits in the review form; nothing forbids adding them here
 * later — the endpoint just accepts what it's asked.
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

interface PatchBody {
  staff_id?: string | null;
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id?.trim()) return NextResponse.json({ error: "id נדרש" }, { status: 400 });

  let body: PatchBody;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Build the update payload from ONLY the fields present in the body.
  // Explicit null clears the link ("this vendor is not one of our workers").
  const patch: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(body, "staff_id")) {
    const s = body.staff_id;
    if (s !== null && (typeof s !== "string" || !s.trim())) {
      return NextResponse.json({ error: "staff_id חייב להיות מזהה או null" }, { status: 400 });
    }
    patch.staff_id = s === null ? null : s.trim();
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכן" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Sanity-check the staff row exists when linking — Postgres will reject
  // on FK either way, but the friendlier error beats "foreign key violation"
  // surfacing in the UI.
  if (typeof patch.staff_id === "string") {
    const { data: staff, error: sErr } = await supabase
      .from("staff")
      .select("id")
      .eq("id", patch.staff_id as string)
      .is("deleted_at", null)
      .maybeSingle();
    if (sErr) {
      console.error("[admin/vendors PATCH staff check]", JSON.stringify(sErr));
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }
    if (!staff) return NextResponse.json({ error: "עובד לא נמצא" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id, name, tax_id, notes, created_at, staff_id")
    .maybeSingle();

  if (error) {
    console.error("[admin/vendors PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });

  return NextResponse.json({ vendor: row });
}
