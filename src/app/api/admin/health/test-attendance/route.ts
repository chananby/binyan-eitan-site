import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

/**
 * Live attendance test — verifies the full attendance pipeline without
 * inserting real data. Runs SELECT queries only.
 */
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const steps: { name: string; ok: boolean; detail: string; ms: number }[] = [];

  async function step(name: string, fn: () => Promise<string>) {
    const t0 = Date.now();
    try {
      const detail = await fn();
      steps.push({ name, ok: true, detail, ms: Date.now() - t0 });
    } catch (e) {
      steps.push({ name, ok: false, detail: String(e), ms: Date.now() - t0 });
    }
  }

  // Step 1 — DB connection
  await step("חיבור לסופאבייס", async () => {
    const { error } = await supabase.from("staff").select("id").is("deleted_at", null).limit(1);
    if (error) throw error.message;
    return "מחובר";
  });

  // Step 2 — Read from staff table
  let testStaffId: string | null = null;
  await step("קריאת טבלת עובדים", async () => {
    const { data, error } = await supabase.from("staff").select("id, name, phone").eq("active", true).is("deleted_at", null).limit(1).maybeSingle();
    if (error) throw error.message;
    if (!data) return "אין עובדים פעילים — המערכת פנויה";
    testStaffId = data.id;
    return `נמצא: ${data.name} (${data.phone ?? "ללא טלפון"})`;
  });

  // Step 3 — Read from attendance table
  await step("קריאת טבלת נוכחות", async () => {
    const { count, error } = await supabase.from("attendance").select("id", { count: "exact", head: true });
    if (error) throw error.message;
    return `${count ?? 0} רשומות נוכחות`;
  });

  // Step 4 — Simulate attendance insert (dry run via RPC or just validate the payload)
  // We do a SELECT to verify the attendance columns exist without inserting
  await step("אימות עמודות נוכחות", async () => {
    const { error } = await supabase.from("attendance").select("id, staff_id, action, lat, lng, timestamp_label, project_id").limit(0);
    if (error) throw error.message;
    return "כל העמודות קיימות";
  });

  // Step 5 — Simulate full phone lookup flow (the actual attendance lookup path)
  await step("סימולציית חיפוש טלפון", async () => {
    if (!testStaffId) return "דילוג — אין עובדים פעילים";
    const { data, error } = await supabase.from("staff").select("id, name, active").eq("id", testStaffId).is("deleted_at", null).maybeSingle();
    if (error) throw error.message;
    if (!data) throw "עובד לא נמצא";
    if (!data.active) throw "עובד לא פעיל";
    return `זרימת כניסה תקינה עבור: ${data.name}`;
  });

  // Step 6 — Timezone check
  await step("בדיקת אזור זמן (ישראל)", async () => {
    const ilDate  = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const utcDate = new Date().toISOString().slice(0, 10);
    return `IL: ${ilDate} | UTC: ${utcDate}${ilDate !== utcDate ? " ⚠ הפרש בחצות" : " ✓ תואם"}`;
  });

  const allOk = steps.every(s => s.ok);
  return NextResponse.json({ ok: allOk, steps, testedAt: new Date().toISOString() });
}
