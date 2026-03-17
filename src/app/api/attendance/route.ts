import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";

export const runtime = "nodejs";

// Normalize phone: strip everything except digits, keep last 10 digits.
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

export async function POST(req: NextRequest) {
  let body: { phone?: string; action?: string; lat?: string; lng?: string; timestamp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, action, lat, lng, timestamp } = body;
  if (!phone || !action || !lat || !lng) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Supabase not configured";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  const normalizedPhone = normalizePhone(phone);

  // ── 1. Look up staff by phone ──────────────────────────────────────────────
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, name, active")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (staffError) {
    console.error("[attendance] staff lookup error:", staffError.message);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }

  // ── 1b. Auto-register first user if staff table is empty ───────────────────
  let resolvedStaff = staff;

  if (!staff) {
    // Check if table is completely empty
    const { count, error: countError } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: true });

    if (!countError && count === 0) {
      // First ever registration — create as Master Admin
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

      if (insertStaffError || !newStaff) {
        console.error("[attendance] auto-register error:", insertStaffError?.message);
        return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 404 });
      }

      resolvedStaff = newStaff;
      console.info("[attendance] auto-registered first staff member:", normalizedPhone);
    } else {
      return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 404 });
    }
  }

  if (!resolvedStaff!.active) {
    return NextResponse.json({ success: false, error: "phone_not_found" }, { status: 403 });
  }

  // ── 2. Insert attendance record ────────────────────────────────────────────
  const { error: insertError } = await supabase.from("attendance").insert({
    staff_id: resolvedStaff!.id,
    action: action === "כניסה" ? "in" : "out",
    lat,
    lng,
    timestamp_label: timestamp ?? null,
  });

  if (insertError) {
    console.error("[attendance] insert error:", insertError.message);
    return NextResponse.json({ success: false, error: "Failed to record attendance" }, { status: 500 });
  }

  // ── 3. Fetch today's daily message (optional) ──────────────────────────────
  let dailyMessage: string | null = null;
  try {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
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

  return NextResponse.json({
    success: true,
    name: resolvedStaff!.name,
    message: dailyMessage,
  });
}
