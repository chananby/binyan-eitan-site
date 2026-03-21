"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Home, Users, ClipboardList, PlusCircle, Calendar,
  ChevronRight, RefreshCw, Loader2, AlertCircle,
  LogOut, CheckCircle2, Clock, Flame, ChevronDown,
  Check,
} from "lucide-react";
import { useFeedback } from "../hooks/useFeedback";

// ── Types ──────────────────────────────────────────────────────────────────────
type View     = "loading" | "no_projects" | "select" | "dashboard";
type Tab      = "overview" | "site" | "log" | "expense" | "plan";
type LogStatus = "normal" | "delay" | "problem";

interface Project     { id: string; name: string; status?: string; }
interface OnSiteEntry { att_id: string; staff_id: string; name: string; entry_time: string; }
interface DayTask     {
  id: string; task_name: string; status: string;
  start_date: string | null; end_date: string | null; notes: string | null;
}
interface WeekDay { date: string; label: string; short: string; isToday: boolean; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<LogStatus, string> = { normal: "רגיל ✓", delay: "עיכוב ⚠️", problem: "בעיה 🔴" };
const STATUS_BTN: Record<LogStatus, string>   = {
  normal:  "border-green-400  text-green-700  bg-green-50",
  delay:   "border-amber-400  text-amber-700  bg-amber-50",
  problem: "border-red-400    text-red-700    bg-red-50",
};
const TASK_STATUS_CLS: Record<string, string> = {
  planned:     "bg-charcoal/5 text-charcoal/50",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-green-50 text-green-700",
};
const TASK_STATUS_HE: Record<string, string> = {
  planned: "מתוכנן", in_progress: "בביצוע", completed: "הושלם",
};
const EXPENSE_CATS = ["חומרים", "קבלן משנה", "הזמנות", "כלי עבודה"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getLookAheadDays(): WeekDay[] {
  const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      date:    d.toISOString().slice(0, 10),
      label:   DAYS_HE[d.getDay()],
      short:   d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }),
      isToday: i === 0,
    };
  });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ForemanPortal({
  staffId, foremanName, onLogout,
}: {
  staffId: string; foremanName: string; onLogout: () => void;
}) {
  const today    = todayStr();
  const feedback = useFeedback();

  const [view,    setView]    = useState<View>("loading");
  const [tab,     setTab]     = useState<Tab>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project,  setProject]  = useState<Project | null>(null);

  // Site
  const [onSite,          setOnSite]          = useState<OnSiteEntry[]>([]);
  const [clockOutLoading, setClockOutLoading] = useState<string | null>(null);

  // Daily log
  const [logId,      setLogId]      = useState<string | null>(null);
  const [logText,    setLogText]    = useState("");
  const [logStatus,  setLogStatus]  = useState<LogStatus>("normal");
  const [logSub,     setLogSub]     = useState("0");
  const [logSaving,  setLogSaving]  = useState(false);
  const [logMsg,     setLogMsg]     = useState("");

  // Expense
  const [expAmount,  setExpAmount]  = useState("");
  const [expCat,     setExpCat]     = useState("חומרים");
  const [expDesc,    setExpDesc]    = useState("");
  const [expSaving,  setExpSaving]  = useState(false);
  const [expMsg,     setExpMsg]     = useState("");

  // Plan
  const [weekTasks,   setWeekTasks]   = useState<Record<string, DayTask[]>>({});
  const [newTaskDate, setNewTaskDate] = useState(today);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [taskSaving,  setTaskSaving]  = useState(false);
  const [taskMsg,     setTaskMsg]     = useState("");
  const [expandedDay, setExpandedDay] = useState<string | null>(today);

  // Overview
  const [weeklyBurn,  setWeeklyBurn]  = useState(0);
  const [todayTasks,  setTodayTasks]  = useState<DayTask[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const weekDays = getLookAheadDays();

  // ── Load projects ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/projects")
      .then(r => r.json())
      .then(d => {
        const active = (d.projects ?? []).filter((p: Project) => p.status !== "inactive");
        setProjects(active);
        if (active.length === 0) setView("no_projects");
        else if (active.length === 1) selectProject(active[0]);
        else setView("select");
      })
      .catch(() => setView("no_projects"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load dashboard data ────────────────────────────────────────────────────
  const loadDashboard = useCallback(async (projectId: string) => {
    setDataLoading(true);
    try {
      const [attRes, matRes, tasksRes, logRes] = await Promise.allSettled([
        fetch("/api/admin/attendance/today"),
        fetch(`/api/admin/materials?project_id=${projectId}`),
        fetch(`/api/admin/tasks?project_id=${projectId}`),
        fetch(`/api/admin/daily-reports?project_id=${projectId}&date=${today}`),
      ]);

      // On-site: latest action per worker, this project, last = "in"
      if (attRes.status === "fulfilled" && attRes.value.ok) {
        const d = await attRes.value.json();
        const seen = new Set<string>();
        const workers: OnSiteEntry[] = [];
        for (const rec of (d.records ?? [])) {
          if (rec.project?.id !== projectId) continue;
          const sid = rec.staff?.id;
          if (!sid || seen.has(sid)) continue;
          seen.add(sid);
          if (rec.action === "in" || rec.action === "כניסה") {
            const t = rec.timestamp_label
              ? (rec.timestamp_label.split(" ")[1] ?? rec.timestamp_label)
              : new Date(rec.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
            workers.push({ att_id: rec.id, staff_id: sid, name: rec.staff?.name ?? "—", entry_time: t });
          }
        }
        setOnSite(workers);
      }

      // Weekly burn from materials
      if (matRes.status === "fulfilled" && matRes.value.ok) {
        const d = await matRes.value.json();
        const weekStart = getWeekStart();
        const total = (d.materials ?? [])
          .filter((m: { created_at: string; cost: number | null }) => m.created_at >= weekStart)
          .reduce((s: number, m: { cost: number | null }) => s + (m.cost ?? 0), 0);
        setWeeklyBurn(total);
      }

      // Tasks: organize by start_date
      if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
        const d = await tasksRes.value.json();
        const byDate: Record<string, DayTask[]> = {};
        const todayList: DayTask[] = [];
        for (const t of (d.tasks ?? [])) {
          if (t.status === "completed") continue;
          const date = t.start_date;
          if (date) {
            byDate[date] = [...(byDate[date] ?? []), t];
            if (date === today) todayList.push(t);
          }
        }
        setWeekTasks(byDate);
        setTodayTasks(todayList);
      }

      // Today's daily log
      if (logRes.status === "fulfilled" && logRes.value.ok) {
        const d = await logRes.value.json();
        const rep = d.reports?.[0] ?? null;
        if (rep) {
          setLogId(rep.id);
          setLogText(rep.summary ?? "");
          setLogStatus((rep.status as LogStatus) ?? "normal");
          setLogSub(String(rep.subcontractor_count ?? 0));
        } else {
          setLogId(null);
          setLogText("");
          setLogStatus("normal");
          setLogSub("0");
        }
      }
    } finally {
      setDataLoading(false);
    }
  }, [today]);

  function selectProject(p: Project) {
    setProject(p);
    setView("dashboard");
    loadDashboard(p.id);
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  async function handleClockOut(worker: OnSiteEntry) {
    setClockOutLoading(worker.staff_id);
    try {
      const res = await fetch("/api/admin/attendance/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: worker.staff_id, project_id: project!.id }),
      });
      if (res.ok) { feedback.success(); loadDashboard(project!.id); }
      else feedback.error();
    } catch { feedback.error(); }
    finally { setClockOutLoading(null); }
  }

  async function handleSaveLog() {
    if (!project || !logText.trim()) return;
    setLogSaving(true); setLogMsg("");
    try {
      const method = logId ? "PATCH" : "POST";
      const url    = logId
        ? `/api/admin/daily-reports/${logId}`
        : "/api/admin/daily-reports";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id:         project.id,
          date:               today,
          summary:            logText.trim(),
          status:             logStatus,
          subcontractor_count: parseInt(logSub) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        feedback.success();
        setLogMsg("✓ יומן נשמר");
        if (!logId && data.report?.id) setLogId(data.report.id);
      } else {
        feedback.error();
        setLogMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch { feedback.error(); setLogMsg("שגיאת רשת"); }
    finally { setLogSaving(false); }
  }

  async function handleSaveExpense() {
    if (!project || !expAmount || !expDesc.trim()) return;
    setExpSaving(true); setExpMsg("");
    try {
      const res = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id:    project.id,
          material_name: expDesc.trim(),
          category:      expCat,
          quantity:      1,
          unit:          "יחידות",
          cost:          parseFloat(expAmount),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        feedback.success();
        setExpMsg("✓ הוצאה נרשמה");
        setExpAmount(""); setExpDesc("");
        setWeeklyBurn(b => b + (parseFloat(expAmount) || 0));
      } else {
        feedback.error();
        setExpMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch { feedback.error(); setExpMsg("שגיאת רשת"); }
    finally { setExpSaving(false); }
  }

  async function handleAddTask() {
    if (!project || !newTaskDesc.trim()) return;
    setTaskSaving(true); setTaskMsg("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          task_name:  newTaskDesc.trim(),
          notes:      newTaskNotes.trim() || null,
          start_date: newTaskDate,
          end_date:   newTaskDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        feedback.success();
        setTaskMsg("✓ משימה נוספה");
        setNewTaskDesc(""); setNewTaskNotes("");
        setExpandedDay(newTaskDate);
        loadDashboard(project.id);
      } else {
        feedback.error();
        setTaskMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch { feedback.error(); setTaskMsg("שגיאת רשת"); }
    finally { setTaskSaving(false); }
  }

  async function handleTaskStatus(id: string, status: string) {
    await fetch(`/api/admin/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadDashboard(project!.id);
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 size={32} strokeWidth={1.5} className="text-accent animate-spin" />
      </div>
    );
  }

  // ── Render: no projects ────────────────────────────────────────────────────
  if (view === "no_projects") {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center gap-5 p-8 text-center" dir="rtl">
        <AlertCircle size={52} strokeWidth={1} className="text-charcoal/20" />
        <div>
          <p className="font-heading text-xl font-bold text-charcoal">אין פרויקטים מוקצים</p>
          <p className="text-sm text-charcoal/50 mt-1">פנה למנהל לשיוך פרויקט לחשבונך</p>
        </div>
        <button onClick={onLogout} className="text-xs text-charcoal/30 underline underline-offset-2">יציאה</button>
      </div>
    );
  }

  // ── Render: project selection ──────────────────────────────────────────────
  if (view === "select") {
    return (
      <div className="min-h-screen bg-bone flex flex-col" dir="rtl">
        <div className="bg-charcoal px-5 pt-12 pb-7 text-white">
          <p className="text-[0.6rem] tracking-widest uppercase text-white/35 mb-1">בנין איתן · ממשק ממונה</p>
          <h1 className="font-heading text-2xl font-bold">שלום, {foremanName}</h1>
          <p className="text-sm text-white/45 mt-1">בחר פרויקט להמשך</p>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => selectProject(p)}
              className="w-full bg-white border border-warm-gray-light p-5 text-start flex items-center justify-between hover:border-accent transition-colors active:scale-[0.98] duration-100"
            >
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
  }

  // ── Render: dashboard ──────────────────────────────────────────────────────
  const hasLogToday = !!logId || !!logText;

  return (
    <div className="min-h-screen bg-bone flex flex-col" dir="rtl">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="bg-charcoal text-white px-4 pt-10 pb-4 sticky top-0 z-30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[0.55rem] tracking-widest uppercase text-white/30 mb-0.5">ממשק ממונה · {foremanName}</p>
            <h1 className="font-heading text-lg font-bold text-white leading-tight truncate">{project!.name}</h1>
          </div>
          <div className="shrink-0 text-end">
            <div className="flex items-center justify-end gap-1 text-white/30 text-[0.55rem] tracking-wide uppercase mb-0.5">
              <Flame size={9} />
              <span>הוצאות שבועיות</span>
            </div>
            <p className="font-heading text-xl font-bold text-accent tabular-nums">
              ₪{Math.round(weeklyBurn).toLocaleString("he-IL")}
            </p>
          </div>
        </div>
        {/* Refresh + back to projects if multiple */}
        <div className="flex items-center justify-between mt-2.5">
          <button
            onClick={() => loadDashboard(project!.id)}
            className="flex items-center gap-1 text-[0.6rem] text-white/25 hover:text-white/50 transition-colors"
          >
            <RefreshCw size={10} strokeWidth={1.5} className={dataLoading ? "animate-spin" : ""} />
            <span>רענן</span>
          </button>
          {projects.length > 1 && (
            <button
              onClick={() => setView("select")}
              className="text-[0.6rem] text-white/25 hover:text-white/50 transition-colors"
            >
              החלף פרויקט
            </button>
          )}
          <button onClick={onLogout} className="flex items-center gap-1 text-[0.6rem] text-white/25 hover:text-white/50 transition-colors">
            <LogOut size={10} strokeWidth={1.5} />
            <span>יציאה</span>
          </button>
        </div>
      </header>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24">

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="p-4 space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "באתר כעת",    value: onSite.length,     color: "text-green-600", onClick: () => setTab("site") },
                { label: "משימות היום", value: todayTasks.length, color: "text-accent",    onClick: () => setTab("plan") },
                { label: "יומן היום",   value: hasLogToday ? "✓" : "—", color: hasLogToday ? "text-green-600" : "text-charcoal/30", onClick: () => setTab("log") },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  className="bg-white border border-warm-gray-light p-3 text-center active:scale-95 transition-transform"
                >
                  <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[0.6rem] text-charcoal/40 mt-0.5 leading-tight">{s.label}</div>
                </button>
              ))}
            </div>

            {/* Today's tasks highlight */}
            {todayTasks.length > 0 && (
              <div className="bg-white border border-warm-gray-light">
                <div className="px-4 py-3 border-b border-charcoal/5 flex items-center justify-between">
                  <p className="font-heading text-sm font-bold text-charcoal">משימות להיום</p>
                  <span className="text-[0.6rem] text-accent font-semibold">{new Date().toLocaleDateString("he-IL", { weekday: "long" })}</span>
                </div>
                <div className="divide-y divide-charcoal/5">
                  {todayTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="text-sm font-semibold text-charcoal flex-1 truncate">{t.task_name}</p>
                      <span className={`text-[0.6rem] px-2 py-0.5 shrink-0 ${TASK_STATUS_CLS[t.status]}`}>
                        {TASK_STATUS_HE[t.status]}
                      </span>
                      {t.status !== "completed" && (
                        <button
                          onClick={() => handleTaskStatus(t.id, t.status === "planned" ? "in_progress" : "completed")}
                          className="shrink-0 w-7 h-7 flex items-center justify-center border border-green-300 text-green-600 hover:bg-green-50 transition-colors active:scale-95"
                        >
                          <Check size={14} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Who's on site preview */}
            {onSite.length > 0 && (
              <div className="bg-white border border-warm-gray-light">
                <div className="px-4 py-3 border-b border-charcoal/5 flex items-center justify-between">
                  <p className="font-heading text-sm font-bold text-charcoal">⚡ באתר עכשיו</p>
                  <button onClick={() => setTab("site")} className="text-[0.65rem] text-accent font-semibold">הצג הכל</button>
                </div>
                <div className="px-4 py-2 flex flex-wrap gap-2">
                  {onSite.map(w => (
                    <span key={w.staff_id} className="text-xs bg-bone border border-charcoal/10 px-2.5 py-1">
                      {w.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTab("log")}
                className="bg-charcoal text-white p-4 text-start space-y-1 active:scale-95 transition-transform"
              >
                <ClipboardList size={22} strokeWidth={1.5} className="text-white/60" />
                <p className="font-heading text-sm font-bold mt-2">יומן יומי</p>
                <p className="text-[0.65rem] text-white/40">{hasLogToday ? "עדכן יומן" : "רשום עבודת היום"}</p>
              </button>
              <button
                onClick={() => setTab("expense")}
                className="bg-accent text-bone p-4 text-start space-y-1 active:scale-95 transition-transform"
              >
                <PlusCircle size={22} strokeWidth={1.5} className="text-bone/60" />
                <p className="font-heading text-sm font-bold mt-2">הוסף הוצאה</p>
                <p className="text-[0.65rem] text-bone/50">חומרים, קבלן, הזמנות</p>
              </button>
            </div>
          </div>
        )}

        {/* ── SITE (who's clocked in) ────────────────────────────────────── */}
        {tab === "site" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-bold text-charcoal">
                עובדים באתר{onSite.length > 0 ? ` (${onSite.length})` : ""}
              </p>
              <button onClick={() => loadDashboard(project!.id)} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
                <RefreshCw size={12} strokeWidth={1.5} /> רענן
              </button>
            </div>

            {onSite.length === 0 ? (
              <div className="bg-white border border-warm-gray-light p-8 text-center">
                <Users size={32} strokeWidth={1} className="text-charcoal/15 mx-auto mb-2" />
                <p className="text-sm text-charcoal/30">אין עובדים מדווחים באתר כרגע</p>
              </div>
            ) : (
              <div className="space-y-2">
                {onSite.map(w => (
                  <div key={w.staff_id} className="bg-white border border-warm-gray-light px-4 py-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-charcoal text-sm">{w.name}</p>
                      <div className="flex items-center gap-1 text-[0.65rem] text-charcoal/40 mt-0.5">
                        <Clock size={10} strokeWidth={1.5} />
                        <span>כניסה: {w.entry_time}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClockOut(w)}
                      disabled={clockOutLoading === w.staff_id}
                      className="shrink-0 border border-red-300 text-red-600 px-4 py-2 text-xs font-semibold hover:bg-red-50 active:scale-95 transition-all disabled:opacity-40"
                    >
                      {clockOutLoading === w.staff_id
                        ? <Loader2 size={14} className="animate-spin" />
                        : "יציאה"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DAILY LOG ─────────────────────────────────────────────────── */}
        {tab === "log" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base font-bold text-charcoal">יומן עבודה יומי</p>
              <span className="text-xs text-charcoal/40">{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>

            {/* Status selector */}
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-2">סטטוס יום העבודה</p>
              <div className="grid grid-cols-3 gap-2">
                {(["normal", "delay", "problem"] as LogStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setLogStatus(s)}
                    className={`py-3 text-xs font-semibold border transition-all active:scale-95 ${
                      logStatus === s ? STATUS_BTN[s] : "border-charcoal/15 text-charcoal/40 bg-white"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Work summary */}
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">תיאור עבודת היום</p>
              <textarea
                value={logText}
                onChange={e => setLogText(e.target.value)}
                placeholder="תאר את העבודה שבוצעה היום..."
                rows={5}
                className="w-full border border-charcoal/15 bg-white px-3 py-3 text-sm text-charcoal resize-none focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Subcontractor count */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[0.7rem] text-charcoal/50 mb-1.5">עובדי קבלן משנה היום</p>
                <input
                  type="number"
                  min="0"
                  value={logSub}
                  onChange={e => setLogSub(e.target.value)}
                  className="w-full border border-charcoal/15 bg-white px-3 py-3 text-sm text-center font-bold focus:border-accent focus:outline-none transition-colors"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              onClick={handleSaveLog}
              disabled={logSaving || !logText.trim()}
              className="w-full bg-charcoal py-4 text-sm font-semibold tracking-wider uppercase text-white hover:bg-charcoal/80 disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
            >
              {logSaving ? <><Loader2 size={15} className="animate-spin" /> שומר...</> : <><CheckCircle2 size={15} /> שמור יומן</>}
            </button>

            {logMsg && (
              <p className={`text-center text-sm font-semibold ${logMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {logMsg}
              </p>
            )}
          </div>
        )}

        {/* ── EXPENSE ───────────────────────────────────────────────────── */}
        {tab === "expense" && (
          <div className="p-4 space-y-4">
            <p className="font-heading text-base font-bold text-charcoal">רישום הוצאה</p>

            {/* Amount — large + prominent */}
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">סכום (₪)</p>
              <div className="relative">
                <span className="absolute inset-y-0 end-3 flex items-center text-charcoal/30 font-bold text-lg pointer-events-none">₪</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-charcoal/15 bg-white pe-8 px-4 py-4 text-xl font-bold text-charcoal focus:border-accent focus:outline-none transition-colors"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">קטגוריה</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATS.map(c => (
                  <button
                    key={c}
                    onClick={() => setExpCat(c)}
                    className={`py-3 text-sm font-semibold border transition-all active:scale-95 ${
                      expCat === c
                        ? "border-accent bg-accent/8 text-accent"
                        : "border-charcoal/15 bg-white text-charcoal/60 hover:border-accent/50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[0.7rem] text-charcoal/50 mb-1.5">תיאור</p>
              <input
                type="text"
                value={expDesc}
                onChange={e => setExpDesc(e.target.value)}
                placeholder="בטון, ברזל, שרברב..."
                className="w-full border border-charcoal/15 bg-white px-4 py-3.5 text-sm text-charcoal focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleSaveExpense}
              disabled={expSaving || !expAmount || !expDesc.trim()}
              className="w-full bg-accent py-4 text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
            >
              {expSaving ? <><Loader2 size={15} className="animate-spin" /> שומר...</> : <><PlusCircle size={15} /> רשום הוצאה</>}
            </button>

            {expMsg && (
              <p className={`text-center text-sm font-semibold ${expMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {expMsg}
              </p>
            )}
          </div>
        )}

        {/* ── WEEKLY PLAN ───────────────────────────────────────────────── */}
        {tab === "plan" && (
          <div className="p-4 space-y-4">
            <p className="font-heading text-base font-bold text-charcoal">תכנון שבועי — 7 ימים קדימה</p>

            {/* 7-day accordion */}
            {weekDays.map(day => {
              const dayTasks = weekTasks[day.date] ?? [];
              const isOpen   = expandedDay === day.date;
              return (
                <div key={day.date} className={`bg-white border overflow-hidden ${day.isToday ? "border-accent" : "border-warm-gray-light"}`}>
                  {/* Day header */}
                  <button
                    onClick={() => setExpandedDay(isOpen ? null : day.date)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-start ${day.isToday ? "bg-accent/5" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {day.isToday && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                      <div>
                        <span className="font-heading text-sm font-bold text-charcoal">{day.label}</span>
                        <span className="text-charcoal/35 text-xs me-1.5"> · {day.short}</span>
                        {day.isToday && <span className="text-[0.55rem] bg-accent text-bone px-1.5 py-0.5 font-semibold">היום</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dayTasks.length > 0 && (
                        <span className="text-xs font-bold text-accent">{dayTasks.length}</span>
                      )}
                      {isOpen ? <ChevronDown size={15} strokeWidth={2} className="text-charcoal/40" /> : <ChevronRight size={15} strokeWidth={2} className="text-charcoal/25" />}
                    </div>
                  </button>

                  {/* Tasks for this day */}
                  {isOpen && (
                    <div className="border-t border-charcoal/5">
                      {dayTasks.length > 0 && (
                        <div className="divide-y divide-charcoal/5">
                          {dayTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-charcoal truncate">{t.task_name}</p>
                                {t.notes && <p className="text-[0.65rem] text-charcoal/40 mt-0.5 truncate">{t.notes}</p>}
                              </div>
                              <span className={`text-[0.6rem] px-2 py-0.5 shrink-0 ${TASK_STATUS_CLS[t.status]}`}>
                                {TASK_STATUS_HE[t.status]}
                              </span>
                              {t.status !== "completed" && (
                                <button
                                  onClick={() => handleTaskStatus(t.id, t.status === "planned" ? "in_progress" : "completed")}
                                  className="shrink-0 w-7 h-7 flex items-center justify-center border border-green-300 text-green-600 hover:bg-green-50 transition-colors active:scale-95"
                                >
                                  <Check size={13} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add task for this day */}
                      <div className="px-4 py-3 bg-bone/60 space-y-2">
                        {newTaskDate !== day.date && (
                          <button
                            onClick={() => setNewTaskDate(day.date)}
                            className="text-xs text-accent font-semibold flex items-center gap-1"
                          >
                            <PlusCircle size={13} strokeWidth={2} /> הוסף משימה ליום זה
                          </button>
                        )}
                        {newTaskDate === day.date && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={newTaskDesc}
                              onChange={e => setNewTaskDesc(e.target.value)}
                              placeholder="תיאור המשימה..."
                              className="w-full border border-charcoal/15 bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors"
                            />
                            <input
                              type="text"
                              value={newTaskNotes}
                              onChange={e => setNewTaskNotes(e.target.value)}
                              placeholder="הערות (אופציונלי)"
                              className="w-full border border-charcoal/15 bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleAddTask}
                                disabled={taskSaving || !newTaskDesc.trim()}
                                className="flex-1 bg-accent text-bone py-2.5 text-xs font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                              >
                                {taskSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                הוסף
                              </button>
                              <button
                                onClick={() => { setNewTaskDate(today); setNewTaskDesc(""); setNewTaskNotes(""); }}
                                className="border border-charcoal/15 px-4 py-2.5 text-xs text-charcoal/40 hover:border-accent transition-colors"
                              >
                                ביטול
                              </button>
                            </div>
                            {taskMsg && (
                              <p className={`text-xs font-semibold ${taskMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                                {taskMsg}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ── Bottom tab bar ────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-charcoal/10 flex z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {([
          { key: "overview" as Tab, icon: <Home size={20} strokeWidth={1.8} />,         label: "ראשי",   dot: todayTasks.length > 0 },
          { key: "site"     as Tab, icon: <Users size={20} strokeWidth={1.8} />,        label: "באתר",   dot: onSite.length > 0 },
          { key: "log"      as Tab, icon: <ClipboardList size={20} strokeWidth={1.8} />, label: "יומן",  dot: hasLogToday },
          { key: "expense"  as Tab, icon: <PlusCircle size={20} strokeWidth={1.8} />,   label: "הוצאה",  dot: false },
          { key: "plan"     as Tab, icon: <Calendar size={20} strokeWidth={1.8} />,     label: "שבועי",  dot: false },
        ] as { key: Tab; icon: React.ReactNode; label: string; dot: boolean }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors active:scale-95 ${
              tab === t.key ? "text-accent" : "text-charcoal/30"
            }`}
          >
            {t.dot && (
              <span className="absolute top-2 right-1/2 translate-x-3.5 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
            {t.icon}
            <span className="text-[0.58rem] font-semibold">{t.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
