"use client";

import React, { useState, useEffect } from "react";
import {
  Flag, CheckSquare2, Calendar, RefreshCw, AlertTriangle,
  Target, ChevronDown, ChevronUp, Hammer,
} from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT } from "../shared/constants";

// ── Local copies of label maps ────────────────────────────────────────────────
// Kept local because the same maps also live in AdminPortal.tsx (Dashboard /
// Attendance JSX still reference them). Lifting to a shared module would touch
// surfaces outside Planning's scope; cheaper to duplicate the ~10 tiny lines.
const MILESTONE_STATUS_HE: Record<string, string>  = { pending: "ממתין", in_progress: "בביצוע", completed: "הושלם" };
const MILESTONE_STATUS_CLS: Record<string, string> = {
  pending:     "bg-charcoal/5 text-charcoal/65",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-green-50 text-green-700",
};
const STATUS_HE: Record<string, string> = { planned: "מתוכנן", in_progress: "בביצוע", completed: "הושלם", delayed: "עיכוב" };
const STATUS_CLS: Record<string, string> = {
  planned:     "bg-charcoal/5 text-charcoal/65",
  in_progress: "bg-amber-50 text-amber-700",
  delayed:     "bg-red-50 text-red-600",
  completed:   "bg-green-50 text-green-700",
};
const DELAY_REASON_HE: Record<string, string> = {
  workers: "כוח אדם", material: "חומרים", weather: "מזג אוויר", subcontractor: "קבלן משנה",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectLite {
  id: string;
  name: string;
  status?: string;
}

interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  task_name: string;
  start_date: string | null;
  end_date:   string | null;
  contractor: string | null;
  status: "planned" | "in_progress" | "completed" | "delayed";
  notes: string | null;
  material_ready: boolean;
  sub_confirmed:  boolean;
  equipment_on_site: boolean;
  delay_reason: string | null;
}

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: "pending" | "in_progress" | "completed";
}

interface WeekDay { date: string; label: string; short: string }

type Props = {
  // Data
  projects: ProjectLite[];
  activeProjects: ProjectLite[];
  tasks: Task[];
  milestones: Milestone[];
  weekDays: WeekDay[];
  todayStr: string;

  // Milestone add form
  newMsProjectId:  string; setNewMsProjectId:  (v: string) => void;
  newMsName:       string; setNewMsName:       (v: string) => void;
  newMsTargetDate: string; setNewMsTargetDate: (v: string) => void;
  msAddLoading:    boolean;
  msAddMsg:        string;
  onAddMilestone:  (e: React.FormEvent) => void | Promise<void>;

  // Task add form
  newTaskProjectId:   string; setNewTaskProjectId:   (v: string) => void;
  newTaskMilestoneId: string; setNewTaskMilestoneId: (v: string) => void;
  newTaskName:        string; setNewTaskName:        (v: string) => void;
  newTaskContractor:  string; setNewTaskContractor:  (v: string) => void;
  newTaskStart:       string; setNewTaskStart:       (v: string) => void;
  newTaskEnd:         string; setNewTaskEnd:         (v: string) => void;
  taskAddLoading:     boolean;
  taskAddMsg:         string;
  onAddTask:          (e: React.FormEvent) => void | Promise<void>;

  // Macro plan
  taskFilter:  string; setTaskFilter: (v: string) => void;
  expandedMs:  Set<string>;
  onToggleMs:  (id: string) => void;

  // Mutation callbacks (useCallback in parent — passed through as-is)
  onAssignTaskDay:     (id: string, date: string | null) => void | Promise<void>;
  onSetTaskStatus:     (id: string, status: string) => void | Promise<void>;
  onSetMilestoneStatus:(id: string, status: string) => void | Promise<void>;
  onReload:            () => void | Promise<void>;

  // TabRefreshBar
  lastRefreshed: Date | null;
  refreshing:    boolean;
  dataLoading:   boolean;
  onTabRefresh:  () => void;
};

