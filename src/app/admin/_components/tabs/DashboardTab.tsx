"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Card } from "../shared/Card";
import AttentionPanel, { type AttentionItem } from "../shared/AttentionPanel";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import ForecastDetailDialog, { type ForecastLine } from "../shared/ForecastDetailDialog";
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
  planned:     "bg-charcoal/5 text-charcoal/60",
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
      <p className="text-[0.75rem] text-charcoal/70 text-center -mt-2">מתעדכן אוטומטית כל 2 דקות</p>

      {/* Things that need attention — admin only; auto-hides when empty */}
      {p.isAdmin && <AttentionPanel items={p.attentionItems} />}

      {/* On-site */}
      <Card title="⚡ מי באתר כרגע">
        {p.onSite.length === 0 ? (
          <p className="text-sm text-charcoal/70 text-center py-2">אין עובדים מדווחים כרגע</p>
        ) : (
          <div className="divide-y divide-charcoal/5">
            {p.onSite.map(({ record, worker }) => {
              const t = record.clock_at
                ? new Date(record.clock_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })
                : new Date(record.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={record.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{record.staff?.name ?? "—"}</p>
                    <p className="text-[0.75rem] text-charcoal/70">{record.staff?.role ?? ""}</p>
                  </div>
                  {record.project && (
                    <div
                      className="flex items-center gap-1 text-[0.75rem] text-charcoal/70"
                      title={record.project.name}
                    >
                      <Building2 size={10} strokeWidth={1.5} className="shrink-0" />
                      <span className="truncate max-w-[140px]">{record.project.name}</span>
                    </div>
                  )}
                  {/* `worker?.daily_rate && (...)` rendered the literal "0"
                      next to workers whose daily_rate is 0 (hourly/global
                      workers). Coerce to boolean + require > 0 so the
                      span is either shown or omitted, never replaced by 0. */}
                  {p.isAdmin && !!worker?.daily_rate && worker.daily_rate > 0 && (
                    <span className="text-[0.75rem] text-accent-dark shrink-0">₪{worker.daily_rate}/יום</span>
                  )}
                  <span className="text-[0.7rem] text-green-600 tabular-nums shrink-0">מ-{t}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Admin: daily spend */}
      {p.isAdmin && (
        <Card title="💰 עלויות היום">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center py-1.5 border-b border-charcoal/5">
              <span className="text-sm text-charcoal/60">שכר עובדים (אומדן)</span>
              <span className="text-sm font-semibold tabular-nums">₪{Math.round(p.laborEstimate).toLocaleString("he-IL")}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-charcoal/5">
              <span className="text-sm text-charcoal/60">הוצאות שנרשמו היום</span>
              <span className="text-sm font-semibold tabular-nums">₪{Math.round(p.todayExpensesTotal).toLocaleString("he-IL")}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold">סה&quot;כ</span>
              <span className="text-base font-bold text-accent tabular-nums">
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
                  <span className="text-sm text-charcoal/60">חודש מלא צפוי</span>
                  {p.monthlySalaryForecastLoading ? (
                    <span className="text-sm text-charcoal/40">טוען…</span>
                  ) : p.monthlySalaryForecast == null ? (
                    <span className="text-sm text-charcoal/40">—</span>
                  ) : (
                    <span className="text-base font-bold text-accent tabular-nums">
                      ₪{Math.round(p.monthlySalaryForecast).toLocaleString("he-IL")}
                    </span>
                  )}
                </div>
                <p className="text-[0.7rem] text-charcoal/60 leading-snug">
                  אומדן גס: 22 ימי עבודה × 8.5 שעות
                  {p.monthlySalaryForecastCount != null && p.monthlySalaryForecastCount > 0 && (
                    <>, {p.monthlySalaryForecastCount} עובדים פעילים</>
                  )}.
                  לא כולל חופשות, חגים או היעדרויות.
                  {canOpen && <span className="text-accent/80"> · הקש לפירוט.</span>}
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
          <p className="text-sm text-charcoal/70 text-center py-2">אין משימות פעילות להיום</p>
        ) : (
          <div className="divide-y divide-charcoal/5">
            {p.todayTasks.map(t => {
              const proj = p.projects.find(pr => pr.id === t.project_id);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.task_name}</p>
                    <div className="flex items-center gap-1 text-[0.75rem] text-charcoal/70 mt-0.5">
                      {proj && <><Building2 size={9} strokeWidth={1.5} /><span>{proj.name}</span></>}
                      {t.contractor && <span className="ms-1">· {t.contractor}</span>}
                    </div>
                  </div>
                  <span className={`text-[0.75rem] px-2 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                  {t.status !== "in_progress" && (
                    <button onClick={() => p.onSetTaskStatus(t.id, "in_progress")} className="text-[0.75rem] border border-amber-300 px-2 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">הפעל</button>
                  )}
                  {t.status !== "completed" && (
                    <button onClick={() => p.onSetTaskStatus(t.id, "completed")} className="text-[0.75rem] border border-green-300 px-2 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">סיים</button>
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
                <span className="text-sm font-bold text-accent">{count}</span>
                <span className="text-xs text-charcoal/60">{role}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
