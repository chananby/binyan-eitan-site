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
    if (error) return { id: `schema_${table}_${column}`, section: "schema", name: `${table}.${column}`, status: "fail", detail: error.message, fix: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ...` };
    return { id: `schema_${table}_${column}`, section: "schema", name: `${table}.${column}`, status: "ok", detail: "עמודה קיימת" };
  } catch (e) {
    return { id: `schema_${table}_${column}`, section: "schema", name: `${table}.${column}`, status: "fail", detail: String(e), fix: `הרץ SQL migration לטבלת ${table}` };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkTable(supabase: any, table: string): Promise<CheckResult> {
  try {
    const { error } = await supabase.from(table).select("id").limit(0);
    if (error) return { id: `schema_table_${table}`, section: "schema", name: `טבלה: ${table}`, status: "fail", detail: error.message, fix: `צור את טבלת ${table} בסופאבייס` };
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
  const nowIsrael   = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const todayIsrael = nowIsrael.split(" ")[0]; // "YYYY-MM-DD"
  const hourIsrael  = parseInt(nowIsrael.split(" ")[1]?.split(":")[0] ?? "0", 10);
  const isWorkHours = hourIsrael >= 6 && hourIsrael < 20;
  const today       = new Date().toISOString().split("T")[0]; // UTC, for milestone comparison

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ENVIRONMENT VARIABLES
  // ═══════════════════════════════════════════════════════════════════════════
  const envChecks: Array<{ id: string; name: string; key: string; required: boolean; fix: string }> = [
    { id: "env_supabase_url",     name: "Supabase URL",                   key: "SUPABASE_URL",                      required: true,  fix: "הוסף SUPABASE_URL ב-Vercel ו-.env.local" },
    { id: "env_pub_supabase_url", name: "Supabase URL (Public client)",    key: "NEXT_PUBLIC_SUPABASE_URL",           required: false, fix: "הוסף NEXT_PUBLIC_SUPABASE_URL ב-Vercel" },
    { id: "env_service_key",      name: "Supabase Service Role Key",       key: "SUPABASE_SERVICE_ROLE_KEY",          required: true,  fix: "הוסף SUPABASE_SERVICE_ROLE_KEY ב-Vercel" },
    { id: "env_admin_pw",         name: "Admin Password",                  key: "ADMIN_PASSWORD",                     required: true,  fix: "הוסף ADMIN_PASSWORD ב-Vercel" },
    { id: "env_resend",           name: "Resend API Key (מיילים)",         key: "RESEND_API_KEY",                     required: false, fix: "הוסף RESEND_API_KEY — ללא זה טופס הפנייה לא ישלח מיילים" },
    { id: "env_blob",             name: "Vercel Blob Token (העלאות)",      key: "BLOB_READ_WRITE_TOKEN",              required: false, fix: "הוסף BLOB_READ_WRITE_TOKEN ב-Vercel לתמיכה בהעלאת קבצים" },
    { id: "env_cloudinary_name",  name: "Cloudinary Cloud Name (גלריה)",  key: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",  required: false, fix: "הוסף NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME לגלריית התמונות" },
    { id: "env_cloudinary_key",   name: "Cloudinary API Key",              key: "CLOUDINARY_API_KEY",                 required: false, fix: "הוסף CLOUDINARY_API_KEY ו-CLOUDINARY_API_SECRET" },
    { id: "env_internal_pin",     name: "Internal Staff PIN",              key: "INTERNAL_STAFF_PIN",                 required: false, fix: "הוסף INTERNAL_STAFF_PIN — ללא זה הפורטל הפנימי לא מוגן" },
  ];

  for (const c of envChecks) {
    const val = process.env[c.key];
    results.push({ id: c.id, section: "env", name: c.name, status: val ? "ok" : c.required ? "fail" : "warn", detail: val ? "מוגדר" : "חסר", fix: val ? undefined : c.fix });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DATABASE CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from("projects").select("id").limit(1);
    const ms = Date.now() - dbStart;
    results.push({
      id: "db_connection", section: "db", name: "חיבור לבסיס נתונים",
      status: error ? "fail" : ms > 3000 ? "warn" : "ok",
      detail: error ? error.message : `מחובר (${ms}ms)${ms > 3000 ? " — איטי מהרגיל" : ""}`,
      fix: error ? "בדוק את SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY" : undefined,
    });
  } catch (e) {
    results.push({ id: "db_connection", section: "db", name: "חיבור לבסיס נתונים", status: "fail", detail: String(e), fix: "בדוק את הגדרות הסופאבייס" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SCHEMA — all tables and critical columns (parallel)
  // ═══════════════════════════════════════════════════════════════════════════
  const schemaChecks = await Promise.all([
    // Tables
    checkTable(supabase, "projects"),
    checkTable(supabase, "tasks"),
    checkTable(supabase, "daily_reports"),
    checkTable(supabase, "milestones"),
    checkTable(supabase, "materials"),
    checkTable(supabase, "budget_items"),
    checkTable(supabase, "income"),
    checkTable(supabase, "weekly_plan"),
    checkTable(supabase, "settings"),
    checkTable(supabase, "staff"),
    checkTable(supabase, "attendance"),
    checkTable(supabase, "attendance_logs"),
    checkTable(supabase, "executive_space"),
    checkTable(supabase, "executive_canvas"),

    // projects columns
    checkColumn(supabase, "projects",      "status"),
    checkColumn(supabase, "projects",      "foreman_id"),

    // tasks columns
    checkColumn(supabase, "tasks",         "status"),
    checkColumn(supabase, "tasks",         "material_ready"),
    checkColumn(supabase, "tasks",         "sub_confirmed"),
    checkColumn(supabase, "tasks",         "equipment_on_site"),
    checkColumn(supabase, "tasks",         "delay_reason"),

    // daily_reports columns
    checkColumn(supabase, "daily_reports", "status"),
    checkColumn(supabase, "daily_reports", "subcontractor_count"),

    // staff columns
    checkColumn(supabase, "staff",         "phone"),
    checkColumn(supabase, "staff",         "role"),
    checkColumn(supabase, "staff",         "active"),

    // attendance columns
    checkColumn(supabase, "attendance",    "action"),
    checkColumn(supabase, "attendance",    "lat"),
    checkColumn(supabase, "attendance",    "lng"),
    checkColumn(supabase, "attendance",    "recorded_at"),
    checkColumn(supabase, "attendance",    "staff_id"),

    // executive columns
    checkColumn(supabase, "executive_space", "type"),
    checkColumn(supabase, "executive_space", "author"),
    checkColumn(supabase, "executive_space", "done"),
    checkColumn(supabase, "executive_space", "due_date"),
    checkColumn(supabase, "executive_space", "content"),
    checkColumn(supabase, "executive_space", "priority"),

    // holding tables
    checkTable(supabase,  "holding_companies"),
    checkTable(supabase,  "holding_tasks"),
    checkColumn(supabase, "holding_tasks", "author"),
    checkColumn(supabase, "holding_tasks", "notes"),
    checkColumn(supabase, "holding_tasks", "status"),
    checkColumn(supabase, "holding_tasks", "priority"),
    checkColumn(supabase, "holding_tasks", "company_id"),
    checkColumn(supabase, "holding_companies", "color"),
    checkColumn(supabase, "holding_companies", "icon"),
    checkColumn(supabase, "holding_companies", "sort_order"),
  ]);

  // Enrich holding schema failures with precise SQL fix
  const HOLDING_FIXES: Record<string, string> = {
    "schema_table_holding_companies": `CREATE TABLE holding_companies (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  name text NOT NULL,\n  slug text UNIQUE NOT NULL,\n  color text NOT NULL DEFAULT '#888',\n  icon text NOT NULL DEFAULT '📦',\n  drive_url text,\n  sort_order int DEFAULT 0,\n  created_at timestamptz DEFAULT now()\n);`,
    "schema_table_holding_tasks": `CREATE TABLE holding_tasks (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  company_id uuid REFERENCES holding_companies(id) ON DELETE SET NULL,\n  title text NOT NULL,\n  notes text,\n  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','urgent','in_progress','pending','done')),\n  priority int NOT NULL DEFAULT 0,\n  author text NOT NULL DEFAULT 'Hanan',\n  created_at timestamptz DEFAULT now(),\n  updated_at timestamptz DEFAULT now()\n);`,
    "schema_holding_tasks_author":     `ALTER TABLE holding_tasks ADD COLUMN IF NOT EXISTS author text NOT NULL DEFAULT 'Hanan';`,
    "schema_holding_tasks_notes":      `ALTER TABLE holding_tasks ADD COLUMN IF NOT EXISTS notes text;`,
    "schema_holding_tasks_status":     `ALTER TABLE holding_tasks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'backlog';`,
    "schema_holding_tasks_priority":   `ALTER TABLE holding_tasks ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 0;`,
    "schema_holding_tasks_company_id": `ALTER TABLE holding_tasks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES holding_companies(id) ON DELETE SET NULL;`,
    "schema_holding_companies_color":  `ALTER TABLE holding_companies ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#888';`,
    "schema_holding_companies_icon":   `ALTER TABLE holding_companies ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '📦';`,
    "schema_holding_companies_sort_order": `ALTER TABLE holding_companies ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;`,
  };
  for (const r of schemaChecks) {
    if (r.status === "fail" && HOLDING_FIXES[r.id]) r.fix = HOLDING_FIXES[r.id];
  }

  results.push(...schemaChecks);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SETTINGS KEY-VALUE STORE
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const { data: settRows } = await supabase.from("settings").select("key, value");
    const settMap = Object.fromEntries(
      (settRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
    );

    // maintenance_mode
    const mVal = settMap["maintenance_mode"];
    const maintOn = mVal === "true" || mVal === "1";
    results.push({
      id: "settings_maintenance", section: "settings", name: "מצב תחזוקה",
      status: maintOn ? "warn" : "ok",
      detail: maintOn ? "פעיל — האתר נעול למבקרים!" : mVal !== undefined ? "כבוי" : "לא הוגדר (כבוי כברירת מחדל)",
      fix: maintOn ? "כבה את מצב התחזוקה מ-/admin/health" : undefined,
    });

    // executive PINs
    for (const [key, label, def] of [
      ["executive_pin_hanan", "PIN חנן", "108"],
      ["executive_pin_moti",  "PIN מוטי", "274"],
    ] as const) {
      const exists = settMap[key] !== undefined;
      results.push({
        id: `settings_${key}`, section: "settings", name: label,
        status: exists ? "ok" : "warn",
        detail: exists ? "מוגדר בטבלת settings" : `חסר — ישתמש בברירת מחדל ${def}`,
        fix: exists ? undefined : `INSERT INTO settings (key,value) VALUES ('${key}','${def}') ON CONFLICT (key) DO NOTHING;`,
      });
    }

    // daily message
    const dmVal = settMap["daily_message"];
    results.push({
      id: "settings_daily_msg", section: "settings", name: "הודעה יומית לעובדים",
      status: "ok",
      detail: dmVal ? `מוגדרת: "${dmVal.slice(0, 60)}${dmVal.length > 60 ? "…" : ""}"` : "לא מוגדרת (אופציונלי)",
    });
  } catch {
    results.push({ id: "settings_all", section: "settings", name: "טבלת settings", status: "warn", detail: "לא ניתן לקרוא את הגדרות המערכת" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. DATA INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════

  // Staff counts
  try {
    const [{ count: staffCount }, { count: activeCount }] = await Promise.all([
      supabase.from("staff").select("id", { count: "exact", head: true }),
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    results.push({
      id: "data_staff_count", section: "data", name: "עובדים רשומים",
      status: (staffCount ?? 0) === 0 ? "fail" : (activeCount ?? 0) === 0 ? "warn" : "ok",
      detail: (staffCount ?? 0) === 0
        ? "אין עובדים — מערכת הנוכחות לא תעבוד"
        : `${staffCount} רשומים, ${activeCount} פעילים`,
      fix: (staffCount ?? 0) === 0 ? "הוסף עובדים מממשק הניהול → לשונית עובדים" : undefined,
    });

    // Staff without phone
    const { count: noPhone } = await supabase
      .from("staff").select("id", { count: "exact", head: true }).is("phone", null);
    if ((noPhone ?? 0) > 0) {
      results.push({
        id: "data_staff_no_phone", section: "data", name: "עובדים ללא טלפון",
        status: "warn",
        detail: `${noPhone} עובדים ללא מספר טלפון — לא יוכלו לדווח נוכחות`,
        fix: "עדכן מספרי טלפון: ממשק ניהול → עובדים",
      });
    }
  } catch { /* skip */ }

  // Projects
  try {
    const [{ count: projTotal }, { count: projActive }, { count: noForeman }] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("projects").select("id", { count: "exact", head: true }).is("foreman_id", null).eq("status", "active"),
    ]);
    results.push({
      id: "data_projects", section: "data", name: "פרויקטים",
      status: "ok",
      detail: `${projTotal ?? 0} סה"כ · ${projActive ?? 0} פעילים`,
    });
    if ((noForeman ?? 0) > 0) {
      results.push({
        id: "data_no_foreman", section: "data", name: "פרויקטים ללא מנהל עבודה",
        status: "warn",
        detail: `${noForeman} פרויקטים פעילים ללא מנהל עבודה`,
        fix: "שייך מנהל עבודה מלשונית פרויקטים בממשק הניהול",
      });
    }
  } catch { /* skip */ }

  // Overdue milestones
  try {
    const { count } = await supabase.from("milestones").select("id", { count: "exact", head: true })
      .lt("target_date", today).neq("status", "completed").not("target_date", "is", null);
    results.push({
      id: "data_overdue_milestones", section: "data", name: "אבני דרך שעבר מועדן",
      status: (count ?? 0) > 0 ? "warn" : "ok",
      detail: (count ?? 0) === 0 ? "אין אבני דרך שפג מועדן" : `${count} אבני דרך חלפו ולא הושלמו`,
      fix: (count ?? 0) > 0 ? "עדכן מועד יעד או סיים את אבני הדרך" : undefined,
    });
  } catch { /* skip */ }

  // Delayed tasks
  try {
    const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "delayed");
    results.push({
      id: "data_delayed_tasks", section: "data", name: "משימות מעוכבות",
      status: (count ?? 0) > 0 ? "warn" : "ok",
      detail: (count ?? 0) === 0 ? "אין משימות מעוכבות" : `${count} משימות בסטטוס עיכוב`,
    });
  } catch { /* skip */ }

  // Attendance today — read from `attendance` table (same as /api/admin/attendance/today)
  try {
    const todayStartUTC = todayIsrael + "T00:00:00.000Z"; // midnight UTC ~ midnight Israel (close enough)
    const { count: attCount, error: attErr } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .gte("recorded_at", todayStartUTC);

    if (attErr) {
      results.push({
        id: "data_attendance_today", section: "data", name: `נוכחות היום (${todayIsrael})`,
        status: "fail",
        detail: `שגיאה בשאילתת נוכחות: ${attErr.message}`,
        fix: "ודא שהעמודה recorded_at קיימת בטבלת attendance",
      });
    } else {
      const noLogs = (attCount ?? 0) === 0;
      results.push({
        id: "data_attendance_today", section: "data", name: `נוכחות היום (${todayIsrael})`,
        status: noLogs && isWorkHours ? "warn" : "ok",
        detail: noLogs
          ? isWorkHours ? "אפס דיווחים בשעות עבודה — ייתכן תקלה" : "אפס דיווחים (מחוץ לשעות עבודה — תקין)"
          : `${attCount} דיווחים היום`,
        fix: noLogs && isWorkHours ? "בדוק /attendance ושה-GPS פועל" : undefined,
      });
    }
  } catch { /* skip */ }

  // Executive items (sanity)
  try {
    const { count: execCount } = await supabase
      .from("executive_space").select("id", { count: "exact", head: true });
    results.push({
      id: "data_executive_items", section: "data", name: "War Room — פריטים",
      status: "ok",
      detail: `${execCount ?? 0} פריטים ב-Executive Space`,
    });
  } catch { /* skip */ }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. EXTERNAL SERVICES
  // ═══════════════════════════════════════════════════════════════════════════

  // Resend key format
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    results.push({
      id: "service_resend", section: "services", name: "Resend (שליחת מיילים)",
      status: resendKey.startsWith("re_") ? "ok" : "warn",
      detail: resendKey.startsWith("re_") ? "מפתח API תקין (re_...)" : "פורמט לא ידוע — ציפינו ל-re_...",
      fix: resendKey.startsWith("re_") ? undefined : "ודא ש-RESEND_API_KEY מתחיל ב-re_",
    });
  } else {
    results.push({ id: "service_resend", section: "services", name: "Resend (שליחת מיילים)", status: "warn", detail: "מפתח חסר — טופס פנייה לא ישלח מיילים", fix: "הוסף RESEND_API_KEY" });
  }

  // Cloudinary
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudKey  = process.env.CLOUDINARY_API_KEY;
  results.push({
    id: "service_cloudinary", section: "services", name: "Cloudinary (גלריה)",
    status: !cloudName ? "warn" : !cloudKey ? "warn" : "ok",
    detail: !cloudName ? "Cloud Name חסר — גלריה לא תטען" : !cloudKey ? "API Key חסר — ניהול תמונות מוגבל" : "מוגדר מלא",
    fix: !cloudName ? "הגדר NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" : !cloudKey ? "הגדר CLOUDINARY_API_KEY ו-CLOUDINARY_API_SECRET" : undefined,
  });

  // Vercel Blob
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  results.push({
    id: "service_blob", section: "services", name: "Vercel Blob (העלאות)",
    status: blobToken ? "ok" : "warn",
    detail: blobToken ? "מוגדר" : "חסר — העלאת קבצים לא תעבוד",
    fix: blobToken ? undefined : "הגדר BLOB_READ_WRITE_TOKEN ב-Vercel",
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. POLICY / SECURITY CHECKS (live HTTP probes)
  // ═══════════════════════════════════════════════════════════════════════════
  const host  = req.headers.get("host") ?? "localhost:3000";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";

  // GPS enforcement — no lat/lng must return 400
  try {
    const r = await fetch(`${proto}://${host}/api/attendance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "0000000000", action: "in" }),
    });
    const ok = r.status === 400;
    let detail = ok ? "בקשות ללא GPS מחזירות 400 Bad Request" : `ציפינו ל-400, קיבלנו ${r.status}`;
    if (ok) { const d = await r.json().catch(() => ({})); if (d.error) detail += ` — "${d.error}"`; }
    results.push({ id: "policy_gps_required", section: "policy", name: "אכיפת GPS חובה", status: ok ? "ok" : "fail", detail, fix: ok ? undefined : "ודא ש-/api/attendance מחייב lat ו-lng ומחזיר 400" });
  } catch (e) {
    results.push({ id: "policy_gps_required", section: "policy", name: "אכיפת GPS חובה", status: "warn", detail: `לא ניתן לבדוק: ${String(e)}` });
  }

  // Admin auth — wrong password must return 401
  try {
    const r = await fetch(`${proto}://${host}/api/admin-auth`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: `__hc_${Date.now()}__` }),
    });
    const ok = r.status === 401;
    results.push({
      id: "policy_admin_auth", section: "policy", name: "הגנת ממשק ניהול",
      status: ok ? "ok" : "fail",
      detail: ok ? "סיסמה שגויה מחזירה 401 Unauthorized" : `ציפינו ל-401, קיבלנו ${r.status} — הממשק לא מוגן!`,
      fix: ok ? undefined : "בדוק את לוגיקת האימות ב-/api/admin-auth",
    });
  } catch (e) {
    results.push({ id: "policy_admin_auth", section: "policy", name: "הגנת ממשק ניהול", status: "warn", detail: `לא ניתן לבדוק: ${String(e)}` });
  }

  // Executive auth — wrong PIN must return 401
  try {
    const r = await fetch(`${proto}://${host}/api/executive/auth`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "00000" }),
    });
    const ok = r.status === 401;
    results.push({
      id: "policy_exec_auth", section: "policy", name: "הגנת War Room (PIN)",
      status: ok ? "ok" : "fail",
      detail: ok ? "PIN שגוי מחזיר 401 Unauthorized" : `ציפינו ל-401, קיבלנו ${r.status} — War Room לא מוגן!`,
      fix: ok ? undefined : "בדוק את /api/executive/auth",
    });
  } catch (e) {
    results.push({ id: "policy_exec_auth", section: "policy", name: "הגנת War Room (PIN)", status: "warn", detail: `לא ניתן לבדוק: ${String(e)}` });
  }

  // Maintenance mode not stuck on
  try {
    const { data: mRows } = await supabase.from("settings").select("value").eq("key", "maintenance_mode").limit(1);
    const mVal = mRows?.[0]?.value;
    if (mVal === "true" || mVal === "1") {
      results.push({
        id: "policy_no_maintenance", section: "policy", name: "מצב תחזוקה לא תקוע",
        status: "warn", detail: "האתר במצב תחזוקה — מבקרים רואים דף תחזוקה",
        fix: "כבה את מצב התחזוקה מ-/admin/health",
      });
    }
  } catch { /* skip */ }

  return NextResponse.json({ results, checkedAt: new Date().toISOString() });
}
