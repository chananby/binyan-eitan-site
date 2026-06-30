"use client";

import { useState } from "react";
import { Building2, Coins, ChevronLeft } from "lucide-react";
import { Card } from "../shared/Card";
import AttentionPanel, { type AttentionItem } from "../shared/AttentionPanel";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import ForecastDetailDialog, { type ForecastLine } from "../shared/ForecastDetailDialog";
import type { CollectionsData } from "./CollectionsTab";
import type {
  StaffMember, AttendanceRecord, Project, Task, BudgetLine,
} from "../types";

// Dashboard tab content — pure move from AdminPortal.tsx. All derived
// values (onSite, laborEstimate, todayExpensesTotal, todayTasks, roleMap,
// activeProjects) are computed by the parent's existing useMemo()s and
// passed in as props, so this component owns zero data. Status labels
// are inlined as constants here because they're only used by this view.

const STATUS_HE: Record<string, string> = {
  planned: "מתוכנן", in_progress: "בביצוע", completed: "הושלם", delayed: "עיכוב",
};
const STATUS_CLS: Record<string, string> = {
  // text-charcoal/60 was failing WCAG AA on the chip bg. /85 keeps the
  // "muted" feel without sliding under the contrast floor.
  planned:     "bg-charcoal/5 text-charcoal/85",
  in_progress: "bg-amber-50 text-amber-700",
  delayed:     "bg-red-50 text-red-700",
  completed:   "bg-green-50 text-green-700",
};

interface OnSiteEntry {
  record: AttendanceRecord;
  worker?: StaffMember;
}

interface Props {
  isAdmin: boolean;
  isForeman: boolean;

  // Computed / memoized values from parent
  onSite: OnSiteEntry[];
  laborEstimate: number;
  todayExpensesTotal: number;
  // Forward-looking monthly salary forecast — null while in flight, then a
  // number, or null if the request failed (card stays out of the way in
  // that case rather than flashing a 0). Per-worker breakdown opens in a
  // dialog when the admin taps the card.
  monthlySalaryForecast: number | null;
  monthlySalaryForecastCount: number | null;
  monthlySalaryForecastLoading: boolean;
  monthlySalaryForecastLines: ForecastLine[];
  monthlySalaryForecastMonth: string;
  todayTasks: Task[];
  roleMap: Record<string, number>;
  activeProjects: Project[];

  // Raw data slices
  staff: StaffMember[];
  todayLogs: AttendanceRecord[];
  projects: Project[];
  tasks: Task[];
  budget: BudgetLine[];
  incomeTotals: Record<string, number>;
  /** Collections payload from /api/admin/collections — drives the
   *  "💰 לגבייה" card. Null while in flight; the card only renders
   *  when total_due > 0 so the dashboard doesn't carry a ₪0 card. */
  collections: CollectionsData | null;
  /** Tab switch to "גבייה" — wired from AdminPortal's goToTab. */
  onGoToCollections: () => void;

  // Top bar
  refreshing: boolean;
  dataLoading: boolean;
  lastRefreshed: Date | null;
  onTabRefresh: () => void;

  // Attention panel + task quick-action
  attentionItems: AttentionItem[];
  onSetTaskStatus: (id: string, status: string) => void;
}

