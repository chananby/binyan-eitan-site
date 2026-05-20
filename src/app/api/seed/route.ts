import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";

export const runtime = "nodejs";

// One-time seed endpoint — inserts the master admin if they don't already exist.
// Protected by SEED_SECRET env var.  Call once, then remove or disable the route.
//
//   POST /api/seed
//   Headers: { "x-seed-secret": "<SEED_SECRET>" }
//
// Returns:
//   { ok: true,  created: true,  staff }  — inserted
//   { ok: true,  created: false, staff }  — already existed (idempotent)
//   { ok: false, error: "..." }           — error

const MASTER_ADMIN = {
  phone: "0585008447",
  name: "חנן בן ישי",
  role: "מנהל",
  active: true,
};

export async function POST(req: NextRequest) {
  // ── Auth: require SEED_SECRET header ──────────────────────────────────────
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "SEED_SECRET env var is not set" },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-seed-secret");
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Supabase not configured" },
      { status: 500 }
    );
  }

  const normalizedPhone = MASTER_ADMIN.phone.replace(/\D/g, "").slice(-10);

  // ── Check if already exists ────────────────────────────────────────────────
  const { data: existing, error: lookupError } = await supabase
    .from("staff")
    .select("id, name, phone, role, active")
    .eq("phone", normalizedPhone)
    .is("deleted_at", null)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ ok: true, created: false, staff: existing });
  }

  // ── Insert ─────────────────────────────────────────────────────────────────
  const { data: created, error: insertError } = await supabase
    .from("staff")
    .insert({ ...MASTER_ADMIN, phone: normalizedPhone })
    .select("id, name, phone, role, active")
    .single();

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true, staff: created });
}
