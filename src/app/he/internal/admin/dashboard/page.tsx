import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthed } from "../../../../../lib/admin-auth";
import { ChevronLeft, Users, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "דשבורד ניהולי",
  robots: { index: false, follow: false },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function getWeeklyAttendance() {
  try {
    const supabase = createServerClient();
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("attendance")
      .select("id, action, timestamp_label, recorded_at, staff:staff_id(name, phone)")
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: false });

    if (error) return { records: [], error: error.message };
    return { records: data ?? [], error: null };
  } catch (err) {
    return { records: [], error: err instanceof Error ? err.message : "Unknown" };
  }
}

async function getBudgetSummary() {
  try {
    const supabase = createServerClient();

    const { data: items, error } = await supabase
      .from("budget_items")
      .select("project_id, estimated_cost, actual_cost, projects:project_id(name)");

    if (error) return { summary: [], error: error.message };

    type BudgetItemRaw = {
      project_id: string;
      estimated_cost: number | null;
      actual_cost: number | null;
      projects: { name: string }[] | { name: string } | null;
    };
    // Group by project
    const map = new Map<string, { name: string; estimated: number; actual: number; items: number }>();
    for (const row of (items ?? []) as BudgetItemRaw[]) {
      // Supabase may return the FK join as array or single object depending on relationship type
      const projectName =
        Array.isArray(row.projects)
          ? (row.projects[0]?.name ?? "פרויקט לא ידוע")
          : (row.projects?.name ?? "פרויקט לא ידוע");
      const key = row.project_id;
      const existing = map.get(key);
      if (existing) {
        existing.estimated += row.estimated_cost ?? 0;
        existing.actual    += row.actual_cost    ?? 0;
        existing.items     += 1;
      } else {
        map.set(key, {
          name:      projectName,
          estimated: row.estimated_cost ?? 0,
          actual:    row.actual_cost    ?? 0,
          items:     1,
        });
      }
    }

    return {
      summary: Array.from(map.values()).sort((a, b) => b.estimated - a.estimated),
      error: null,
    };
  } catch (err) {
    return { summary: [], error: err instanceof Error ? err.message : "Unknown" };
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  if (!isAdminAuthed()) redirect("/he/internal");

  const [{ records: attendance, error: attErr }, { summary: budget, error: budgetErr }] =
    await Promise.all([getWeeklyAttendance(), getBudgetSummary()]);

  // Unique workers this week
  type AttRecord = { id: string; action: string; timestamp_label: string | null; recorded_at: string; staff: { name: string; phone: string } | null };
  const typedAttendance = attendance as AttRecord[];
  const uniqueWorkers = new Set(typedAttendance.map((r) => r.staff?.phone)).size;

  return (
    <main className="min-h-screen bg-bone" dir="rtl">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24 space-y-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-accent mb-2">
              בניין איתן — ניהול
            </p>
            <h1 className="font-heading text-3xl font-bold text-charcoal md:text-4xl">דשבורד</h1>
          </div>
          <Link href="/he/internal/admin"
            className="flex items-center gap-1 font-body text-xs text-charcoal/35 hover:text-accent transition-colors mt-1">
            <ChevronLeft size={14} strokeWidth={1.5} />
            פרויקטים
          </Link>
        </div>

        {/* ── Attendance Section ────────────────────────────────────────────── */}
        <section>
          <div className="mb-5 flex items-center justify-between border-b border-warm-gray-light pb-3">
            <div className="flex items-center gap-2">
              <Users size={16} strokeWidth={1.5} className="text-accent" />
              <h2 className="font-heading text-lg font-bold text-charcoal">נוכחות — 7 ימים אחרונים</h2>
            </div>
            <span className="font-body text-[0.65rem] text-charcoal/40">
              {typedAttendance.length} דיווחים • {uniqueWorkers} עובדים
            </span>
          </div>

          {attErr && (
            <p className="font-body text-sm text-red-500">שגיאה: {attErr}</p>
          )}

          {!attErr && typedAttendance.length === 0 && (
            <p className="font-body text-sm text-charcoal/40">אין דיווחי נוכחות השבוע</p>
          )}

          {typedAttendance.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-warm-gray-light text-[0.6rem] font-bold tracking-[0.2em] uppercase text-charcoal/40">
                    <th className="py-3 text-start pe-4">עובד</th>
                    <th className="py-3 text-start pe-4">טלפון</th>
                    <th className="py-3 text-start pe-4">פעולה</th>
                    <th className="py-3 text-start">תאריך ושעה</th>
                  </tr>
                </thead>
                <tbody>
                  {typedAttendance.map((rec) => (
                    <tr key={rec.id} className="border-b border-charcoal/[0.06] hover:bg-white transition-colors">
                      <td className="py-3 pe-4 font-semibold text-charcoal">
                        {rec.staff?.name ?? "—"}
                      </td>
                      <td className="py-3 pe-4 text-charcoal/50 dir-ltr tabular-nums text-xs">
                        {rec.staff?.phone ?? "—"}
                      </td>
                      <td className="py-3 pe-4">
                        <span className={`inline-block rounded-sm px-2 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase border ${
                          rec.action === "in"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                          {rec.action === "in" ? "כניסה" : "יציאה"}
                        </span>
                      </td>
                      <td className="py-3 text-charcoal/50 text-xs tabular-nums" dir="ltr">
                        {rec.timestamp_label ?? formatDateTime(rec.recorded_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Budget Section ────────────────────────────────────────────────── */}
        <section>
          <div className="mb-5 flex items-center gap-2 border-b border-warm-gray-light pb-3">
            <TrendingUp size={16} strokeWidth={1.5} className="text-accent" />
            <h2 className="font-heading text-lg font-bold text-charcoal">תקציב לעומת ביצוע בפועל</h2>
          </div>

          {budgetErr && (
            <p className="font-body text-sm text-red-500">שגיאה: {budgetErr}</p>
          )}

          {!budgetErr && budget.length === 0 && (
            <p className="font-body text-sm text-charcoal/40">אין פריטי תקציב עדיין</p>
          )}

          {budget.length > 0 && (
            <div className="space-y-3">
              {budget.map((proj) => {
                const pct = proj.estimated > 0 ? Math.min((proj.actual / proj.estimated) * 100, 100) : 0;
                const over = proj.estimated > 0 && proj.actual > proj.estimated;
                return (
                  <div key={proj.name} className="border border-charcoal/10 bg-white p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-sm font-bold text-charcoal">{proj.name}</p>
                        <p className="font-body text-[0.62rem] text-charcoal/40">{proj.items} צווי שינוי</p>
                      </div>
                      <div className="text-end">
                        <p className={`font-body text-sm font-bold tabular-nums ${over ? "text-red-600" : "text-charcoal"}`}>
                          {formatCurrency(proj.actual)}
                        </p>
                        <p className="font-body text-[0.62rem] text-charcoal/40">
                          מתוך {formatCurrency(proj.estimated)} מוערך
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-bone-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? "bg-red-400" : "bg-accent"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 font-body text-[0.6rem] text-charcoal/30 tabular-nums">
                      {pct.toFixed(0)}% בוצע
                      {over && <span className="text-red-400"> — חריגה מהתקציב!</span>}
                    </p>
                  </div>
                );
              })}

              {/* Totals row */}
              <div className="border border-charcoal/20 bg-charcoal p-5 flex items-center justify-between gap-4">
                <p className="font-heading text-sm font-bold text-bone">סה&quot;כ כל הפרויקטים</p>
                <div className="text-end">
                  <p className="font-body text-base font-bold text-bone tabular-nums">
                    {formatCurrency(budget.reduce((s, p) => s + p.actual, 0))}
                  </p>
                  <p className="font-body text-[0.62rem] text-bone/50">
                    מתוך {formatCurrency(budget.reduce((s, p) => s + p.estimated, 0))} מוערך
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