export default function DashboardTab(p: Props) {
  // Per-worker forecast dialog — opens from the salary forecast card.
  // Kept local because no other screen needs it; AdminPortal doesn't need
  // to know about the open/closed state.
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <TabRefreshBar loading={p.refreshing || p.dataLoading} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />
      <p className="text-caption text-charcoal/80 text-center -mt-2">מתעדכן אוטומטית כל 2 דקות</p>

      {/* Things that need attention — admin only; auto-hides when empty */}
      {p.isAdmin && <AttentionPanel items={p.attentionItems} />}

      {/* On-site */}
      <Card title="⚡ מי באתר כרגע">
        {p.onSite.length === 0 ? (
          <p className="text-content text-charcoal text-center py-2">אין עובדים מדווחים כרגע</p>
        ) : (
          <div className="divide-y divide-charcoal/15">
            {p.onSite.map(({ record, worker }) => {
              const t = record.clock_at
                ? new Date(record.clock_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })
                : new Date(record.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={record.id} className="flex items-center justify-between py-2.5 gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-content font-semibold text-charcoal truncate">{record.staff?.name ?? "—"}</p>
                    <p className="text-caption text-charcoal/85">{record.staff?.role ?? ""}</p>
                  </div>
                  {record.project && (
                    <div
                      className="flex items-center gap-1 text-caption text-charcoal/85"
                      title={record.project.name}
                    >
                      <Building2 size={12} strokeWidth={2} className="shrink-0" />
                      <span className="truncate max-w-[160px]">{record.project.name}</span>
                    </div>
                  )}
                  {/* `worker?.daily_rate && (...)` rendered the literal "0"
                      next to workers whose daily_rate is 0 (hourly/global
                      workers). Coerce to boolean + require > 0 so the
                      span is either shown or omitted, never replaced by 0. */}
                  {p.isAdmin && !!worker?.daily_rate && worker.daily_rate > 0 && (
                    <span className="text-caption font-semibold text-accent-dark shrink-0">₪{worker.daily_rate}/יום</span>
                  )}
                  <span className="text-caption font-semibold text-green-700 tabular-nums shrink-0">מ-{t}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Admin: collections — only renders when there IS something to
          collect. A zero-state card would just be noise the contractor
          scrolls past, so we hide it. Top 3 by remaining (highest first)
          so the largest unpaid stage anchors the eye. Tap takes the
          admin straight to the full CollectionsTab. */}
      {p.isAdmin && p.collections && p.collections.totals.count > 0 && (() => {
        const sorted = [...p.collections.items].sort((a, b) => b.remaining - a.remaining);
        const top3 = sorted.slice(0, 3);
        return (
          <button
            type="button"
            onClick={p.onGoToCollections}
            aria-label="פתח את מסך הגבייה"
            className="w-full text-start rounded-md border-2 border-red-300 bg-red-50 shadow-sm hover:bg-red-100 transition-colors"
          >
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Coins size={14} strokeWidth={2} className="text-red-700" />
                <p className="text-caption font-bold text-red-700 tracking-wide uppercase">לגבייה עכשיו</p>
              </div>
              <p className="text-3xl font-bold text-red-800 tabular-nums leading-tight">
                ₪{Math.round(p.collections.totals.total_due).toLocaleString("he-IL")}
              </p>
              <p className="text-content text-charcoal">
                {p.collections.totals.count} {p.collections.totals.count === 1 ? "תשלום" : "תשלומים"} מ-{Object.keys(p.collections.totals.by_project).length} פרויקטים
              </p>
              <div className="pt-2 space-y-1 border-t border-red-300">
                {top3.map((item) => (
                  <div key={item.milestone.id} className="flex items-center justify-between gap-2 text-content">
                    <span className="text-charcoal truncate min-w-0 flex-1">
                      {item.project?.name ?? "—"} · <span className="text-charcoal/85">{item.milestone.title}</span>
                    </span>
                    <span className="font-semibold text-red-700 tabular-nums shrink-0">
                      ₪{Math.round(item.remaining).toLocaleString("he-IL")}
                    </span>
                  </div>
                ))}
                {p.collections.totals.count > 3 && (
                  <p className="text-caption text-charcoal/85 pt-1">
                    ועוד {p.collections.totals.count - 3}…
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 text-content font-semibold text-red-700 pt-1">
                ראה הכל <ChevronLeft size={14} strokeWidth={2} />
              </div>
            </div>
          </button>
        );
      })()}

      {/* Admin: daily spend */}
      {p.isAdmin && (
        <Card title="💰 עלויות היום">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center py-1.5 border-b border-charcoal/15">
              <span className="text-content text-charcoal">שכר עובדים (אומדן)</span>
              <span className="text-content font-semibold text-charcoal tabular-nums">₪{Math.round(p.laborEstimate).toLocaleString("he-IL")}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-charcoal/15">
              <span className="text-content text-charcoal">הוצאות שנרשמו היום</span>
              <span className="text-content font-semibold text-charcoal tabular-nums">₪{Math.round(p.todayExpensesTotal).toLocaleString("he-IL")}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-content font-bold text-charcoal">סה&quot;כ</span>
              <span className="text-body font-bold text-accent-dark tabular-nums">
                ₪{Math.round(p.laborEstimate + p.todayExpensesTotal).toLocaleString("he-IL")}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Admin: forward-looking monthly salary forecast.
          A rough planning number — 22 days × 8.5 h × current rate per active
          worker. Sits next to the "today" card so the admin sees both a
          spend snapshot and a month-ahead estimate without leaving Dashboard.
          Tap the card to open a per-worker breakdown dialog (also downloads
          to XLSX). When the data hasn't loaded yet or failed, the card
          stays non-interactive — a misleading "0 workers" dialog beats a
          clear loading state. */}
      {p.isAdmin && (() => {
        const canOpen = !p.monthlySalaryForecastLoading
          && p.monthlySalaryForecast != null
          && p.monthlySalaryForecastLines.length > 0;
        return (
          <button
            type="button"
            onClick={() => canOpen && setForecastDialogOpen(true)}
            disabled={!canOpen}
            aria-label="פתח פירוט צפי שכר חודשי"
            className={`w-full text-start rounded-md border border-charcoal/10 bg-white shadow-sm transition-colors ${canOpen ? "cursor-pointer hover:border-accent/40 hover:bg-bone-dark/40" : "cursor-default"}`}
          >
            <Card title="📅 צפי שכר חודשי (אומדן)">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-content text-charcoal">חודש מלא צפוי</span>
                  {p.monthlySalaryForecastLoading ? (
                    <span className="text-content text-charcoal/70">טוען…</span>
                  ) : p.monthlySalaryForecast == null ? (
                    <span className="text-content text-charcoal/70">—</span>
                  ) : (
                    <span className="text-body font-bold text-accent-dark tabular-nums">
                      ₪{Math.round(p.monthlySalaryForecast).toLocaleString("he-IL")}
                    </span>
                  )}
                </div>
                <p className="text-caption text-charcoal/85 leading-snug">
                  אומדן גס: 22 ימי עבודה × 8.5 שעות
                  {p.monthlySalaryForecastCount != null && p.monthlySalaryForecastCount > 0 && (
                    <>, {p.monthlySalaryForecastCount} עובדים פעילים</>
                  )}.
                  לא כולל חופשות, חגים או היעדרויות.
                  {canOpen && <span className="text-accent-dark font-semibold"> · הקש לפירוט.</span>}
                </p>
              </div>
            </Card>
          </button>
        );
      })()}

      {/* Per-worker breakdown dialog. Always mounted so the close-anim runs
          cleanly; the dialog itself returns null when !open. */}
      <ForecastDetailDialog
        open={forecastDialogOpen}
        onClose={() => setForecastDialogOpen(false)}
        lines={p.monthlySalaryForecastLines}
        total={p.monthlySalaryForecast ?? 0}
        month={p.monthlySalaryForecastMonth}
      />

      {/* Per-project cost cards were removed here: they summed `materials.cost`,
          which conflicts with the new financial_documents-based "תקציב מול ביצוע"
          (single source of truth, shown per project in the Projects tab). */}

      {/* Today's tasks */}
      <Card title="📋 משימות היום">
        {p.todayTasks.length === 0 ? (
          <p className="text-content text-charcoal text-center py-2">אין משימות פעילות להיום</p>
        ) : (
          <div className="divide-y divide-charcoal/15">
            {p.todayTasks.map(t => {
              const proj = p.projects.find(pr => pr.id === t.project_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-content font-semibold text-charcoal truncate">{t.task_name}</p>
                    <div className="flex items-center gap-1 text-caption text-charcoal/85 mt-0.5">
                      {proj && <><Building2 size={11} strokeWidth={2} /><span>{proj.name}</span></>}
                      {t.contractor && <span className="ms-1">· {t.contractor}</span>}
                    </div>
                  </div>
                  <span className={`text-caption font-semibold px-2 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                  {t.status !== "in_progress" && (
                    <button onClick={() => p.onSetTaskStatus(t.id, "in_progress")} className="text-caption font-semibold border border-amber-300 px-2 py-1 text-amber-800 hover:bg-amber-50 transition-colors shrink-0">הפעל</button>
                  )}
                  {t.status !== "completed" && (
                    <button onClick={() => p.onSetTaskStatus(t.id, "completed")} className="text-caption font-semibold border border-green-300 px-2 py-1 text-green-800 hover:bg-green-50 transition-colors shrink-0">סיים</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Role breakdown (admin) */}
      {p.isAdmin && Object.keys(p.roleMap).length > 0 && (
        <Card title="נוכחות לפי תפקיד">
          <div className="flex flex-wrap gap-2">
            {Object.entries(p.roleMap).map(([role, count]) => (
              <div key={role} className="flex items-center gap-2 bg-bone px-3 py-1.5 border border-charcoal/10">
                <span className="text-content font-bold text-accent-dark">{count}</span>
                <span className="text-caption text-charcoal/85">{role}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
