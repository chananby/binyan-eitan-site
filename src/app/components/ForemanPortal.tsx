"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home, Users, ClipboardList, PlusCircle, Calendar,
  ChevronRight, RefreshCw, Loader2, AlertCircle,
  LogOut, CheckCircle2, Clock, Flame, ChevronDown,
  Check, Package, Wrench, AlertTriangle, Flag,
  CloudRain, X, ArrowLeftRight, Target, Timer,
} from "lucide-react";
import { useFeedback } from "../hooks/useFeedback";
import { AutoGrowTextarea } from "./AutoGrowTextarea";

// ── Types ──────────────────────────────────────────────────────────────────────
type View      = "loading" | "no_projects" | "select" | "dashboard";
type Tab       = "overview" | "site" | "log" | "expense" | "plan" | "hours";
type LogStatus = "normal" | "delay" | "problem";
type DelayReason = "workers" | "material" | "weather" | "subcontractor";

interface Project { id: string; name: string; status?: string; }

interface Task {
  id: string; task_name: string; status: string;
  start_date: string | null; end_date: string | null;
  milestone_id: string | null; notes: string | null;
  material_ready: boolean; sub_confirmed: boolean; equipment_on_site: boolean;
  delay_reason: DelayReason | null;
}

interface Milestone {
  id: string; project_id: string; name: string;
  target_date: string | null; status: string;
}

interface OnSiteEntry {
  att_id: string;
  staff_id: string;
  name: string;
  entry_time: string;
  lat?: string | null;
  lng?: string | null;
  distance_from_project_m?: number | null;
}

interface PendingRecord {
  id: string;
  action: string;
  timestamp_label: string | null;
  lat?: string | null;
  lng?: string | null;
  distance_from_project_m?: number | null;
  staff: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}

// Display threshold for the distance flag in the foreman portal.
// Admin can override system-wide via /admin#account — this is the
// local fallback when threshold isn't fetched per-request.
const FAR_THRESHOLD_M = 500;

interface StaffEntry {
  id: string; name: string; role: string; active: boolean;
  attendance_exempt?: boolean;
}

interface PlanDay { date: string; label: string; short: string; isToday: boolean; isTomorrow: boolean; }

// ── Constants ──────────────────────────────────────────────────────────────────
const LOG_STATUS_LABEL: Record<LogStatus, string> = { normal: "רגיל ✓", delay: "עיכוב ⚠️", problem: "בעיה 🔴" };
const LOG_STATUS_BTN: Record<LogStatus, string>   = {
  normal:  "border-green-400 text-green-700 bg-green-50",
  delay:   "border-amber-400 text-amber-700 bg-amber-50",
  problem: "border-red-400   text-red-700   bg-red-50",
};
const TASK_STATUS_CLS: Record<string, string> = {
  planned:     "bg-charcoal/5 text-charcoal/50",
  in_progress: "bg-amber-50 text-amber-700",
  delayed:     "bg-red-50 text-red-600",
  completed:   "bg-green-50 text-green-700",
};
const TASK_STATUS_HE: Record<string, string> = {
  planned: "מתוכנן", in_progress: "בביצוע", delayed: "עיכוב", completed: "הושלם",
};
const DELAY_REASONS: { value: DelayReason; label: string }[] = [
  { value: "workers",       label: "עובדים" },
  { value: "material",      label: "חומרים" },
  { value: "weather",       label: "מזג אוויר" },
  { value: "subcontractor", label: "קבלן משנה" },
];
const EXPENSE_CATS = ["חומרים", "קבלן משנה", "הזמנות", "כלי עבודה"];
const DAYS_HE      = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function get14Days(): PlanDay[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date:      d.toISOString().slice(0, 10),
      label:     DAYS_HE[d.getDay()],
      short:     d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }),
      isToday:   i === 0,
      isTomorrow: i === 1,
    };
  });
}

function hasReadinessIssue(t: Task): boolean {
  return !t.material_ready || !t.sub_confirmed || !t.equipment_on_site;
}

