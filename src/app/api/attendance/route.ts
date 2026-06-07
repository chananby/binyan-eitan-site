import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";
import { normalizePhone, phoneVariants } from "../../../lib/phone";
import { israelDayStartISO } from "../../../lib/israel-time";

export const runtime = "nodejs";

// Log the full Supabase error — code + message + details + hint all matter.
function logSupabaseError(context: string, err: { code?: string; message?: string; details?: string; hint?: string } | null) {
  if (!err) return;
  console.error(`[attendance] ${context}:`, JSON.stringify({
    code:    err.code,
    message: err.message,
    details: err.details,
    hint:    err.hint,
  }));
}

export async function POST(req: NextRequest) {
  // ── Same-origin guard ──────────────────────────────────────────────────────
  // Blocks browser-originated cross-origin abuse (CSRF). Workers always submit
  // from the /attendance page, which is same-origin, so this is invisible to
  // legitimate use. Non-browser scripts that omit Origin still hit the existing
  // GPS / phone-validity checks below.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  }

  let body: { phone?: string; action?: string; lat?: string; lng?: string; timestamp?: string; project_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, action, lat, lng, timestamp, project_id } = body;
  if (!phone || !action) {
    return NextResponse.json({ success: false, error: "Missing required fields: phone, action" }, { status: 400 });
  }
  if (!lat || !lng) {
    return NextResponse.json({ success: false, error: "Location required" }, { status: 400 });
  }

  // ── Init Supabase ──────────────────────────────────────────────────────────
  // Accepts SUPABASE_URL *or* NEXT_PUBLIC_SUPABASE_URL (whichever is set in Vercel)
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
      !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean).join(", ");
    console.error("[attendance] Missing env vars:", missing);
    return NextResponse.json(
      { success: false, error: `Missing env vars: ${missing}` },
      { status: 500 }
    );
  }

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Supabase client init failed";
    console.error("[attendance] createServerClient threw:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  const normalizedPhone = normalizePhone(phone);
  const variants        = phoneVariants(normalizedPhone);
  console.info("[attendance] lookup phone:", normalizedPhone, "variants:", variants, "action:", action);

  // ── 1. Look up staff by phone ──────────────────────────────────────────────
  // Use .in() across all phone format variants so the lookup succeeds
  // regardless of how the number was stored (with/without leading 0, with 972).
  const { data: staffRows, error: staffError } = await supabase
    .from("staff")
    .select("id, name, active")
    .in("phone", variants)
    .is("deleted_at", null)
    .limit(1);

  const staff = staffRows?.[0] ?? null;

  if (staffError) {
    logSupabaseError("staff lookup", staffError);
    // Return the real DB error so you can see it in the UI / Vercel logs
    return NextResponse.json(
      { success: false, error: `staff_lookup_failed: ${staffError.message}` },
      { status: 500 }
    );
  }

  // ── 1b. Auto-register first user if staff table is empty ───────────────────
  let resolvedStaff = staff;
  let autoRegistered = false;

  if (!staff) {
    const { count, error: countError } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    if (countError) {
      logSupabaseError("staff count", countError);
      return NextResponse.json(
        { success: false, error: `staff_count_failed: ${countError.message}` },
        { status: 500 }
      );
    }

    console.info("[attendance] staff table count:", count);

    if (count === 0) {
      // First ever registration — auto-create as Master Admin
      const { data: newStaff, error: insertStaffError } = await supabase
        .from("staff")
        .insert({
          phone: normalizedPhone,
          name: "מנהל ראשי",
          role: "מנהל",
          active: true,
        })
        .select("id, name, active")
        .single();

      if (insertStaffError) {
        logSupabaseError("staff auto-register insert", insertStaffError);
        // 23505 = unique_violation — phone already exists despite count=0 (race condition)
        if (insertStaffError.code === "23505") {
          console.warn("[attendance] UNIQUE race condition on phone:", normalizedPhone);
          return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 404 });
        }
        return NextResponse.json(
          { success: false, error: `auto_register_failed: ${insertStaffError.message}` },
          { status: 500 }
        );
      }

      if (!newStaff) {
        return NextResponse.json({ success: false, error: "auto_register_no_data" }, { status: 500 });
      }

      resolvedStaff = newStaff;
      autoRegistered = true;
      console.warn("[attendance] AUTO-REGISTERED first staff member as admin:", normalizedPhone, "— verify this was intentional");
    } else {
      return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 404 });
    }
  }

  // Treat missing `active` column gracefully — if null/undefined, assume active
  const isActive = resolvedStaff!.active ?? true;
  if (!isActive) {
    return NextResponse.json({ success: false, error: "account_inactive" }, { status: 403 });
  }

  // ── 2. Normalize action + duplicate clock-in guard ────────────────────────
  const normalizedAction = action === "כניסה" ? "in" : action === "יציאה" ? "out" : action;
  if (!["in", "out"].includes(normalizedAction)) {
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  }

  if (normalizedAction === "in") {
    const todayStr   = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const todayStart = israelDayStartISO(todayStr);
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .is("deleted_at", null)
      .eq("staff_id", resolvedStaff!.id)
      .eq("action", "in")
      .gte("created_at", todayStart)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, error: "already_clocked_in" }, { status: 409 });
    }
  }

  const attendancePayload: Record<string, unknown> = {
    staff_id: resolvedStaff!.id,
    action:   normalizedAction,
    lat,
    lng,
  };

  if (timestamp)  attendancePayload.timestamp_label = timestamp;
  if (project_id) attendancePayload.project_id = project_id;
  attendancePayload.clock_at = new Date().toISOString();

  // ── Distance from project (for GPS anti-fraud flagging) ────────────────────
  // Best-effort: look up the project's lat/lng and compute Haversine distance.
  // Stored on the row at submission time so admin views can show flags
  // without re-querying or recomputing.
  if (project_id) {
    try {
      const { data: proj } = await supabase
        .from("projects")
        .select("lat, lng")
        .eq("id", project_id)
        .maybeSingle();
      if (proj?.lat != null && proj?.lng != null) {
        const { haversineMeters } = await import("../../../lib/distance");
        const dist = haversineMeters(
          Number(lat), Number(lng),
          Number(proj.lat), Number(proj.lng),
        );
        if (isFinite(dist)) {
          attendancePayload.distance_from_project_m = Math.round(dist);
        }
      }
    } catch (e) {
      console.warn("[attendance] distance calc failed:", e instanceof Error ? e.message : String(e));
    }
  }

  const { error: insertError } = await supabase
    .from("attendance")
    .insert(attendancePayload);

  if (insertError) {
    logSupabaseError("attendance insert", insertError);
    return NextResponse.json(
      { success: false, error: `attendance_insert_failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  // ── 3. Daily message (optional, non-blocking) ──────────────────────────────
  let dailyMessage: string | null = null;
  try {
    // Use Israel timezone for date — avoids UTC/midnight mismatch (IL is UTC+2/+3)
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const [{ data: msg }, { data: msgDate }] = await Promise.all([
      supabase.from("settings").select("value").eq("key", "daily_message").maybeSingle(),
      supabase.from("settings").select("value").eq("key", "daily_message_date").maybeSingle(),
    ]);
    if (msg?.value && msgDate?.value === today) {
      dailyMessage = msg.value;
    }
  } catch {
    // Non-critical — don't fail the whole request
  }

  console.info("[attendance] success — staff:", resolvedStaff!.name, "auto_registered:", autoRegistered);

  return NextResponse.json({
    success: true,
    name: resolvedStaff!.name,
    message: dailyMessage,
    auto_registered: autoRegistered,
  });
}