export default function PlanningTab(p: Props) {
  // Two accordions, collapsed by default so the weekly board (the actual
  // operational view) is what the admin lands on. Each auto-closes when its
  // own success message arrives ("✓ ..." prefix). Same pattern as the
  // workers-add-collapsed accordion — no localStorage.
  const [msOpen, setMsOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  useEffect(() => { if (p.msAddMsg?.startsWith("✓")) setMsOpen(false); }, [p.msAddMsg]);
  useEffect(() => { if (p.taskAddMsg?.startsWith("✓")) setTaskOpen(false); }, [p.taskAddMsg]);

  // The two creation forms — JSX kept as variables so the render() can place
  // them at the bottom (operational view goes first, forms after).
  const milestoneForm = (
      <Card>
        <button
          type="button"
          onClick={() => setMsOpen(v => !v)}
          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={msOpen}
        >
          <Flag size={15} strokeWidth={1.5} className="text-accent shrink-0" />
          <h2 className="font-heading text-base font-bold flex-1 text-start">הוספת אבן דרך</h2>
          {msOpen
            ? <ChevronUp size={16} strokeWidth={1.5} className="text-charcoal/70" />
            : <ChevronDown size={16} strokeWidth={1.5} className="text-charcoal/70" />}
        </button>
        {msOpen && (
        <form onSubmit={p.onAddMilestone} className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="פרויקט">
              <select value={p.newMsProjectId} onChange={e => { p.setNewMsProjectId(e.target.value); p.setNewTaskMilestoneId(""); }} required className={INPUT}>
                <option value="">בחר פרויקט...</option>
                {p.activeProjects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
              </select>
            </Field>
            <Field label="יעד תאריך">
              <input type="date" value={p.newMsTargetDate} onChange={e => p.setNewMsTargetDate(e.target.value)} className={INPUT} dir="ltr" />
            </Field>
          </div>
          <Field label="שם אבן הדרך">
            <input value={p.newMsName} onChange={e => p.setNewMsName(e.target.value)} required placeholder="בסיס ושלד, גמר פנים, מסירה..." className={INPUT} />
          </Field>
          <Btn loading={p.msAddLoading} disabled={!p.newMsProjectId}>הוסף אבן דרך</Btn>
          {p.msAddMsg && <p className={`text-xs ${p.msAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{p.msAddMsg}</p>}
        </form>
        )}
      </Card>
  );

  const taskForm = (
      <Card>
        <button
          type="button"
          onClick={() => setTaskOpen(v => !v)}
          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={taskOpen}
        >
          <CheckSquare2 size={15} strokeWidth={1.5} className="text-accent shrink-0" />
          <h2 className="font-heading text-base font-bold flex-1 text-start">הוספת משימה שבועית</h2>
          {taskOpen
            ? <ChevronUp size={16} strokeWidth={1.5} className="text-charcoal/70" />
            : <ChevronDown size={16} strokeWidth={1.5} className="text-charcoal/70" />}
        </button>
        {taskOpen && (
        <form onSubmit={p.onAddTask} className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="פרויקט">
              <select value={p.newTaskProjectId} onChange={e => { p.setNewTaskProjectId(e.target.value); p.setNewTaskMilestoneId(""); }} required className={INPUT}>
                <option value="">בחר פרויקט...</option>
                {p.activeProjects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
              </select>
            </Field>
            <Field label="תחת אבן דרך">
              <select value={p.newTaskMilestoneId} onChange={e => p.setNewTaskMilestoneId(e.target.value)} className={INPUT}>
                <option value="">ללא אבן דרך</option>
                {p.milestones.filter(m => m.project_id === p.newTaskProjectId && m.status !== "completed").map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם המשימה">
              <input value={p.newTaskName} onChange={e => p.setNewTaskName(e.target.value)} required placeholder="ריצוף, גבס, אינסטלציה..." className={INPUT} />
            </Field>
            <Field label="קבלן / צוות">
              <input value={p.newTaskContractor} onChange={e => p.setNewTaskContractor(e.target.value)} placeholder="שם קבלן" className={INPUT} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך התחלה"><input type="date" value={p.newTaskStart} onChange={e => p.setNewTaskStart(e.target.value)} className={INPUT} dir="ltr" /></Field>
            <Field label="תאריך סיום">  <input type="date" value={p.newTaskEnd}   onChange={e => p.setNewTaskEnd(e.target.value)}   className={INPUT} dir="ltr" /></Field>
          </div>
          <Btn loading={p.taskAddLoading} disabled={!p.newTaskProjectId}>הוסף משימה</Btn>
          {p.taskAddMsg && <p className={`text-xs ${p.taskAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{p.taskAddMsg}</p>}
        </form>
        )}
      </Card>
  );

  return (
    <div className="space-y-5">
      <TabRefreshBar loading={p.refreshing || p.dataLoading} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />

      {/* ── Weekly look-ahead — the operational view; first thing the
          admin should see on entry. The two create-forms (אבן דרך +
          משימה) sit at the very bottom, behind accordions. ───────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={14} strokeWidth={1.5} className="text-accent" />
            <h2 className="font-heading text-sm font-bold">לוח שבועי — שבוע נוכחי</h2>
          </div>
          <button onClick={p.onReload} className="text-charcoal/70 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
        </div>

        {/* Unscheduled this week */}
        {(() => {
          const weekDateSet = new Set(p.weekDays.map(d => d.date));
          const unscheduled = p.tasks.filter(t => t.status !== "completed" && (!t.start_date || !weekDateSet.has(t.start_date)));
          if (!unscheduled.length) return null;
          return (
            <div className="mb-4 space-y-2">
              <p className="text-[0.75rem] font-bold tracking-widest uppercase text-charcoal/70">ללא לו&quot;ז לשבוע זה</p>
              {unscheduled.map(t => (
                <div key={t.id} className="bg-bone border border-charcoal/10 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare2 size={11} strokeWidth={1.5} className="text-charcoal/20 shrink-0" />
                    <p className="text-xs font-semibold flex-1 truncate">{t.task_name}</p>
                    <span className={`text-[0.75rem] px-1.5 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {p.weekDays.map(d => (
                      <button key={d.date} onClick={() => p.onAssignTaskDay(t.id, d.date)}
                        className={`text-[0.75rem] min-h-[44px] px-2 py-2 border transition-colors flex items-center justify-center ${d.date === p.todayStr ? "border-accent text-accent" : "border-charcoal/15 text-charcoal/65 hover:border-accent hover:text-accent"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Day columns */}
        <div className="space-y-2">
          {p.weekDays.map(day => {
            const dayTasks = p.tasks.filter(t => t.start_date === day.date && t.status !== "completed");
            const isToday  = day.date === p.todayStr;
            return (
              <div key={day.date} className={`border ${isToday ? "border-accent/40" : "border-charcoal/10"}`}>
                <div className={`flex items-center justify-between px-3 py-2 ${isToday ? "bg-accent/[0.05]" : "bg-charcoal/[0.02]"}`}>
                  <span className={`text-xs font-bold ${isToday ? "text-accent" : "text-charcoal/60"}`}>{day.label}</span>
                  <span className="text-[0.75rem] text-charcoal/70 tabular-nums" dir="ltr">{day.short}</span>
                </div>
                {dayTasks.length === 0 ? (
                  <p className="text-[0.75rem] text-charcoal/20 text-center py-1.5">ריק</p>
                ) : (
                  <div className="divide-y divide-charcoal/10">
                    {dayTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                        <CheckSquare2 size={11} strokeWidth={1.5} className={`shrink-0 ${t.status === "in_progress" ? "text-amber-500" : "text-charcoal/20"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{t.task_name}</p>
                          {t.contractor && <p className="text-[0.75rem] text-charcoal/70">{t.contractor}</p>}
                        </div>
                        {t.status === "planned" && (
                          <button onClick={() => p.onSetTaskStatus(t.id, "in_progress")} className="text-[0.75rem] border border-amber-300 px-1.5 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">▶</button>
                        )}
                        {t.status !== "completed" && (
                          <button onClick={() => p.onSetTaskStatus(t.id, "completed")} className="text-[0.75rem] border border-green-300 px-1.5 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">✓</button>
                        )}
                        <button onClick={() => p.onAssignTaskDay(t.id, null)} className="text-[0.75rem] text-charcoal/20 hover:text-red-400 transition-colors shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Red Alerts ───────────────────────────────────────────────── */}
      {(() => {
        const delayed   = p.tasks.filter(t => t.status === "delayed");
        const notReady  = p.tasks.filter(t => t.status !== "completed" && t.status !== "delayed" && (!t.material_ready || !t.sub_confirmed || !t.equipment_on_site));
        const total     = delayed.length + notReady.length;
        if (!total) return null;
        return (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} strokeWidth={1.5} className="text-red-500" />
              <h2 className="font-heading text-sm font-bold text-red-700">התראות לוגיסטיות ({total})</h2>
            </div>
            <div className="space-y-1.5">
              {delayed.map(t => {
                const proj = p.projects.find(pr => pr.id === t.project_id);
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100">
                    <span className="text-[0.75rem] px-1.5 py-0.5 bg-red-100 text-red-700 font-semibold shrink-0">עיכוב</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{t.task_name}</p>
                      <p className="text-[0.75rem] text-charcoal/70">{proj?.name}{t.delay_reason ? ` · ${DELAY_REASON_HE[t.delay_reason] ?? t.delay_reason}` : ""}</p>
                    </div>
                  </div>
                );
              })}
              {notReady.map(t => {
                const proj    = p.projects.find(pr => pr.id === t.project_id);
                const missing = [
                  !t.material_ready    && "חומרים",
                  !t.sub_confirmed     && "קבלן משנה",
                  !t.equipment_on_site && "ציוד",
                ].filter(Boolean).join(", ");
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100">
                    <span className="text-[0.75rem] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-semibold shrink-0">לא מוכן</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{t.task_name}</p>
                      <p className="text-[0.75rem] text-charcoal/70">{proj?.name}{missing ? ` · חסר: ${missing}` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* ── Macro plan — milestones ─────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Target size={14} strokeWidth={1.5} className="text-accent" />
            <h2 className="font-heading text-sm font-bold">תוכנית מאקרו — אבני דרך</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={p.taskFilter} onChange={e => p.setTaskFilter(e.target.value)} className="text-xs border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none">
              <option value="">כל הפרויקטים</option>
              {p.projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
            </select>
            <button onClick={p.onReload} className="text-charcoal/70 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
          </div>
        </div>

        {p.milestones.filter(m => !p.taskFilter || m.project_id === p.taskFilter).length === 0 && (
          <p className="text-sm text-charcoal/70 text-center py-6">אין אבני דרך — הוסף אחת למעלה</p>
        )}

        {p.milestones
          .filter(m => !p.taskFilter || m.project_id === p.taskFilter)
          .map(ms => {
            const msTasks    = p.tasks.filter(t => t.milestone_id === ms.id);
            const doneCount  = msTasks.filter(t => t.status === "completed").length;
            const delayCount = msTasks.filter(t => t.status === "delayed").length;
            const pct        = msTasks.length ? Math.round((doneCount / msTasks.length) * 100) : 0;
            const isExpanded = p.expandedMs.has(ms.id);
            const proj       = p.projects.find(pr => pr.id === ms.project_id);

            return (
              <div key={ms.id} className={`border ${ms.status === "completed" ? "border-charcoal/8 opacity-60" : delayCount > 0 ? "border-red-200" : "border-charcoal/15"} bg-white`}>
                {/* Milestone header */}
                <button onClick={() => p.onToggleMs(ms.id)} className="w-full flex items-center gap-2.5 px-4 py-3 text-right hover:bg-bone/60 transition-colors">
                  <Target size={14} strokeWidth={1.5} className={`shrink-0 ${ms.status === "completed" ? "text-green-500" : ms.status === "in_progress" ? "text-amber-500" : "text-accent/50"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${ms.status === "completed" ? "line-through text-charcoal/65" : "text-charcoal"}`}>{ms.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {proj && <span className="text-[0.75rem] text-charcoal/35">{proj.name}</span>}
                      {ms.target_date && <span className="text-[0.75rem] text-charcoal/35 tabular-nums" dir="ltr">· {ms.target_date}</span>}
                    </div>
                    {msTasks.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-charcoal/8 overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-charcoal/35 tabular-nums shrink-0">{pct}%</span>
                      </div>
                    )}
                  </div>
                  {delayCount > 0 && <span className="text-[0.75rem] px-1.5 py-0.5 bg-red-50 text-red-600 shrink-0">{delayCount} עיכוב</span>}
                  <span className={`text-[0.75rem] px-2 py-0.5 shrink-0 ${MILESTONE_STATUS_CLS[ms.status]}`}>{MILESTONE_STATUS_HE[ms.status]}</span>
                  <span className="text-[0.75rem] text-charcoal/70 shrink-0 tabular-nums">{doneCount}/{msTasks.length}</span>
                  {isExpanded ? <ChevronUp size={13} strokeWidth={1.5} className="shrink-0 text-charcoal/70" /> : <ChevronDown size={13} strokeWidth={1.5} className="shrink-0 text-charcoal/70" />}
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-charcoal/8">
                    {msTasks.length === 0 ? (
                      <p className="text-[0.75rem] text-charcoal/25 text-center py-3">אין משימות תחת אבן דרך זו</p>
                    ) : (
                      <div className="divide-y divide-charcoal/10">
                        {msTasks.map(t => (
                          <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 ${t.status === "completed" ? "opacity-50" : ""}`}>
                            <CheckSquare2 size={12} strokeWidth={1.5} className={`shrink-0 ${t.status === "completed" ? "text-green-500" : t.status === "in_progress" ? "text-amber-400" : t.status === "delayed" ? "text-red-400" : "text-charcoal/20"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${t.status === "completed" ? "line-through" : ""}`}>{t.task_name}</p>
                              <div className="flex items-center gap-2 text-[0.75rem] text-charcoal/35 mt-0.5 flex-wrap">
                                {t.contractor && <span>{t.contractor}</span>}
                                {t.start_date && <span dir="ltr">{t.start_date}{t.end_date ? ` → ${t.end_date}` : ""}</span>}
                                {t.status === "delayed" && t.delay_reason && <span className="text-red-500">{DELAY_REASON_HE[t.delay_reason] ?? t.delay_reason}</span>}
                                {t.status !== "completed" && (!t.material_ready || !t.sub_confirmed || !t.equipment_on_site) && (
                                  <span className="text-amber-600">
                                    {[!t.material_ready && "חומרים", !t.sub_confirmed && "קב״מ", !t.equipment_on_site && "ציוד"].filter(Boolean).join(", ")} ✗
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-[0.75rem] px-1.5 py-0.5 shrink-0 ${STATUS_CLS[t.status] ?? ""}`}>{STATUS_HE[t.status] ?? t.status}</span>
                            {t.status !== "completed" && (
                              <>
                                {t.status === "planned" && (
                                  <button onClick={() => p.onSetTaskStatus(t.id, "in_progress")} className="text-[0.75rem] border border-amber-300 px-1.5 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">▶</button>
                                )}
                                {t.status === "in_progress" && (
                                  <button onClick={() => p.onSetTaskStatus(t.id, "planned")} className="text-[0.75rem] border border-charcoal/20 px-1.5 py-0.5 text-charcoal/70 hover:border-accent transition-colors shrink-0">⏸</button>
                                )}
                                <button onClick={() => p.onSetTaskStatus(t.id, "completed")} className="text-[0.75rem] border border-green-300 px-1.5 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">✓</button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Milestone action bar */}
                    {ms.status !== "completed" && (
                      <div className="flex gap-2 px-4 py-2 bg-bone/50 border-t border-charcoal/8">
                        {ms.status === "pending" && (
                          <button onClick={() => p.onSetMilestoneStatus(ms.id, "in_progress")} className="text-[0.75rem] border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50 transition-colors">▶ הפעל אבן דרך</button>
                        )}
                        {ms.status === "in_progress" && (
                          <button onClick={() => p.onSetMilestoneStatus(ms.id, "pending")} className="text-[0.75rem] border border-charcoal/20 px-3 py-1 text-charcoal/65 hover:border-accent transition-colors">⏸ עצור</button>
                        )}
                        <button onClick={() => p.onSetMilestoneStatus(ms.id, "completed")} className="text-[0.75rem] border border-green-300 px-3 py-1 text-green-700 hover:bg-green-50 transition-colors">✓ סיים אבן דרך</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Free tasks (no milestone) */}
        {(() => {
          const free = p.tasks.filter(t => !t.milestone_id && t.status !== "completed" && (!p.taskFilter || t.project_id === p.taskFilter));
          if (!free.length) return null;
          return (
            <div className="border border-charcoal/10 bg-white">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-charcoal/[0.02] border-b border-charcoal/8">
                <Hammer size={12} strokeWidth={1.5} className="text-charcoal/70" />
                <p className="text-xs font-semibold text-charcoal/65">משימות ללא אבן דרך</p>
              </div>
              <div className="divide-y divide-charcoal/10">
                {free.map(t => {
                  const proj = p.projects.find(pr => pr.id === t.project_id);
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                      <CheckSquare2 size={12} strokeWidth={1.5} className="shrink-0 text-charcoal/20" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{t.task_name}</p>
                        <div className="flex items-center gap-2 text-[0.75rem] text-charcoal/35 mt-0.5">
                          {proj && <span>{proj.name}</span>}
                          {t.contractor && <span>· {t.contractor}</span>}
                        </div>
                      </div>
                      <span className={`text-[0.75rem] px-1.5 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                      {t.status === "planned" && <button onClick={() => p.onSetTaskStatus(t.id, "in_progress")} className="text-[0.75rem] border border-amber-300 px-1.5 py-0.5 text-amber-700 hover:bg-amber-50 shrink-0">▶</button>}
                      <button onClick={() => p.onSetTaskStatus(t.id, "completed")} className="text-[0.75rem] border border-green-300 px-1.5 py-0.5 text-green-700 hover:bg-green-50 shrink-0">✓</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Create-forms moved here from the top — accordions, closed by default.
          Operational view above is what the admin needs every time; creating
          a milestone / task is rarer, lives behind a click. */}
      {milestoneForm}
      {taskForm}
    </div>
  );
}
