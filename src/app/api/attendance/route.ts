import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";

export const runtime = "nodejs";

// Normalize phone to standard Israeli 10-digit format (leading 0).
// "058-500-8447"   → "0585008447"
// "+972585008447"  → "0585008447"  (strip 972 country prefix)
// "972585008447"   → "0585008447"
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Convert international format: 972XXXXXXXXX → 0XXXXXXXXX
  if (digits.startsWith("972") && digits.length >= 12) {
    return "0" + digits.slice(3);
  }
  return digits.slice(-10);
}

// Return all plausible formats a phone might be stored as in the DB.
// Covers: with leading 0, without leading 0, with 972 prefix.
function phoneVariants(normalized: string): string[] {
  const v = new Set<string>();
  v.add(normalized);                              // "0501234567"
  if (normalized.startsWith("0")) {
    v.add(normalized.slice(1));                   // "501234567"
    v.add("972" + normalized.slice(1));           // "972501234567"
    v.add("+972" + normalized.slice(1));          // "+972501234567"
  }
  return [...v];
}

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
      .select("*", { count: "exact", head: true });

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
      console.info("[attendance] auto-registered first staff member:", normalizedPhone);
    } else {
      return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 404 });
    }
  }

  // Treat missing `active` column gracefully — if null/undefined, assume active
  const isActive = resolvedStaff!.active ?? true;
  if (!isActive) {
    return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 403 });
  }

  // ── 2. Insert attendance record ────────────────────────────────────────────
  // IMPORTANT: column names must match your actual Supabase `attendance` table.
  // Common mismatch: `timestamp_label` — your table might not have this column.
  // If you see an error here, remove the timestamp_label field or rename it.
  const normalizedAction = action === "כניסה" ? "in" : action === "יציאה" ? "out" : action;
  if (!["in", "out"].includes(normalizedAction)) {
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  }

  const attendancePayload: Record<string, unknown> = {
    staff_id: resolvedStaff!.id,
    action:   normalizedAction,
    lat,
    lng,
  };

  if (timestamp)  attendancePayload.timestamp_label = timestamp;
  if (project_id) attendancePayload.project_id = project_id;

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
