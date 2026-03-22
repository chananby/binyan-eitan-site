import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export type CheckStatus = "ok" | "fail" | "warn";
export interface CheckResult {
  id: string;
  section: string;
  name: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkColumn(supabase: any, table: string, column: string): Promise<CheckResult> {
  try {
    const { error } = await supabase.from(table).select(column).limit(0);
    if (error) {
      return {
        id: `schema_${table}_${column}`,
        section: "schema",
        name: `${table}.${column}`,
        status: "fail",
        detail: error.message,
        fix: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ...`,
      };
    }
    return { id: `schema_${table}_${column}`, section: "schema", name: `${table}.${column}`, status: "ok", detail: "עמודה קיימת" };
  } catch (e) {
    return { id: `schema_${table}_${column}`, section: "schema", name: `${table}.${column}`, status: "fail", detail: String(e), fix: `הרץ SQL migration לטבלת ${table}` };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkTable(supabase: any, table: string): Promise<CheckResult> {
  try {
    const { error } = await supabase.from(table).select("id").limit(0);
    if (error) {
      return { id: `schema_table_${table}`, section: "schema", name: `טבלה: ${table}`, status: "fail", detail: error.message, fix: `צור את טבלת ${table} בסופאבייס` };
    }
    return { id: `schema_table_${table}`, section: "schema", name: `טבלה: ${table}`, status: "ok", detail: "טבלה קיימת" };
  } catch (e) {
    return { id: `schema_table_${table}`, section: "schema", name: `טבלה: ${table}`, status: "fail", detail: String(e) };
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const results: CheckResult[] = [];
  const today = new Date().toISOString().split("T")[0];

  // ── Environment ────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPw     = process.env.ADMIN_PASSWORD;

  results.push({ id: "env_supabase_url", section: "env", name: "Supabase URL",          status: supabaseUrl ? "ok" : "fail", detail: supabaseUrl ? "מוגדר" : "חסר", fix: supabaseUrl ? undefined : "הוסף SUPABASE_URL למשתני הסביבה ב-Vercel ו-.env.local" });
  results.push({ id: "env_service_key",  section: "env", name: "Supabase Service Key",   status: serviceKey  ? "ok" : "fail", detail: serviceKey  ? "מוגדר" : "חסר", fix: serviceKey  ? undefined : "הוסף SUPABASE_SERVICE_ROLE_KEY למשתני הסביבה ב-Vercel" });
  results.push({ id: "env_admin_pw",     section: "env", name: "Admin Password",         status: adminPw     ? "ok" : "fail", detail: adminPw     ? "מוגדר" : "חסר", fix: adminPw     ? undefined : "הוסף ADMIN_PASSWORD למשתני הסביבה ב-Vercel" });

  // ── DB connection ──────────────────────────────────────────────────────────
  try {
    const { error } = await supabase.from("projects").select("id").limit(1);
    results.push({
      id: "db_connection", section: "db",
      name: "חיבור לבסיס נתונים",
      status: error ? "fail" : "ok",
      detail: error ? error.message : "מחובר בהצלחה",
      fix: error ? "בדוק את SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY" : undefined,
    });
  } catch (e) {
    results.push({ id: "db_connection", section: "db", name: "חיבור לבסיס נתונים", status: "fail", detail: String(e), fix: "בדוק את הגדרות הסופאבייס" });
  }

  // ── Schema: core tables ────────────────────────────────────────────────────
  results.push(await checkTable (supabase, "milestones"));
  results.push(await checkColumn(supabase, "projects",      "foreman_id"));
  results.push(await checkColumn(supabase, "tasks",         "material_ready"));
  results.push(await checkColumn(supabase, "tasks",         "sub_confirmed"));
  results.push(await checkColumn(supabase, "tasks",         "equipment_on_site"));
  results.push(await checkColumn(supabase, "tasks",         "delay_reason"));
  results.push(await checkColumn(supabase, "daily_reports", "status"));
  results.push(await checkColumn(supabase, "daily_reports", "subcontractor_count"));

  // ── Schema: executive tables ───────────────────────────────────────────────
  results.push(await checkTable (supabase, "executive_space"));
  results.push(await checkTable (supabase, "executive_canvas"));
  results.push(await checkColumn(supabase, "executive_space", "type"));
  results.push(await checkColumn(supabase, "executive_space", "author"));
  results.push(await checkColumn(supabase, "executive_space", "done"));
  results.push(await checkColumn(supabase, "executive_space", "due_date"));

  // ── Schema: settings keys ──────────────────────────────────────────────────
  try {
    const { data: pinRows } = await supabase
      .from("settings")
      .select("key")
      .in("key", ["executive_pin_hanan", "executive_pin_moti"]);
    const keys = (pinRows ?? []).map((r: { key: string }) => r.key);
    const hananOk = keys.includes("executive_pin_hanan");
    const motiOk  = keys.includes("executive_pin_moti");
    results.push({
      id: "settings_exec_pin_hanan", section: "settings",
      name: "PIN חנן (executive_pin_hanan)",
      status: hananOk ? "ok" : "warn",
      detail: hananOk ? "מוגדר בטבלת settings" : "חסר — ישתמש בברירת מחדל 108",
      fix: hananOk ? undefined : "INSERT INTO settings (key,value) VALUES ('executive_pin_hanan','108') ON CONFLICT (key) DO NOTHING;",
    });
    results.push({
      id: "settings_exec_pin_moti", section: "settings",
      name: "PIN מוטי (executive_pin_moti)",
      status: motiOk ? "ok" : "warn",
      detail: motiOk ? "מוגדר בטבלת settings" : "חסר — ישתמש בברירת מחדל 274",
      fix: motiOk ? undefined : "INSERT INTO settings (key,value) VALUES ('executive_pin_moti','274') ON CONFLICT (key) DO NOTHING;",
    });
  } catch {
    results.push({ id: "settings_exec_pins", section: "settings", name: "PIN מנהלים", status: "warn", detail: "לא ניתן לבדוק — טבלת settings אולי לא קיימת" });
  }

  // ── Data integrity ─────────────────────────────────────────────────────────
  try {
    const { count } = await supabase.from("projects").select("id", { count: "exact", head: true }).is("foreman_id", null).eq("status", "active");
    results.push({
      id: "data_no_foreman", section: "data",
      name: "פרויקטים ללא מנהל עבודה",
      status: (count ?? 0) > 0 ? "warn" : "ok",
      detail: (count ?? 0) === 0 ? "כל הפרויקטים משוייכים" : `${count} פרויקטים פעילים ללא מנהל עבודה`,
      fix: (count ?? 0) > 0 ? "שייך מנהל עבודה מלשונית פרויקטים בממשק הניהול" : undefined,
    });
  } catch { /* schema might not exist yet */ }

  try {
    const { count } = await supabase.from("milestones").select("id", { count: "exact", head: true }).lt("target_date", today).neq("status", "completed").not("target_date", "is", null);
    results.push({
      id: "data_overdue_milestones", section: "data",
      name: "אבני דרך שעבר מועדן",
      status: (count ?? 0) > 0 ? "warn" : "ok",
      detail: (count ?? 0) === 0 ? "אין אבני דרך שפג מועדן" : `${count} אבני דרך חלפו ולא הושלמו`,
      fix: (count ?? 0) > 0 ? "עדכן מועד יעד או סיים את אבני הדרך מלשונית התכנון" : undefined,
    });
  } catch { /* skip */ }

  try {
    const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "delayed");
    results.push({
      id: "data_delayed_tasks", section: "data",
      name: "משימות מעוכבות",
      status: (count ?? 0) > 0 ? "warn" : "ok",
      detail: (count ?? 0) === 0 ? "אין משימות מעוכבות" : `${count} משימות בסטטוס עיכוב`,
    });
  } catch { /* skip */ }

  // ── Attendance today ───────────────────────────────────────────────────────
  try {
    const nowIsrael = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const todayIsrael = nowIsrael.split(" ")[0]; // "YYYY-MM-DD"
    const hourIsrael = parseInt(nowIsrael.split(" ")[1]?.split(":")[0] ?? "0", 10);
    const isWorkHours = hourIsrael >= 6 && hourIsrael < 20;

    const { count: attCount } = await supabase
      .from("attendance_logs")
      .select("id", { count: "exact", head: true })
      .eq("date", todayIsrael);

    const noLogs = (attCount ?? 0) === 0;
    results.push({
      id: "data_attendance_today", section: "data",
      name: `דיווחי נוכחות היום (${todayIsrael})`,
      status: noLogs && isWorkHours ? "warn" : "ok",
      detail: noLogs
        ? isWorkHours ? "אפס דיווחים היום בשעות עבודה — ייתכן שעובדים לא מצליחים להתחבר" : "אפס דיווחים (מחוץ לשעות עבודה — תקין)"
        : `${attCount} דיווחים היום`,
      fix: noLogs && isWorkHours ? "בדוק שהעובדים מצליחים להתחבר ל-/attendance ושה-GPS פועל" : undefined,
    });
  } catch { /* skip */ }

  // ── Policy checks ──────────────────────────────────────────────────────────
  // Verify GPS enforcement: POST to attendance without lat/lng must return 400
  try {
    const host = req.headers.get("host") ?? "localhost:3000";
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    const res = await fetch(`${proto}://${host}/api/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "0000000000", action: "in" }), // no lat/lng
    });
    const gpsEnforced = res.status === 400;
    let detail = gpsEnforced ? "בקשות ללא GPS מוחזרות עם 400 Bad Request" : `ציפינו ל-400, קיבלנו ${res.status}`;
    if (gpsEnforced) {
      const data = await res.json().catch(() => ({}));
      if (data.error) detail += ` — "${data.error}"`;
    }
    results.push({
      id: "policy_gps_required", section: "policy",
      name: "אכיפת GPS חובה",
      status: gpsEnforced ? "ok" : "fail",
      detail,
      fix: gpsEnforced ? undefined : "ודא ש-/api/attendance מחייב lat ו-lng ומחזיר 400 כשהם חסרים",
    });
  } catch (e) {
    results.push({ id: "policy_gps_required", section: "policy", name: "אכיפת GPS חובה", status: "warn", detail: `לא ניתן לבדוק: ${String(e)}` });
  }

  return NextResponse.json({ results, checkedAt: new Date().toISOString() });
}