function milestoneProgress(ms: Milestone, tasks: Task[]): number {
  const msTasks = tasks.filter(t => t.milestone_id === ms.id);
  if (!msTasks.length) return 0;
  return Math.round(msTasks.filter(t => t.status === "completed").length / msTasks.length * 100);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ForemanPortal({
  staffId, foremanName, onLogout,
}: {
  staffId: string; foremanName: string; onLogout: () => void;
}) {
  const today    = todayStr();
  const tomorrow = offsetDate(1);
  const feedback = useFeedback();
  const planDays = get14Days();

  const [view,     setView]     = useState<View>("loading");
  const [tab,      setTab]      = useState<Tab>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project,  setProject]  = useState<Project | null>(null);

  // Data
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [onSite,     setOnSite]     = useState<OnSiteEntry[]>([]);
  const [pending,    setPending]    = useState<PendingRecord[]>([]);
  const [allStaff,   setAllStaff]   = useState<StaffEntry[]>([]);
  const [arrivedTodayIds, setArrivedTodayIds] = useState<Set<string>>(new Set());
  const [weeklyBurn, setWeeklyBurn] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);

  // Site
  const [clockOutLoading, setClockOutLoading] = useState<string | null>(null);
  const [pendingLoading,  setPendingLoading]  = useState<string | null>(null);

  // Daily log
  const [logId,     setLogId]     = useState<string | null>(null);
  const [logText,   setLogText]   = useState("");
  const [logStatus, setLogStatus] = useState<LogStatus>("normal");
  const [logSub,    setLogSub]    = useState("0");
  const [logSaving, setLogSaving] = useState(false);
  const [logMsg,    setLogMsg]    = useState("");

  // Expense
  const [expAmount, setExpAmount] = useState("");
  const [expCat,    setExpCat]    = useState("חומרים");
  const [expDesc,   setExpDesc]   = useState("");
  const [expSaving, setExpSaving] = useState(false);
  const [expMsg,    setExpMsg]    = useState("");

  // Hours report
  const [hoursRows,    setHoursRows]    = useState<{ staff_name: string; date: string; entry: string; exit: string; hours: number | null; project: string }[]>([]);
  const [hoursSummary, setHoursSummary] = useState<{ name: string; days: number; hours: number }[]>([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursLoaded,  setHoursLoaded]  = useState(false);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  // Plan — add task form
  const [newTaskDate,  setNewTaskDate]  = useState(today);
  const [newTaskMs,    setNewTaskMs]    = useState("");
  const [newTaskDesc,  setNewTaskDesc]  = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [taskSaving,   setTaskSaving]   = useState(false);
  const [taskMsg,      setTaskMsg]      = useState("");

  // Plan — UI state
  const [expandedDay,   setExpandedDay]   = useState<string | null>(today);
  const [msFilter,      setMsFilter]      = useState<string>("all"); // "all" or milestone id
  const [msExpanded,    setMsExpanded]    = useState(true);
  const [showDelayFor,  setShowDelayFor]  = useState<string | null>(null); // task id
  const [moveTaskId,    setMoveTaskId]    = useState<string | null>(null);
  const [addTaskForDay, setAddTaskForDay] = useState<string | null>(null);

  // ── Load projects ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/projects")
      .then(r => r.json())
      .then(d => {
        const active = (d.projects ?? []).filter((p: Project) => p.status !== "inactive");
        setProjects(active);
        if (active.length === 0)      setView("no_projects");
        else if (active.length === 1) selectProject(active[0]);
        else                          setView("select");
      })
      .catch(() => setView("no_projects"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load dashboard data ────────────────────────────────────────────────────
  const loadDashboard = useCallback(async (projectId: string) => {
    setDataLoading(true);
    try {
      const [attRes, matRes, tasksRes, msRes, logRes, pendingRes, staffRes] = await Promise.allSettled([
        fetch("/api/admin/attendance/today"),
        fetch(`/api/admin/materials?project_id=${projectId}`),
        fetch(`/api/admin/tasks?project_id=${projectId}`),
        fetch(`/api/admin/milestones?project_id=${projectId}`),
        fetch(`/api/admin/daily-reports?project_id=${projectId}&date=${today}`),
        fetch("/api/admin/attendance/pending"),
        fetch("/api/admin/staff"),
      ]);

      // On-site workers (this project only, last action = in)
      // Also: collect all staff IDs who had any "in" today (for missing-workers calculation)
      if (attRes.status === "fulfilled" && attRes.value.ok) {
        const d = await attRes.value.json();
        const seen = new Set<string>();
        const arrived = new Set<string>();
        const workers: OnSiteEntry[] = [];
        for (const rec of (d.records ?? [])) {
          if (rec.project?.id !== projectId) continue;
          const sid = rec.staff?.id;
          if (!sid) continue;
          if (rec.action === "in" || rec.action === "כניסה") arrived.add(sid);
          if (seen.has(sid)) continue;
          seen.add(sid);
          if (rec.action === "in" || rec.action === "כניסה") {
            const t = rec.clock_at
              ? new Date(rec.clock_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })
              : new Date(rec.recorded_at ?? rec.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
            workers.push({
              att_id: rec.id, staff_id: sid,
              name: rec.staff?.name ?? "—",
              entry_time: t,
              lat: rec.lat ?? null,
              lng: rec.lng ?? null,
              distance_from_project_m: rec.distance_from_project_m ?? null,
            });
          }
        }
        setOnSite(workers);
        setArrivedTodayIds(arrived);
      }

      // Pending manual entries (scope to this project)
      if (pendingRes.status === "fulfilled" && pendingRes.value.ok) {
        const d = await pendingRes.value.json();
        setPending((d.records ?? []).filter((r: PendingRecord) => r.project?.id === projectId));
      }

      // Staff list (for missing-workers calculation)
      if (staffRes.status === "fulfilled" && staffRes.value.ok) {
        const d = await staffRes.value.json();
        // attendance_exempt workers (managers on global salary, etc.) aren't
        // expected to clock in, so they don't belong in the foreman's
        // "missing today" sweep — exclude here at fetch time.
        setAllStaff((d.staff ?? []).filter((s: StaffEntry) =>
          s.active && s.role === "עובד" && !s.attendance_exempt
        ));
      }

      // Weekly burn
      if (matRes.status === "fulfilled" && matRes.value.ok) {
        const d = await matRes.value.json();
        const ws = getWeekStart();
        const total = (d.materials ?? [])
          .filter((m: { received_at: string | null; cost: number | null }) => (m.received_at ?? "") >= ws)
          .reduce((s: number, m: { cost: number | null }) => s + (m.cost ?? 0), 0);
        setWeeklyBurn(total);
      }

      // Tasks
      if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
        const d = await tasksRes.value.json();
        setTasks(d.tasks ?? []);
      }

      // Milestones
      if (msRes.status === "fulfilled" && msRes.value.ok) {
        const d = await msRes.value.json();
        setMilestones(d.milestones ?? []);
      }

      // Today's log
      if (logRes.status === "fulfilled" && logRes.value.ok) {
        const d = await logRes.value.json();
        const rep = d.reports?.[0] ?? null;
        if (rep) {
          setLogId(rep.id); setLogText(rep.summary ?? "");
          setLogStatus((rep.status as LogStatus) ?? "normal");
          setLogSub(String(rep.subcontractor_count ?? 0));
        } else { setLogId(null); setLogText(""); setLogStatus("normal"); setLogSub("0"); }
      }
    } finally { setDataLoading(false); }
  }, [today]);

  function selectProject(p: Project) {
    setProject(p); setView("dashboard"); loadDashboard(p.id);
  }

  async function loadHours() {
    if (hoursLoading) return;
    setHoursLoading(true);
    try {
      const from = new Date(Date.now() - 27 * 86_400_000).toISOString().slice(0, 10);
      const to   = today;
      const res  = await fetch(`/api/admin/attendance/report?from=${from}&to=${to}`);
      if (!res.ok) return;
      const d = await res.json();
      setHoursRows(d.rows ?? []);
      setHoursSummary(d.summary ?? []);
      setHoursLoaded(true);
    } finally { setHoursLoading(false); }
  }

  // ── Task helpers ───────────────────────────────────────────────────────────
  async function patchTask(id: string, body: object) {
    const res = await fetch(`/api/admin/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...d.task } : t));
    }
    return res.ok;
  }

  async function handleToggleReadiness(task: Task, field: "material_ready" | "sub_confirmed" | "equipment_on_site") {
    await patchTask(task.id, { [field]: !task[field] });
  }

  async function handleSetStatus(id: string, status: string, delayReason?: DelayReason) {
    const body: Record<string, unknown> = { status };
    if (status === "delayed" && delayReason) body.delay_reason = delayReason;
    const ok = await patchTask(id, body);
    if (ok) { feedback.success(); setShowDelayFor(null); }
    else      feedback.error();
  }

  async function handleMoveTask(taskId: string, newDate: string) {
    const ok = await patchTask(taskId, { start_date: newDate, end_date: newDate });
    if (ok) { feedback.success(); setMoveTaskId(null); }
    else      feedback.error();
  }

  async function handleAddTask(date: string) {
    if (!project || !newTaskDesc.trim()) return;
    setTaskSaving(true); setTaskMsg("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id:  project.id,
          task_name:   newTaskDesc.trim(),
          milestone_id: newTaskMs || null,
          notes:       newTaskNotes.trim() || null,
          start_date:  date,
          end_date:    date,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        feedback.success();
        setTaskMsg("✓ משימה נוספה");
        setTasks(prev => [...prev, data.task]);
        setNewTaskDesc(""); setNewTaskNotes(""); setNewTaskMs("");
        setAddTaskForDay(null);
        setExpandedDay(date);
      } else {
        feedback.error();
        setTaskMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch { feedback.error(); setTaskMsg("שגיאת רשת"); }
    finally { setTaskSaving(false); }
  }

  // ── Site clock-out ─────────────────────────────────────────────────────────
  async function handleClockOut(worker: OnSiteEntry) {
    setClockOutLoading(worker.staff_id);
    try {
      const res = await fetch("/api/admin/attendance/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: worker.staff_id, project_id: project!.id }),
      });
      if (res.ok) { feedback.success(); setOnSite(prev => prev.filter(w => w.staff_id !== worker.staff_id)); }
      else feedback.error();
    } catch { feedback.error(); }
    finally { setClockOutLoading(null); }
  }

  async function handlePendingDecision(rec: PendingRecord, status: "approved" | "rejected") {
    setPendingLoading(rec.id);
    try {
      const res = await fetch(`/api/admin/attendance/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        feedback.success();
        setPending(prev => prev.filter(p => p.id !== rec.id));
        if (status === "approved" && project) loadDashboard(project.id);
      } else {
        feedback.error();
      }
    } catch { feedback.error(); }
    finally { setPendingLoading(null); }
  }

  // ── Log ────────────────────────────────────────────────────────────────────
  async function handleSaveLog() {
    if (!project || !logText.trim()) return;
    setLogSaving(true); setLogMsg("");
    try {
      const url = logId ? `/api/admin/daily-reports/${logId}` : "/api/admin/daily-reports";
      const res = await fetch(url, {
        method: logId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id, date: today, summary: logText.trim(), status: logStatus, subcontractor_count: parseInt(logSub) || 0 }),
      });
      const data = await res.json();
      if (res.ok) { feedback.success(); setLogMsg("✓ יומן נשמר"); if (!logId && data.report?.id) setLogId(data.report.id); }
      else         { feedback.error();   setLogMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch { feedback.error(); setLogMsg("שגיאת רשת"); }
    finally { setLogSaving(false); }
  }

  // ── Expense ────────────────────────────────────────────────────────────────
  async function handleSaveExpense() {
    if (!project || !expAmount || !expDesc.trim()) return;
    setExpSaving(true); setExpMsg("");
    try {
      const res = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id, material_name: expDesc.trim(), category: expCat, quantity: 1, unit: "יחידות", cost: parseFloat(expAmount) }),
      });
      const data = await res.json();
      if (res.ok) { feedback.success(); setExpMsg("✓ הוצאה נרשמה"); setExpAmount(""); setExpDesc(""); setWeeklyBurn(b => b + (parseFloat(expAmount) || 0)); }
      else         { feedback.error();   setExpMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch { feedback.error(); setExpMsg("שגיאת רשת"); }
    finally { setExpSaving(false); }
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const activeTasks   = tasks.filter(t => t.status !== "completed");
  const todayTasks    = tasks.filter(t => t.start_date === today   && t.status !== "completed");
  const tomorrowTasks = tasks.filter(t => t.start_date === tomorrow && t.status !== "completed");
  const redAlerts     = activeTasks.filter(t => t.status === "delayed" || hasReadinessIssue(t));

  const filteredByMs  = (dayDate: string) =>
    tasks.filter(t =>
      t.start_date === dayDate &&
      t.status !== "completed" &&
      (msFilter === "all" || t.milestone_id === msFilter)
    );

  // ── Render helpers ─────────────────────────────────────────────────────────
  function ReadinessToggle({ task, field, icon, label }: {
    task: Task;
    field: "material_ready" | "sub_confirmed" | "equipment_on_site";
    icon: React.ReactNode;
    label: string;
  }) {
    const on = task[field];
    return (
      <button
        onClick={() => handleToggleReadiness(task, field)}
        title={label}
        className={`flex items-center gap-1 px-2 py-1 border text-[0.75rem] font-semibold transition-all active:scale-95 ${
          on ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-600"
        }`}
      >
        {icon}
        {on ? "✓" : "✗"}
      </button>
    );
  }

  function TaskCard({ task }: { task: Task }) {
    const isDelayed    = task.status === "delayed";
    const hasIssue     = hasReadinessIssue(task) && task.status !== "completed";
    const showingDelay = showDelayFor === task.id;
    const ms           = milestones.find(m => m.id === task.milestone_id);

    return (
      <div className={`border-s-2 ps-3 py-2.5 space-y-2 ${
        isDelayed ? "border-red-400" : hasIssue ? "border-amber-400" : "border-charcoal/10"
      }`}>
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-charcoal">{task.task_name}</span>
              {(isDelayed || hasIssue) && (
                <AlertTriangle size={13} strokeWidth={2} className={isDelayed ? "text-red-500" : "text-amber-500"} />
              )}
            </div>
            {ms && (
              <span className="text-[0.58rem] text-accent/80 font-semibold uppercase tracking-wide">{ms.name}</span>
            )}
            {isDelayed && task.delay_reason && (
              <span className="text-[0.75rem] text-red-500 block">
                עיכוב: {DELAY_REASONS.find(d => d.value === task.delay_reason)?.label}
              </span>
            )}
            {task.notes && <p className="text-[0.62rem] text-charcoal/40 mt-0.5">{task.notes}</p>}
          </div>
          <span className={`text-[0.58rem] px-1.5 py-0.5 shrink-0 ${TASK_STATUS_CLS[task.status] ?? ""}`}>
            {TASK_STATUS_HE[task.status] ?? task.status}
          </span>
        </div>

        {/* Readiness toggles */}
        {task.status !== "completed" && (
          <div className="flex gap-1.5">
            <ReadinessToggle task={task} field="material_ready"   icon={<Package   size={10} strokeWidth={1.8} />} label="חומרים מוכנים" />
            <ReadinessToggle task={task} field="sub_confirmed"    icon={<Users     size={10} strokeWidth={1.8} />} label="קבלן אושר" />
            <ReadinessToggle task={task} field="equipment_on_site" icon={<Wrench   size={10} strokeWidth={1.8} />} label="ציוד באתר" />
          </div>
        )}

        {/* Action buttons */}
        {task.status !== "completed" && !showingDelay && (
          <div className="flex gap-1.5 flex-wrap">
            {task.status === "planned" && (
              <button onClick={() => handleSetStatus(task.id, "in_progress")}
                className="text-[0.75rem] border border-amber-300 px-2.5 py-1 text-amber-700 hover:bg-amber-50 active:scale-95 transition-all">
                ▶ הפעל
              </button>
            )}
            {task.status !== "delayed" && (
              <button onClick={() => setShowDelayFor(task.id)}
                className="text-[0.75rem] border border-red-200 px-2.5 py-1 text-red-500 hover:bg-red-50 active:scale-95 transition-all">
                ⏸ עיכוב
              </button>
            )}
            {task.status === "delayed" && (
              <button onClick={() => handleSetStatus(task.id, "in_progress")}
                className="text-[0.75rem] border border-amber-300 px-2.5 py-1 text-amber-700 hover:bg-amber-50 active:scale-95 transition-all">
                ▶ חדש לביצוע
              </button>
            )}
            <button onClick={() => handleSetStatus(task.id, "completed")}
              className="text-[0.75rem] border border-green-300 px-2.5 py-1 text-green-700 hover:bg-green-50 active:scale-95 transition-all flex items-center gap-1">
              <Check size={11} strokeWidth={2.5} /> סיים
            </button>
            <button onClick={() => setMoveTaskId(task.id)}
              title="הזז לתאריך אחר"
              className="text-[0.75rem] border border-charcoal/15 px-2.5 py-1 text-charcoal/50 hover:border-accent hover:text-accent active:scale-95 transition-all flex items-center gap-1">
              <ArrowLeftRight size={10} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Delay reason form */}
        {showingDelay && (
          <div className="flex gap-2 items-center">
            <select
              className="flex-1 border border-red-200 bg-red-50 text-red-700 text-xs px-2 py-1.5 focus:outline-none focus:border-red-400"
              defaultValue=""
              onChange={e => {
                if (e.target.value) handleSetStatus(task.id, "delayed", e.target.value as DelayReason);
              }}
            >
              <option value="" disabled>בחר סיבת עיכוב...</option>
              {DELAY_REASONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <button onClick={() => setShowDelayFor(null)} className="text-charcoal/30 hover:text-charcoal/60">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Screens ────────────────────────────────────────────────────────────────
  if (view === "loading") return (
    <div className="min-h-screen bg-bone flex items-center justify-center">
      <Loader2 size={32} strokeWidth={1.5} className="text-accent animate-spin" />
    </div>
  );

  if (view === "no_projects") return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center gap-5 p-8 text-center" dir="rtl">
      <AlertCircle size={52} strokeWidth={1} className="text-charcoal/20" />
      <div>
        <p className="font-heading text-xl font-bold text-charcoal">אין פרויקטים מוקצים</p>
        <p className="text-sm text-charcoal/50 mt-1">פנה למנהל לשיוך פרויקט לחשבונך</p>
      </div>
      <button onClick={onLogout} className="text-xs text-charcoal/30 underline underline-offset-2">יציאה</button>
    </div>
  );

  if (view === "select") return (
    <div className="min-h-screen bg-bone flex flex-col" dir="rtl">
      <div className="bg-charcoal px-5 pt-12 pb-7 text-white relative">
        <button
          onClick={onLogout}
          className="absolute top-12 end-5 flex items-center gap-1.5 border border-white/25 text-white/70 hover:text-white hover:border-white/60 transition-colors px-3 py-1.5 text-[0.7rem] tracking-wide"
        >
          <LogOut size={12} strokeWidth={1.5} />
          <span>התנתקות</span>
        </button>
        <p className="text-[0.75rem] tracking-widest uppercase text-white/35 mb-1">בניין איתן · ממשק ממונה</p>
        <h1 className="font-heading text-2xl font-bold">שלום, {foremanName}</h1>
        <p className="text-sm text-white/45 mt-1">בחר פרויקט להמשך</p>
      </div>
      <div className="flex-1 p-4 space-y-3">
        {projects.map(p => (
          <button key={p.id} onClick={() => selectProject(p)}
            className="w-full bg-white border border-warm-gray-light p-5 text-start flex items-center justify-between hover:border-accent transition-colors active:scale-[0.98]">
            <div>
              <p className="font-heading text-base font-bold text-charcoal">{p.name}</p>
              <p className="text-xs text-charcoal/35 mt-0.5">לחץ לכניסה לפרויקט</p>
            </div>
            <ChevronRight size={20} strokeWidth={1.5} className="text-charcoal/25 shrink-0" />
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="pb-10 text-center text-xs text-charcoal/25 underline underline-offset-2">
        יציאה מהמערכת
      </button>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const hasLogToday = !!logId || !!logText;

  return (
    <div className="min-h-screen bg-bone flex flex-col" dir="rtl">

      {/* Header */}
      <header className="bg-charcoal text-white px-4 pt-10 pb-4 sticky top-0 z-30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[0.7rem] tracking-widest uppercase text-white/30 mb-0.5">ממשק ממונה · {foremanName}</p>
            <h1 className="font-heading text-lg font-bold text-white leading-tight truncate">{project!.name}</h1>
          </div>
          <div className="shrink-0 text-end">
            <div className="flex items-center justify-end gap-1 text-white/30 text-[0.7rem] uppercase mb-0.5">
              <Flame size={9} /><span>הוצאות שבועיות</span>
            </div>
            <p className="font-heading text-xl font-bold text-accent tabular-nums">
              ₪{Math.round(weeklyBurn).toLocaleString("he-IL")}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <button onClick={() => loadDashboard(project!.id)}
            className="flex items-center gap-1 text-[0.75rem] text-white/25 hover:text-white/50 transition-colors">
            <RefreshCw size={10} strokeWidth={1.5} className={dataLoading ? "animate-spin" : ""} />
            <span>רענן</span>
          </button>
          {projects.length > 1 && (
            <button onClick={() => setView("select")} className="text-[0.75rem] text-white/25 hover:text-white/50">החלף פרויקט</button>
          )}
          <button onClick={onLogout} className="flex items-center gap-1 text-[0.75rem] text-white/25 hover:text-white/50">
            <LogOut size={10} strokeWidth={1.5} /><span>יציאה</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="p-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "באתר כעת",    value: onSite.length,     color: "text-green-600", go: "site"    as Tab },
                { label: "משימות היום", value: todayTasks.length,  color: "text-accent",    go: "plan"    as Tab },
                { label: "התראות",       value: redAlerts.length,   color: redAlerts.length ? "text-red-500" : "text-charcoal/25", go: "plan" as Tab },
              ].map(s => (
                <button key={s.label} onClick={() => setTab(s.go)}
                  className="bg-white border border-warm-gray-light p-3 text-center active:scale-95 transition-transform">
                  <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[0.75rem] text-charcoal/40 mt-0.5 leading-tight">{s.label}</div>
                </button>
              ))}
            </div>

            {/* Today's Focus */}
            <div className="bg-white border border-warm-gray-light">
              <div className="px-4 py-3 border-b border-charcoal/5 flex items-center justify-between">
                <p className="font-heading text-sm font-bold text-charcoal flex items-center gap-1.5">
                  <Target size={14} strokeWidth={2} className="text-accent" />
                  המיקוד של היום
                </p>
                <span className="text-[0.75rem] text-accent font-semibold">{new Date().toLocaleDateString("he-IL", { weekday: "long" })}</span>
              </div>
              {todayTasks.length === 0 ? (
                <p className="text-sm text-charcoal/30 text-center py-4">אין משימות מתוכננות להיום</p>
              ) : (
                <div className="divide-y divide-charcoal/5 px-4">
                  {todayTasks.map(t => (
                    <div key={t.id} className="py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{t.task_name}</p>
                          {hasReadinessIssue(t) && <AlertTriangle size={12} strokeWidth={2} className="text-amber-500 shrink-0" />}
                        </div>
                        {milestones.find(m => m.id === t.milestone_id) && (
                          <p className="text-[0.58rem] text-accent/70 font-semibold uppercase">{milestones.find(m => m.id === t.milestone_id)?.name}</p>
                        )}
                      </div>
                      <span className={`text-[0.75rem] px-1.5 py-0.5 shrink-0 ${TASK_STATUS_CLS[t.status] ?? ""}`}>
                        {TASK_STATUS_HE[t.status] ?? ""}
                      </span>
                      {t.status !== "completed" && (
                        <button onClick={() => handleSetStatus(t.id, "completed")}
                          className="shrink-0 w-7 h-7 flex items-center justify-center border border-green-300 text-green-600 hover:bg-green-50 active:scale-95 transition-all">
                          <Check size={13} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow's Prep — only issues */}
            {tomorrowTasks.some(hasReadinessIssue) && (
              <div className="bg-amber-50 border border-amber-200">
                <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
                  <AlertTriangle size={14} strokeWidth={2} className="text-amber-600" />
                  <p className="font-heading text-sm font-bold text-amber-800">הכנה למחר — דרוש טיפול</p>
                </div>
                <div className="divide-y divide-amber-100 px-4">
                  {tomorrowTasks.filter(hasReadinessIssue).map(t => (
                    <div key={t.id} className="py-2.5">
                      <p className="text-sm font-semibold text-amber-800">{t.task_name}</p>
                      <div className="flex gap-2 mt-1">
                        {!t.material_ready    && <span className="text-[0.75rem] bg-red-100 text-red-600 px-1.5 py-0.5 flex items-center gap-0.5"><Package size={9} /> חומרים</span>}
                        {!t.sub_confirmed     && <span className="text-[0.75rem] bg-red-100 text-red-600 px-1.5 py-0.5 flex items-center gap-0.5"><Users   size={9} /> קבלן</span>}
                        {!t.equipment_on_site && <span className="text-[0.75rem] bg-red-100 text-red-600 px-1.5 py-0.5 flex items-center gap-0.5"><Wrench  size={9} /> ציוד</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab("log")}
                className="bg-charcoal text-white p-4 text-start space-y-1 active:scale-95 transition-transform">
                <ClipboardList size={22} strokeWidth={1.5} className="text-white/60" />
                <p className="font-heading text-sm font-bold mt-2">יומן יומי</p>
                <p className="text-[0.75rem] text-white/40">{hasLogToday ? "עדכן יומן" : "רשום עבודת היום"}</p>
              </button>
              <button onClick={() => setTab("expense")}
                className="bg-accent text-bone p-4 text-start space-y-1 active:scale-95 transition-transform">
                <PlusCircle size={22} strokeWidth={1.5} className="text-bone/60" />
                <p className="font-heading text-sm font-bold mt-2">הוסף הוצאה</p>
                <p className="text-[0.75rem] text-bone/50">חומרים, קבלן, הזמנות</p>
              </button>
            </div>
          </div>
        )}

        {/* ── SITE ──────────────────────────────────────────────────────── */}
        {tab === "site" && (
          <div className="p-4 space-y-5">

            {/* ── Pending approvals ───────────────────────────────────── */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="font-heading text-sm font-bold text-amber-700 flex items-center gap-1.5">
                  <AlertCircle size={14} strokeWidth={2} />
                  ממתינים לאישור ({pending.length})
                </p>
                {pending.map(rec => (
                  <div key={rec.id} className="bg-amber-50 border border-amber-200 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-charcoal text-sm">{rec.staff?.name ?? "—"}</p>
                        <div className="flex items-center gap-1 text-[0.75rem] text-charcoal/50 mt-0.5 flex-wrap">
                          <Clock size={10} strokeWidth={1.5} />
                          <span>{rec.action === "in" || rec.action === "כניסה" ? "כניסה" : "יציאה"} · {rec.timestamp_label ?? "—"}</span>
                          {(() => {
                            const d = rec.distance_from_project_m;
                            const hasCoords = !!(rec.lat && rec.lng);
                            if (d == null && !hasCoords) return null;
                            const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${rec.lat},${rec.lng}` : undefined;
                            // No distance but has coords → neutral pin
                            if (d == null) {
                              const cls = "text-[0.75rem] font-semibold px-1.5 py-0.5 bg-white text-charcoal/50 border border-charcoal/10";
                              return <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cls} title="לחץ לפתיחה במפה">📍 מפה</a>;
                            }
                            const over = d > FAR_THRESHOLD_M;
                            const label = d < 1000 ? `${d}מ׳` : `${(d / 1000).toFixed(1)}ק"מ`;
                            const cls = `text-[0.75rem] font-semibold px-1.5 py-0.5 ${over ? "bg-red-100 text-red-700 border border-red-200" : "bg-white text-charcoal/50 border border-charcoal/10"}`;
                            return mapsUrl
                              ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cls} title="לחץ לפתיחה במפה">📍 {label}</a>
                              : <span className={cls}>📍 {label}</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePendingDecision(rec, "approved")} disabled={pendingLoading === rec.id}
                        className="flex-1 border border-green-400 text-green-700 bg-white px-3 py-2.5 text-xs font-semibold hover:bg-green-50 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1">
                        {pendingLoading === rec.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} strokeWidth={2} /> אשר</>}
                      </button>
                      <button onClick={() => handlePendingDecision(rec, "rejected")} disabled={pendingLoading === rec.id}
                        className="flex-1 border border-red-300 text-red-600 bg-white px-3 py-2.5 text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1">
                        {pendingLoading === rec.id ? <Loader2 size={14} className="animate-spin" /> : <><X size={14} strokeWidth={2} /> דחה</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── On site now ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm font-bold text-charcoal flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  באתר כעת ({onSite.length})
                </p>
                <button onClick={() => loadDashboard(project!.id)} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent">
                  <RefreshCw size={12} strokeWidth={1.5} /> רענן
                </button>
              </div>
              {onSite.length === 0 ? (
                <div className="bg-white border border-warm-gray-light p-6 text-center">
                  <p className="text-xs text-charcoal/30">אין עובדים מדווחים באתר כרגע</p>
                </div>
              ) : (
                onSite.map(w => (
                  <div key={w.staff_id} className="bg-white border border-warm-gray-light px-4 py-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-charcoal text-sm">{w.name}</p>
                      <div className="flex items-center gap-2 text-[0.75rem] text-charcoal/40 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Clock size={10} strokeWidth={1.5} />כניסה: {w.entry_time}</span>
                        {(() => {
                          const d = w.distance_from_project_m;
                          const hasCoords = !!(w.lat && w.lng);
                          if (d == null && !hasCoords) return null;
                          const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${w.lat},${w.lng}` : undefined;
                          if (d == null) {
                            return <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[0.75rem] font-semibold px-1.5 py-0.5 bg-charcoal/[0.04] text-charcoal/50 border border-charcoal/10" title="לחץ לפתיחה במפה">📍 מפה</a>;
                          }
                          const over = d > FAR_THRESHOLD_M;
                          const label = d < 1000 ? `${d}מ׳` : `${(d / 1000).toFixed(1)}ק"מ`;
                          const cls = `text-[0.75rem] font-semibold px-1.5 py-0.5 ${over ? "bg-red-100 text-red-700 border border-red-200" : "bg-charcoal/[0.04] text-charcoal/50 border border-charcoal/10"}`;
                          return mapsUrl
                            ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cls} title="לחץ לפתיחה במפה">📍 {label}</a>
                            : <span className={cls}>📍 {label}</span>;
                        })()}
                      </div>
                    </div>
                    <button onClick={() => handleClockOut(w)} disabled={clockOutLoading === w.staff_id}
                      className="shrink-0 border border-red-300 text-red-600 px-4 py-2 text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all disabled:opacity-40">
                      {clockOutLoading === w.staff_id ? <Loader2 size={14} className="animate-spin" /> : "יציאה"}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* ── Didn't clock in today ───────────────────────────────── */}
            {(() => {
              const missing = allStaff.filter(s => !arrivedTodayIds.has(s.id));
              if (missing.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="font-heading text-sm font-bold text-charcoal/60 flex items-center gap-1.5">
                    <X size={14} strokeWidth={2} className="text-charcoal/40" />
                    לא החתימו היום ({missing.length})
                  </p>
                  <div className="bg-white border border-warm-gray-light divide-y divide-warm-gray-light">
                    {missing.map(s => (
                      <div key={s.id} className="px-4 py-2.5 text-sm text-charcoal/60">{s.name}</div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── LOG ───────────────────────────────────────────────────────── */}
        {tab === "log" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-bold text-charcoal">יומן עבודה יומי</p>
              <span className="text-xs text-charcoal/40">{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-2">סטטוס יום העבודה</p>
              <div className="grid grid-cols-3 gap-2">
                {(["normal", "delay", "problem"] as LogStatus[]).map(s => (
                  <button key={s} onClick={() => setLogStatus(s)}
                    className={`py-3 text-xs font-semibold border transition-all active:scale-95 ${logStatus === s ? LOG_STATUS_BTN[s] : "border-charcoal/15 text-charcoal/40 bg-white"}`}>
                    {LOG_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">תיאור עבודת היום</p>
              <AutoGrowTextarea value={logText} onChange={e => setLogText(e.target.value)} placeholder="תאר את העבודה שבוצעה היום..."
                rows={5} className="w-full border border-charcoal/15 bg-white px-3 py-3 text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" />
            </div>
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">עובדי קבלן משנה היום</p>
              <input type="number" min="0" value={logSub} onChange={e => setLogSub(e.target.value)}
                className="w-32 border border-charcoal/15 bg-white px-3 py-3 text-sm text-center font-bold focus:border-accent focus:outline-none" dir="ltr" />
            </div>
            <button onClick={handleSaveLog} disabled={logSaving || !logText.trim()}
              className="w-full bg-charcoal py-4 text-sm font-semibold tracking-wider uppercase text-white hover:bg-charcoal/80 disabled:opacity-30 transition-colors flex items-center justify-center gap-2">
              {logSaving ? <><Loader2 size={15} className="animate-spin" /> שומר...</> : <><CheckCircle2 size={15} /> שמור יומן</>}
            </button>
            {logMsg && <p className={`text-center text-sm font-semibold ${logMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{logMsg}</p>}
          </div>
        )}

        {/* ── EXPENSE ───────────────────────────────────────────────────── */}
        {tab === "expense" && (
          <div className="p-4 space-y-4">
            <p className="font-heading text-base font-bold text-charcoal">רישום הוצאה</p>
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">סכום (₪)</p>
              <div className="relative">
                <span className="absolute inset-y-0 end-3 flex items-center text-charcoal/30 font-bold text-lg pointer-events-none">₪</span>
                <input type="number" inputMode="decimal" value={expAmount} onChange={e => setExpAmount(e.target.value)}
                  placeholder="0.00" className="w-full border border-charcoal/15 bg-white pe-8 px-4 py-4 text-xl font-bold focus:border-accent focus:outline-none" dir="ltr" />
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">קטגוריה</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATS.map(c => (
                  <button key={c} onClick={() => setExpCat(c)}
                    className={`py-3 text-sm font-semibold border transition-all active:scale-95 ${expCat === c ? "border-accent bg-accent/[0.08] text-accent" : "border-charcoal/15 bg-white text-charcoal/60"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">תיאור</p>
              <AutoGrowTextarea value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="בטון, ברזל, שרברב..."
                className="w-full border border-charcoal/15 bg-white px-4 py-3.5 text-sm focus:border-accent focus:outline-none" />
            </div>
            <button onClick={handleSaveExpense} disabled={expSaving || !expAmount || !expDesc.trim()}
              className="w-full bg-accent py-4 text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-30 transition-colors flex items-center justify-center gap-2">
              {expSaving ? <><Loader2 size={15} className="animate-spin" /> שומר...</> : <><PlusCircle size={15} /> רשום הוצאה</>}
            </button>
            {expMsg && <p className={`text-center text-sm font-semibold ${expMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{expMsg}</p>}
          </div>
        )}

        {/* ── PLAN ──────────────────────────────────────────────────────── */}
        {tab === "plan" && (
          <div className="p-4 space-y-4">

            {/* ── MILESTONES section ──────────────────────────────────── */}
            <div className="bg-white border border-warm-gray-light overflow-hidden">
              <button onClick={() => setMsExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-charcoal/[0.03]">
                <div className="flex items-center gap-2">
                  <Flag size={14} strokeWidth={2} className="text-accent" />
                  <p className="font-heading text-sm font-bold text-charcoal">אבני דרך</p>
                </div>
                {msExpanded ? <ChevronDown size={14} strokeWidth={2} className="text-charcoal/40" /> : <ChevronRight size={14} strokeWidth={2} className="text-charcoal/30" />}
              </button>

              {msExpanded && (
                <div className="divide-y divide-charcoal/5">
                  {milestones.length === 0 && (
                    <p className="text-sm text-charcoal/30 text-center py-4">אין אבני דרך מוגדרות</p>
                  )}
                  {milestones.map(ms => {
                    const pct = milestoneProgress(ms, tasks);
                    const msTaskCount = tasks.filter(t => t.milestone_id === ms.id).length;
                    return (
                      <div key={ms.id} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-charcoal truncate">{ms.name}</p>
                            <p className="text-[0.75rem] text-charcoal/40">
                              {msTaskCount} משימות
                              {ms.target_date && ` · יעד: ${new Date(ms.target_date).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" })}`}
                            </p>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-accent shrink-0">{pct}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-charcoal/8 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Milestone filter chips ──────────────────────────────── */}
            {milestones.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setMsFilter("all")}
                  className={`shrink-0 text-[0.75rem] font-semibold px-3 py-1.5 border transition-colors ${msFilter === "all" ? "border-accent bg-accent/[0.08] text-accent" : "border-charcoal/15 text-charcoal/50"}`}>
                  הכל
                </button>
                {milestones.map(ms => (
                  <button key={ms.id} onClick={() => setMsFilter(ms.id)}
                    className={`shrink-0 text-[0.75rem] font-semibold px-3 py-1.5 border transition-colors whitespace-nowrap ${msFilter === ms.id ? "border-accent bg-accent/[0.08] text-accent" : "border-charcoal/15 text-charcoal/50"}`}>
                    {ms.name}
                  </button>
                ))}
              </div>
            )}

            {/* ── 14-day roll ─────────────────────────────────────────── */}
            <div className="space-y-2">
              {planDays.map(day => {
                const dayTasks    = filteredByMs(day.date);
                const allDayTasks = tasks.filter(t => t.start_date === day.date && t.status !== "completed");
                const dayRedCount = allDayTasks.filter(t => t.status === "delayed" || hasReadinessIssue(t)).length;
                const isOpen      = expandedDay === day.date;
                const isAdding    = addTaskForDay === day.date;

                return (
                  <div key={day.date} className={`bg-white border overflow-hidden ${day.isToday ? "border-accent" : day.isTomorrow ? "border-charcoal/20" : "border-warm-gray-light"}`}>
                    {/* Day header */}
                    <button onClick={() => setExpandedDay(isOpen ? null : day.date)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-start ${day.isToday ? "bg-accent/5" : ""}`}>
                      <div className="flex items-center gap-2">
                        {day.isToday && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                        <div>
                          <span className="font-heading text-sm font-bold text-charcoal">{day.label}</span>
                          <span className="text-charcoal/35 text-xs me-1.5"> · {day.short}</span>
                          {day.isToday   && <span className="text-[0.7rem] bg-accent text-bone px-1.5 py-0.5 font-semibold">היום</span>}
                          {day.isTomorrow && <span className="text-[0.7rem] bg-charcoal/80 text-bone px-1.5 py-0.5 font-semibold">מחר</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dayRedCount > 0 && (
                          <span className="text-[0.75rem] bg-red-100 text-red-600 px-1.5 py-0.5 font-bold flex items-center gap-0.5">
                            <AlertTriangle size={9} /> {dayRedCount}
                          </span>
                        )}
                        {allDayTasks.length > 0 && (
                          <span className="text-xs font-bold text-charcoal/40">{allDayTasks.length}</span>
                        )}
                        {isOpen ? <ChevronDown size={14} strokeWidth={2} className="text-charcoal/40" /> : <ChevronRight size={14} strokeWidth={2} className="text-charcoal/25" />}
                      </div>
                    </button>

                    {/* Tasks + add form */}
                    {isOpen && (
                      <div className="border-t border-charcoal/5">
                        {dayTasks.length === 0 && msFilter !== "all" && (
                          <p className="text-xs text-charcoal/30 text-center py-3">אין משימות לאבן דרך זו</p>
                        )}

                        {/* Task cards */}
                        <div className="divide-y divide-charcoal/5 px-4">
                          {dayTasks.map(t => <TaskCard key={t.id} task={t} />)}
                        </div>

                        {/* Add task button / form */}
                        <div className="px-4 py-3 bg-bone/60">
                          {!isAdding ? (
                            <button onClick={() => { setAddTaskForDay(day.date); setNewTaskDate(day.date); setNewTaskDesc(""); setNewTaskNotes(""); setNewTaskMs(""); setTaskMsg(""); }}
                              className="text-xs text-accent font-semibold flex items-center gap-1">
                              <PlusCircle size={13} strokeWidth={2} /> הוסף משימה
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <AutoGrowTextarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}
                                placeholder="תיאור המשימה..." autoFocus
                                className="w-full border border-charcoal/15 bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                              {milestones.length > 0 && (
                                <select value={newTaskMs} onChange={e => setNewTaskMs(e.target.value)}
                                  className="w-full border border-charcoal/15 bg-white text-sm px-3 py-2.5 focus:border-accent focus:outline-none">
                                  <option value="">— ללא אבן דרך —</option>
                                  {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                              )}
                              <AutoGrowTextarea value={newTaskNotes} onChange={e => setNewTaskNotes(e.target.value)}
                                placeholder="הערות (אופציונלי)"
                                className="w-full border border-charcoal/15 bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                              <div className="flex gap-2">
                                <button onClick={() => handleAddTask(day.date)} disabled={taskSaving || !newTaskDesc.trim()}
                                  className="flex-1 bg-accent text-bone py-2.5 text-xs font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1">
                                  {taskSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} הוסף
                                </button>
                                <button onClick={() => setAddTaskForDay(null)}
                                  className="border border-charcoal/15 px-4 py-2.5 text-xs text-charcoal/40 hover:border-accent transition-colors">
                                  ביטול
                                </button>
                              </div>
                              {taskMsg && <p className={`text-xs font-semibold ${taskMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{taskMsg}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HOURS ─────────────────────────────────────────────────── */}
        {tab === "hours" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-bold text-charcoal">שעות עבודה — 28 ימים אחרונים</p>
              <button onClick={loadHours} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent">
                <RefreshCw size={12} strokeWidth={1.5} className={hoursLoading ? "animate-spin" : ""} /> רענן
              </button>
            </div>

            {!hoursLoaded && !hoursLoading && (
              <button onClick={loadHours}
                className="w-full bg-charcoal text-white py-4 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Timer size={16} strokeWidth={1.5} /> טען שעות עבודה
              </button>
            )}

            {hoursLoading && (
              <div className="flex justify-center py-10">
                <Loader2 size={28} strokeWidth={1.5} className="text-accent animate-spin" />
              </div>
            )}

            {hoursLoaded && hoursSummary.length === 0 && (
              <div className="bg-white border border-warm-gray-light p-8 text-center">
                <Clock size={32} strokeWidth={1} className="text-charcoal/15 mx-auto mb-2" />
                <p className="text-sm text-charcoal/30">אין נתוני נוכחות ל-28 ימים אחרונים</p>
              </div>
            )}

            {hoursLoaded && hoursSummary.length > 0 && (
              <div className="space-y-2">
                {hoursSummary.map(worker => {
                  const isOpen = expandedWorker === worker.name;
                  const workerRows = hoursRows.filter(r => r.staff_name === worker.name);
                  return (
                    <div key={worker.name} className="bg-white border border-warm-gray-light overflow-hidden">
                      {/* Worker summary row */}
                      <button
                        onClick={() => setExpandedWorker(isOpen ? null : worker.name)}
                        className="w-full flex items-center justify-between px-4 py-4 text-start"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-accent">{worker.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-charcoal text-sm">{worker.name}</p>
                            <p className="text-[0.62rem] text-charcoal/40">{worker.days} ימי עבודה</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-end">
                            <p className="font-heading text-lg font-bold text-accent tabular-nums">{worker.hours.toFixed(1)}</p>
                            <p className="text-[0.58rem] text-charcoal/35">שעות</p>
                          </div>
                          {isOpen
                            ? <ChevronDown size={14} strokeWidth={2} className="text-charcoal/30" />
                            : <ChevronRight size={14} strokeWidth={2} className="text-charcoal/20" />}
                        </div>
                      </button>

                      {/* Daily rows */}
                      {isOpen && (
                        <div className="border-t border-charcoal/5">
                          {/* Header */}
                          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-bone/60 text-[0.58rem] font-semibold text-charcoal/40 uppercase tracking-wide">
                            <span>תאריך</span>
                            <span className="text-center">כניסה</span>
                            <span className="text-center">יציאה</span>
                            <span className="text-end">שעות</span>
                          </div>
                          <div className="divide-y divide-charcoal/5">
                            {workerRows.map((row, i) => (
                              <div key={i} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center">
                                <span className="text-xs text-charcoal/60 tabular-nums">{row.date}</span>
                                <span className="text-xs font-semibold text-green-700 text-center tabular-nums">{row.entry || "—"}</span>
                                <span className="text-xs font-semibold text-red-600 text-center tabular-nums">{row.exit || "—"}</span>
                                <span className="text-xs font-bold text-charcoal text-end tabular-nums">
                                  {row.hours !== null ? row.hours.toFixed(1) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Grand total */}
                <div className="bg-charcoal text-white px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">סה&quot;כ תקופה</span>
                  <span className="font-heading text-xl font-bold text-accent tabular-nums">
                    {hoursSummary.reduce((s, w) => s + w.hours, 0).toFixed(1)} שעות
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── Move-task bottom sheet ─────────────────────────────────────── */}
      {moveTaskId && (
        <div className="fixed inset-0 z-50 flex items-end" dir="rtl" onClick={() => setMoveTaskId(null)}>
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-[2px]" />
          <div className="relative w-full bg-white p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-bold text-charcoal flex items-center gap-2">
                <Calendar size={15} strokeWidth={2} className="text-accent" /> הזז משימה לתאריך
              </p>
              <button onClick={() => setMoveTaskId(null)} className="text-charcoal/30 hover:text-charcoal/60">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {planDays.map(day => (
                <button key={day.date} onClick={() => handleMoveTask(moveTaskId, day.date)}
                  className={`py-2.5 text-center border text-[0.75rem] font-semibold active:scale-95 transition-all ${
                    day.isToday   ? "border-accent bg-accent/[0.08] text-accent"  :
                    day.isTomorrow ? "border-charcoal/25 bg-charcoal/5 text-charcoal" :
                    "border-charcoal/10 text-charcoal/50 hover:border-accent hover:text-accent"
                  }`}>
                  <div>{day.label.slice(0, 2)}</div>
                  <div className="text-[0.7rem] mt-0.5 opacity-70">{day.short}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom tab bar ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-charcoal/10 flex z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {([
          { key: "overview" as Tab, icon: <Home size={20} strokeWidth={1.8} />,          label: "ראשי",  dot: todayTasks.length > 0 || redAlerts.length > 0 },
          { key: "site"     as Tab, icon: <Users size={20} strokeWidth={1.8} />,         label: "באתר",  dot: onSite.length > 0 || pending.length > 0 },
          { key: "log"      as Tab, icon: <ClipboardList size={20} strokeWidth={1.8} />, label: "יומן",  dot: hasLogToday },
          { key: "expense"  as Tab, icon: <PlusCircle size={20} strokeWidth={1.8} />,    label: "הוצאה", dot: false },
          { key: "plan"     as Tab, icon: <Calendar size={20} strokeWidth={1.8} />,      label: "תכנון", dot: redAlerts.length > 0 },
          { key: "hours"    as Tab, icon: <Timer    size={20} strokeWidth={1.8} />,      label: "שעות",  dot: false },
        ] as { key: Tab; icon: React.ReactNode; label: string; dot: boolean }[]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "hours" && !hoursLoaded) loadHours(); }}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors active:scale-95 ${
              tab === t.key ? "text-accent" : "text-charcoal/30"
            }`}>
            {t.dot && <span className="absolute top-2 right-1/2 translate-x-3.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
            {t.icon}
            <span className="text-[0.58rem] font-semibold">{t.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
