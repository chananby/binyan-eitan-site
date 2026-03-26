"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFeedback } from "../hooks/useFeedback";
import SuccessFlash from "./SuccessFlash";
import ForemanPortal from "./ForemanPortal";
import WeeklyPlanner from "./WeeklyPlanner";
import Image from "next/image";
import Link from "next/link";
import {
  LogIn, Building2, Package, BarChart2, LayoutDashboard, Hammer,
  ClipboardList, UserPlus, RefreshCw, Pencil, Loader2, Activity,
  AlertCircle, AlertTriangle, TrendingUp, DollarSign, Target, CheckSquare2,
  Calendar, ChevronDown, ChevronUp, ChevronLeft, Flag, Grid3x3, Download,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type AuthState = "loading" | "unauthenticated" | "foreman" | "admin";
type AdminTab  = "dashboard" | "attendance" | "workers" | "projects" | "expenses" | "planning" | "matrix" | "income" | "reports";
type LoginMode = "pin" | "password";

interface StaffMember {
  id: string; name: string; phone: string; role: string; active: boolean;
  national_id?: string | null; hourly_rate?: number | null; daily_rate?: number | null;
  has_pin?: boolean;
}
interface AttendanceRecord {
  id: string; action: string; timestamp_label: string; recorded_at: string;
  staff: { id: string; name: string; phone: string; role?: string } | null;
  project: { id: string; name: string } | null;
}
interface Project { id: string; name: string; status?: string; }
interface Task {
  id: string; project_id: string; milestone_id: string | null; task_name: string;
  start_date: string | null; end_date: string | null; contractor: string | null;
  status: "planned" | "in_progress" | "completed" | "delayed";
  notes: string | null; project?: { id: string; name: string } | null;
  material_ready: boolean; sub_confirmed: boolean; equipment_on_site: boolean;
  delay_reason: string | null;
}
interface Milestone {
  id: string; project_id: string; name: string; description: string | null;
  target_date: string | null; status: "pending" | "in_progress" | "completed";
  created_at: string; project?: { id: string; name: string } | null;
}
interface Material {
  id: string; project_id: string; material_name: string; quantity: number;
  unit: string; supplier: string | null; cost: number | null; category?: string; created_at: string;
}
interface BudgetLine { project_id: string; project_name: string; total: number; }
interface IncomeRecord {
  id: string; project_id: string; amount: number; description: string | null;
  received_date: string; created_at: string; project?: { id: string; name: string } | null;
}
interface DailyReport {
  id: string; project_id: string; date: string; weather: string | null;
  summary: string | null; special_events: string | null; created_at: string;
  project: { id: string; name: string } | null;
}

// Attendance report types (shared between in-app view and print/PDF export)
interface AttReportRow    { staff_name: string; staff_phone: string; date: string; entry: string; exit: string; hours: number | null; project: string; }
interface AttSummaryRow   { name: string; phone: string; days: number; hours: number; }
interface AttReportData   { rows: AttReportRow[]; summary: AttSummaryRow[]; from: string; to: string; }

const MILESTONE_STATUS_HE: Record<string, string>  = { pending: "ממתין", in_progress: "בביצוע", completed: "הושלם" };
const MILESTONE_STATUS_CLS: Record<string, string> = {
  pending:     "bg-charcoal/5 text-charcoal/50",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-green-50 text-green-700",
};

const EXPENSE_CATEGORIES = ["חומרים", "קבלן משנה", "הזמנות", "כלי עבודה"];
const UNITS = ["יחידות", "קוב", 'מ"ר', 'מ"א', "טון", 'ק"ג', "ליטר"];
const WEATHER_OPTIONS = ["☀️ בהיר", "⛅ מעונן חלקית", "☁️ מעונן", "🌧️ גשום", "🌩️ סוערת", "🌬️ רוחות חזקות"];
const STATUS_HE: Record<string, string> = { planned: "מתוכנן", in_progress: "בביצוע", completed: "הושלם", delayed: "עיכוב" };
const DELAY_REASON_HE: Record<string, string> = { workers: "כוח אדם", material: "חומרים", weather: "מזג אוויר", subcontractor: "קבלן משנה" };
const STATUS_CLS: Record<string, string> = {
  planned:     "bg-charcoal/5 text-charcoal/60",
  in_progress: "bg-amber-50 text-amber-700",
  delayed:     "bg-red-50 text-red-700",
  completed:   "bg-green-50 text-green-700",
};
const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function getWeekDays(): { date: string; label: string; short: string }[] {
  const today     = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const sunday    = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return {
      date:  d.toISOString().slice(0, 10),
      label: DAYS_HE[i],
      short: d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }),
    };
  });
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [authState,      setAuthState]      = useState<AuthState>("loading");
  const [loginMode,      setLoginMode]      = useState<LoginMode>("pin");
  const [tab,            setTab]            = useState<AdminTab>("dashboard");
  const [foremanName,    setForemanName]    = useState<string | null>(null);
  const [foremanStaffId, setForemanStaffId] = useState<string | null>(null);

  // Login state
  const [pin,      setPin]      = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Tactile / audio feedback
  const feedback  = useFeedback();
  const [showFlash, setShowFlash] = useState(false);

  // Core data
  const [staff,         setStaff]         = useState<StaffMember[]>([]);
  const [todayLogs,     setTodayLogs]     = useState<AttendanceRecord[]>([]);
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [milestones,    setMilestones]    = useState<Milestone[]>([]);
  const [materials,     setMaterials]     = useState<Material[]>([]);
  const [budget,        setBudget]        = useState<BudgetLine[]>([]);
  const [income,        setIncome]        = useState<IncomeRecord[]>([]);
  const [incomeTotals,  setIncomeTotals]  = useState<Record<string, number>>({});
  const [reports,       setReports]       = useState<DailyReport[]>([]);
  const [dataLoading,   setDataLoading]   = useState(false);
  const [attLoadErr,    setAttLoadErr]    = useState<string | null>(null);

  // Milestone UI
  const [expandedMs,      setExpandedMs]      = useState<Set<string>>(new Set());
  const [newMsProjectId,  setNewMsProjectId]  = useState("");
  const [newMsName,       setNewMsName]       = useState("");
  const [newMsTargetDate, setNewMsTargetDate] = useState("");
  const [msAddLoading,    setMsAddLoading]    = useState(false);
  const [msAddMsg,        setMsAddMsg]        = useState("");

  // Task milestone assignment
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState("");

  // Workers UI
  const [newName, setNewName]   = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole]   = useState("עובד");
  const [newNationalId, setNewNationalId] = useState("");
  const [newHourlyRate, setNewHourlyRate] = useState("");
  const [newDailyRate,  setNewDailyRate]  = useState("");
  const [newPin,        setNewPin]        = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg,     setAddMsg]     = useState("");
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editName,        setEditName]        = useState("");
  const [editPhone,       setEditPhone]       = useState("");
  const [editRole,        setEditRole]        = useState("עובד");
  const [editNationalId,  setEditNationalId]  = useState("");
  const [editHourlyRate,  setEditHourlyRate]  = useState("");
  const [editDailyRate,   setEditDailyRate]   = useState("");
  const [editPin,         setEditPin]         = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg,     setEditMsg]     = useState("");

  // Projects UI
  const [newProjectName,    setNewProjectName]    = useState("");
  const [projectAddLoading, setProjectAddLoading] = useState(false);
  const [projectAddMsg,     setProjectAddMsg]     = useState("");

  // Expenses UI
  const [matProjectId, setMatProjectId] = useState("");
  const [matCategory,  setMatCategory]  = useState("חומרים");
  const [matName,      setMatName]      = useState("");
  const [matQty,       setMatQty]       = useState("1");
  const [matUnit,      setMatUnit]      = useState("יחידות");
  const [matSupplier,  setMatSupplier]  = useState("");
  const [matCost,      setMatCost]      = useState("");
  const [matLoading,   setMatLoading]   = useState(false);
  const [matMsg,       setMatMsg]       = useState("");
  const [matFilter,    setMatFilter]    = useState("");

  // Planning UI
  const [taskFilter,        setTaskFilter]        = useState("");
  const [newTaskProjectId,  setNewTaskProjectId]  = useState("");
  const [newTaskName,       setNewTaskName]        = useState("");
  const [newTaskStart,      setNewTaskStart]       = useState("");
  const [newTaskEnd,        setNewTaskEnd]         = useState("");
  const [newTaskContractor, setNewTaskContractor]  = useState("");
  const [taskAddLoading,    setTaskAddLoading]     = useState(false);
  const [taskAddMsg,        setTaskAddMsg]         = useState("");

  // Attendance report download UI
  const attTodayStr   = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const attWeekAgoStr = new Date(Date.now() - 6 * 86_400_000).toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const [attReportFrom,    setAttReportFrom]    = useState(attWeekAgoStr);
  const [attReportTo,      setAttReportTo]      = useState(attTodayStr);
  const [attReportLoading, setAttReportLoading] = useState(false);
  const [attReportErr,     setAttReportErr]     = useState<string | null>(null);
  const [attReportData,    setAttReportData]    = useState<AttReportData | null>(null);

  // Shared fetch — populates attReportData for the in-app view; returns data for print
  const fetchAttReport = async (): Promise<AttReportData | null> => {
    setAttReportLoading(true); setAttReportErr(null);
    try {
      const res = await fetch(`/api/admin/attendance/report?from=${attReportFrom}&to=${attReportTo}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const data: AttReportData = await res.json();
      setAttReportData({ ...data, from: attReportFrom, to: attReportTo });
      return data;
    } catch (e) { setAttReportErr(String(e)); return null; }
    finally { setAttReportLoading(false); }
  };

  // Open a print-ready HTML report in a new tab → user can Ctrl+P → Save as PDF
  const printAttReport = async () => {
    const data = await fetchAttReport();
    if (!data) return;
    const { rows, summary, from, to } = data;

    // Group rows by worker for the detailed section
    const byWorker = new Map<string, AttReportRow[]>();
    for (const r of rows) {
      if (!byWorker.has(r.staff_name)) byWorker.set(r.staff_name, []);
      byWorker.get(r.staff_name)!.push(r);
    }

    const detailHtml = [...byWorker.entries()].map(([name, wRows]) => {
      const workerSummary = summary.find(s => s.name === name);
      const rowsHtml = wRows.map(r => `
        <tr>
          <td>${r.date}</td>
          <td>${r.entry}</td>
          <td>${r.exit}</td>
          <td>${r.hours !== null ? r.hours.toFixed(2) : "—"}</td>
          <td>${r.project}</td>
        </tr>`).join("");
      return `
        <div class="worker-block">
          <div class="worker-header">
            <span class="worker-name">${name}</span>
            <span class="worker-meta">${workerSummary?.days ?? 0} ימי עבודה &nbsp;·&nbsp; סה"כ ${workerSummary?.hours.toFixed(2) ?? "0"} שעות</span>
          </div>
          <table>
            <thead><tr><th>תאריך</th><th>כניסה</th><th>יציאה</th><th>שעות</th><th>אתר עבודה</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }).join("");

    const summaryHtml = summary.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.phone}</td>
        <td>${s.days}</td>
        <td>${s.hours.toFixed(2)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8"/>
<title>דוח נוכחות ${from} – ${to}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 12px; color: #2D2926; background: #fff; padding: 24px; direction: rtl; }
  h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: bold; margin: 20px 0 8px; border-bottom: 1.5px solid #8D775F; padding-bottom: 4px; color: #8D775F; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #D1CFCA; padding: 5px 8px; text-align: right; }
  th { background: #F3F2EE; font-weight: bold; font-size: 11px; }
  td { font-size: 11px; }
  tr:nth-child(even) td { background: #FAFAF9; }
  .worker-block { margin-bottom: 20px; }
  .worker-header { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 10px; background: #F3F2EE; border-right: 3px solid #8D775F; margin-bottom: 6px; }
  .worker-name { font-weight: bold; font-size: 12px; }
  .worker-meta { font-size: 10px; color: #666; }
  @media print {
    body { padding: 10px; }
    .worker-block { page-break-inside: avoid; }
    @page { margin: 1.5cm; size: A4; }
  }
</style>
</head>
<body>
<h1>דוח נוכחות</h1>
<div class="subtitle">תקופה: ${from} עד ${to}</div>

<div class="section-title">סיכום לפי עובד</div>
<table>
  <thead><tr><th>שם עובד</th><th>טלפון</th><th>ימי עבודה</th><th>סה"כ שעות</th></tr></thead>
  <tbody>${summaryHtml}</tbody>
</table>

<div class="section-title">פירוט יומי לפי עובד</div>
${detailHtml}
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Attendance edit UI
  const [editAttId,        setEditAttId]        = useState<string | null>(null);
  const [editAttAction,    setEditAttAction]    = useState("כניסה");
  const [editAttProject,   setEditAttProject]   = useState("");
  const [editAttTimestamp, setEditAttTimestamp] = useState("");
  const [editAttLoading,   setEditAttLoading]   = useState(false);
  const [editAttMsg,       setEditAttMsg]        = useState("");

  // Income UI
  const [incProjectId, setIncProjectId] = useState("");
  const [incAmount,    setIncAmount]    = useState("");
  const [incDesc,      setIncDesc]      = useState("");
  const [incDate,      setIncDate]      = useState(new Date().toISOString().slice(0, 10));
  const [incLoading,   setIncLoading]   = useState(false);
  const [incMsg,       setIncMsg]       = useState("");

  // Reports UI
  const [reportProjectId, setReportProjectId] = useState("");
  const [reportDate,      setReportDate]      = useState(new Date().toISOString().slice(0, 10));
  const [reportWeather,   setReportWeather]   = useState("");
  const [reportSummary,   setReportSummary]   = useState("");
  const [reportSpecial,   setReportSpecial]   = useState("");
  const [reportLoading,   setReportLoading]   = useState(false);
  const [reportMsg,       setReportMsg]       = useState("");

  // ── Derived values ─────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const weekDays = useMemo(() => getWeekDays(), []);

  const { onSite, laborEstimate } = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ record: AttendanceRecord; worker?: StaffMember }> = [];
    for (const log of todayLogs) {
      const sid = log.staff?.id;
      if (!sid || seen.has(sid)) continue;
      seen.add(sid);
      if (log.action === "כניסה" || log.action === "in") {
        list.push({ record: log, worker: staff.find(s => s.id === sid) });
      }
    }
    const now = Date.now();
    let labor = 0;
    for (const { record, worker } of list) {
      if (!worker) continue;
      if (worker.daily_rate) {
        labor += worker.daily_rate;
      } else if (worker.hourly_rate) {
        const hrs = (now - new Date(record.recorded_at).getTime()) / 3_600_000;
        labor += Math.max(0, hrs) * worker.hourly_rate;
      }
    }
    return { onSite: list, laborEstimate: labor };
  }, [todayLogs, staff]);

  const todayExpensesTotal = useMemo(
    () => materials.filter(m => m.created_at.startsWith(todayStr)).reduce((s, m) => s + (m.cost ?? 0), 0),
    [materials, todayStr]
  );

  const todayTasks = useMemo(
    () => tasks.filter(t => {
      if (t.status === "completed") return false;
      if (t.start_date && t.start_date > todayStr) return false;
      if (t.end_date   && t.end_date   < todayStr) return false;
      return true;
    }),
    [tasks, todayStr]
  );

  const roleMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of todayLogs) {
      if (log.action !== "כניסה" && log.action !== "in") continue;
      const role = log.staff?.role ?? "עובד";
      map[role] = (map[role] ?? 0) + 1;
    }
    return map;
  }, [todayLogs]);

  // ── Auth check on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/whoami")
      .then(r => r.json())
      .then(d => {
        setAuthState(d.role ?? "unauthenticated");
        if (d.name)    setForemanName(d.name);
        if (d.staffId) setForemanStaffId(d.staffId);
      })
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  useEffect(() => {
    if (authState === "admin" || authState === "foreman") {
      setTab("dashboard");
      loadData(authState);
    }
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((authState === "admin" || authState === "foreman") && tab === "expenses") loadMaterials();
  }, [tab, matFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authState === "admin" && tab === "reports") loadReports();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authState === "admin" && tab === "income") loadIncome();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh attendance every 60 s ────────────────────────────────────
  useEffect(() => {
    if (authState !== "admin" && authState !== "foreman") return;
    const iv = setInterval(async () => {
      const res = await fetch("/api/admin/attendance/today").catch(() => null);
      if (res?.ok) { const d = await res.json(); setTodayLogs(d.records ?? []); }
    }, 60_000);
    return () => clearInterval(iv);
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loaders ───────────────────────────────────────────────────────────
  async function loadData(role: "admin" | "foreman") {
    setDataLoading(true); setAttLoadErr(null);
    try {
      const results = await Promise.allSettled([
        fetch("/api/admin/attendance/today"),
        fetch("/api/admin/projects"),
        fetch("/api/admin/tasks"),
        fetch("/api/admin/milestones"),
      ]);
      const [logsR, projR, tasksR, msR] = results;

      if (logsR.status === "fulfilled") {
        if (logsR.value.ok) {
          const d = await logsR.value.json();
          setTodayLogs(d.records ?? []);
        } else {
          const d = await logsR.value.json().catch(() => ({}));
          setAttLoadErr(d.error ?? `שגיאת שרת ${logsR.value.status}`);
        }
      } else {
        setAttLoadErr("לא ניתן להתחבר לשרת");
      }
      if (projR.status  === "fulfilled" && projR.value.ok)  { const d = await projR.value.json();  setProjects(d.projects ?? []); }
      if (tasksR.status === "fulfilled" && tasksR.value.ok) { const d = await tasksR.value.json(); setTasks(d.tasks ?? []); }
      if (msR.status    === "fulfilled" && msR.value.ok)    { const d = await msR.value.json();    setMilestones(d.milestones ?? []); }

      if (role === "admin") {
        const staffRes = await fetch("/api/admin/staff");
        if (staffRes.ok) { const d = await staffRes.json(); setStaff(d.staff ?? []); }
      }
    } finally { setDataLoading(false); }
  }

  async function loadMaterials() {
    const url = matFilter ? `/api/admin/materials?project_id=${matFilter}` : "/api/admin/materials";
    const res = await fetch(url);
    if (res.ok) { const d = await res.json(); setMaterials(d.materials ?? []); setBudget(d.budget ?? []); }
  }

  async function loadReports() {
    const res = await fetch("/api/admin/daily-reports");
    if (res.ok) { const d = await res.json(); setReports(d.reports ?? []); }
  }

  async function loadIncome() {
    const res = await fetch("/api/admin/income");
    if (res.ok) { const d = await res.json(); setIncome(d.income ?? []); setIncomeTotals(d.totals ?? {}); }
  }

  function reload() { if (authState === "admin" || authState === "foreman") loadData(authState); }

  // ── Login handlers ─────────────────────────────────────────────────────────
  async function handlePinLogin(submittedPin: string) {
    setLoginLoading(true); setLoginErr("");
    try {
      const res  = await fetch("/api/foreman-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: submittedPin }) });
      const data = await res.json();
      if (data.ok) { feedback.success(); setShowFlash(true); setForemanName(data.name ?? null); setForemanStaffId(data.staffId ?? null); setAuthState("foreman"); }
      else { feedback.error(); setLoginErr("קוד שגוי"); setPin(""); }
    } catch { setLoginErr("שגיאת רשת"); }
    finally { setLoginLoading(false); }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginLoading(true); setLoginErr("");
    try {
      const res  = await fetch("/api/admin-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (data.ok) { feedback.success(); setShowFlash(true); setAuthState("admin"); }
      else { feedback.error(); setLoginErr("סיסמה שגויה"); setPassword(""); }
    } catch { setLoginErr("שגיאת רשת"); }
    finally { setLoginLoading(false); }
  }

  async function handleLogout() {
    await fetch(authState === "foreman" ? "/api/foreman-auth" : "/api/admin-auth", { method: "DELETE" });
    setAuthState("unauthenticated");
    setForemanName(null);
    setStaff([]); setTodayLogs([]); setProjects([]); setTasks([]);
    setMaterials([]); setBudget([]); setIncome([]); setReports([]);
  }

  // ── PIN digit entry ────────────────────────────────────────────────────────
  function handlePinKey(digit: string) {
    if (loginLoading) return;
    setLoginErr("");
    const next = pin + digit;
    if (next.length <= 8) setPin(next);
  }

  function handlePinBackspace() {
    setLoginErr("");
    setPin(p => p.slice(0, -1));
  }

  // ── Worker CRUD ────────────────────────────────────────────────────────────
  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault(); setAddLoading(true); setAddMsg("");
    try {
      const res  = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, role: newRole, national_id: newNationalId,
          hourly_rate: newHourlyRate ? parseFloat(newHourlyRate) : null,
          daily_rate: newDailyRate   ? parseFloat(newDailyRate)  : null,
          pin: newPin || undefined }) });
      const data = await res.json();
      if (res.ok) { setAddMsg("✓ " + newName + " נוסף"); setNewName(""); setNewPhone(""); setNewNationalId(""); setNewHourlyRate(""); setNewDailyRate(""); setNewPin(""); reload(); }
      else        { setAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setAddMsg("שגיאת רשת: " + String(err)); }
    finally { setAddLoading(false); }
  }

  function startEdit(s: StaffMember) {
    setEditingId(s.id); setEditName(s.name); setEditPhone(s.phone); setEditRole(s.role);
    setEditNationalId(s.national_id ?? "");
    setEditHourlyRate(s.hourly_rate != null ? String(s.hourly_rate) : "");
    setEditDailyRate(s.daily_rate   != null ? String(s.daily_rate)  : "");
    setEditPin(""); // always blank — admin sets a new PIN explicitly
    setEditMsg("");
  }

  async function handleEditWorker(e: React.FormEvent) {
    e.preventDefault(); if (!editingId) return;
    setEditLoading(true); setEditMsg("");
    try {
      const body: Record<string, unknown> = { name: editName, phone: editPhone, role: editRole, national_id: editNationalId,
        hourly_rate: editHourlyRate ? parseFloat(editHourlyRate) : null,
        daily_rate:  editDailyRate  ? parseFloat(editDailyRate)  : null };
      if (editPin) body.pin = editPin; // only send if a new PIN was entered
      const res  = await fetch(`/api/admin/staff/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { setEditingId(null); reload(); }
      else        { setEditMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditMsg("שגיאת רשת: " + String(err)); }
    finally { setEditLoading(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !current }) });
    reload();
  }

  // ── Project CRUD ───────────────────────────────────────────────────────────
  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault(); setProjectAddLoading(true); setProjectAddMsg("");
    try {
      const res  = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newProjectName }) });
      const data = await res.json();
      if (res.ok) { setProjectAddMsg("✓ " + newProjectName + " נוסף"); setNewProjectName(""); reload(); }
      else        { setProjectAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setProjectAddMsg("שגיאת רשת: " + String(err)); }
    finally { setProjectAddLoading(false); }
  }

  async function toggleProjectStatus(id: string, current: string) {
    await fetch(`/api/admin/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: current === "active" ? "inactive" : "active" }) });
    reload();
  }

  // ── Expense CRUD ───────────────────────────────────────────────────────────
  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault(); setMatLoading(true); setMatMsg("");
    try {
      const res  = await fetch("/api/admin/materials", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: matProjectId, material_name: matName, quantity: parseFloat(matQty) || 1, unit: matUnit, supplier: matSupplier, cost: matCost ? parseFloat(matCost) : null, category: matCategory }) });
      const data = await res.json();
      if (res.ok) { feedback.success(); setMatMsg("✓ " + matName + " נרשם"); setMatName(""); setMatQty("1"); setMatSupplier(""); setMatCost(""); loadMaterials(); }
      else        { feedback.error(); setMatMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setMatMsg("שגיאת רשת: " + String(err)); }
    finally { setMatLoading(false); }
  }

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault(); setTaskAddLoading(true); setTaskAddMsg("");
    try {
      const res  = await fetch("/api/admin/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: newTaskProjectId, milestone_id: newTaskMilestoneId || null, task_name: newTaskName, start_date: newTaskStart || null, end_date: newTaskEnd || null, contractor: newTaskContractor }) });
      const data = await res.json();
      if (res.ok) {
        setTaskAddMsg("✓ " + newTaskName + " נוסף");
        setNewTaskName(""); setNewTaskStart(""); setNewTaskEnd(""); setNewTaskContractor(""); setNewTaskMilestoneId("");
        if (newTaskMilestoneId) setExpandedMs(prev => new Set([...prev, newTaskMilestoneId]));
        reload();
      }
      else        { setTaskAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setTaskAddMsg("שגיאת רשת: " + String(err)); }
    finally { setTaskAddLoading(false); }
  }

  const setTaskStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/admin/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    reload();
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Milestone CRUD ─────────────────────────────────────────────────────────
  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault(); setMsAddLoading(true); setMsAddMsg("");
    try {
      const res  = await fetch("/api/admin/milestones", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: newMsProjectId, name: newMsName, target_date: newMsTargetDate || null }) });
      const data = await res.json();
      if (res.ok) {
        setMsAddMsg("✓ " + newMsName + " נוספה");
        setNewMsName(""); setNewMsTargetDate("");
        setExpandedMs(prev => new Set([...prev, data.milestone.id]));
        reload();
      } else { setMsAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setMsAddMsg("שגיאת רשת: " + String(err)); }
    finally { setMsAddLoading(false); }
  }

  const setMilestoneStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/admin/milestones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    reload();
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMs(id: string) {
    setExpandedMs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const assignTaskDay = useCallback(async (id: string, date: string | null) => {
    await fetch(`/api/admin/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start_date: date ?? "" }) });
    reload();
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Attendance retroactive edit ────────────────────────────────────────────
  function startEditAtt(r: AttendanceRecord) {
    setEditAttId(r.id);
    setEditAttAction(r.action === "in" ? "כניסה" : r.action === "out" ? "יציאה" : r.action);
    setEditAttProject(r.project?.id ?? "");
    setEditAttTimestamp(r.timestamp_label ?? "");
    setEditAttMsg("");
  }

  async function handleEditAtt(e: React.FormEvent) {
    e.preventDefault(); if (!editAttId) return;
    setEditAttLoading(true); setEditAttMsg("");
    try {
      const res  = await fetch(`/api/admin/attendance/${editAttId}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: editAttAction, project_id: editAttProject || null, timestamp_label: editAttTimestamp }) });
      const data = await res.json();
      if (res.ok) { setEditAttId(null); reload(); }
      else        { setEditAttMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditAttMsg("שגיאת רשת: " + String(err)); }
    finally { setEditAttLoading(false); }
  }

  // ── Income CRUD ────────────────────────────────────────────────────────────
  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault(); setIncLoading(true); setIncMsg("");
    try {
      const res  = await fetch("/api/admin/income", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: incProjectId, amount: parseFloat(incAmount), description: incDesc, received_date: incDate }) });
      const data = await res.json();
      if (res.ok) { setIncMsg("✓ תשלום נרשם"); setIncAmount(""); setIncDesc(""); loadIncome(); }
      else        { setIncMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setIncMsg("שגיאת רשת: " + String(err)); }
    finally { setIncLoading(false); }
  }

  // ── Daily report ───────────────────────────────────────────────────────────
  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault(); setReportLoading(true); setReportMsg("");
    try {
      const res  = await fetch("/api/admin/daily-reports", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: reportProjectId, date: reportDate, weather: reportWeather, summary: reportSummary, special_events: reportSpecial }) });
      const data = await res.json();
      if (res.ok) { feedback.success(); setReportMsg("✓ דוח נשמר"); setReportSummary(""); setReportSpecial(""); setReportWeather(""); loadReports(); }
      else        { feedback.error(); setReportMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setReportMsg("שגיאת רשת: " + String(err)); }
    finally { setReportLoading(false); }
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 size={32} strokeWidth={1.5} className="text-accent animate-spin" />
      </div>
    );
  }

  // ── Render: login ──────────────────────────────────────────────────────────
  if (authState === "unauthenticated") {
    return (
      <>
      <SuccessFlash show={showFlash} onDone={() => setShowFlash(false)} />
      <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 gap-8" dir="rtl">
        <div className="absolute top-5 start-5">
          <Link href="/he" className="flex items-center gap-1 font-body text-xs text-charcoal/30 hover:text-accent transition-colors duration-200">
            <ChevronLeft size={14} strokeWidth={1.5} />
            <span>דף הבית</span>
          </Link>
        </div>
        <Image src="/logo.png" alt="Binyan Eitan" width={120} height={36} className="h-9 w-auto brightness-0 opacity-60" />

        {/* Mode tabs */}
        <div className="flex border-b border-charcoal/10 w-full max-w-xs">
          {([["pin", "מנהל עבודה", "PIN"], ["password", "מנהל ראשי", "סיסמה"]] as [LoginMode, string, string][]).map(([mode, label, sub]) => (
            <button key={mode} onClick={() => { setLoginMode(mode); setPin(""); setPassword(""); setLoginErr(""); }}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${loginMode === mode ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal/60"}`}>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[0.6rem] tracking-widest uppercase text-charcoal/30">{sub}</p>
            </button>
          ))}
        </div>

        <div className="w-full max-w-xs space-y-6">
          {loginMode === "pin" ? (
            <>
              {/* PIN display — 8 circles, max PIN length */}
              <div className="flex justify-center gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                    i < pin.length ? "border-accent bg-accent scale-110" : "border-charcoal/15 bg-white"
                  }`}>
                    {i < pin.length && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                ))}
              </div>
              {/* Keypad — dir="ltr" so digits always render 1-2-3 left-to-right */}
              <div className="grid grid-cols-3 gap-2" dir="ltr">
                {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                  <button key={i} disabled={loginLoading || !k}
                    onClick={() => k === "⌫" ? handlePinBackspace() : k && handlePinKey(k)}
                    className={`h-14 text-xl font-semibold border transition-all active:scale-95 ${
                      !k ? "invisible" :
                      k === "⌫" ? "border-charcoal/10 text-charcoal/40 hover:border-accent hover:text-accent" :
                      "border-charcoal/15 bg-white text-charcoal hover:border-accent hover:text-accent"
                    } disabled:opacity-40`}>
                    {k}
                  </button>
                ))}
              </div>
              {/* Confirm button — visible once ≥4 digits entered */}
              <button
                onClick={() => handlePinLogin(pin)}
                disabled={pin.length < 4 || loginLoading}
                className="w-full bg-accent py-3.5 font-body text-sm font-semibold tracking-[0.18em] uppercase text-bone hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {loginLoading
                  ? <><Loader2 size={15} className="animate-spin" /> מאמת...</>
                  : <><LogIn size={15} /> כניסה</>}
              </button>
            </>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="סיסמת מנהל"
                className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-lg tracking-[0.3em] text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors" />
              <Btn loading={loginLoading} disabled={!password.trim()}><LogIn size={14} className="inline me-1.5" />כניסה</Btn>
            </form>
          )}

          {loginErr && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
              <AlertCircle size={14} strokeWidth={1.5} />{loginErr}
            </div>
          )}
        </div>

        <p className="font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
          בניין איתן — פורטל ניהול פנימי
        </p>
      </div>
      </>
    );
  }

  // ── Render: foreman portal (dedicated mobile UX) ───────────────────────────
  if (authState === "foreman") {
    return (
      <ForemanPortal
        staffId={foremanStaffId ?? ""}
        foremanName={foremanName ?? "ממונה"}
        onLogout={handleLogout}
      />
    );
  }

  // ── Render: admin portal ────────────────────────────────────────────────────
  const isAdmin   = authState === "admin";
  const isForeman = false; // kept for any remaining references

  type TabDef = { key: AdminTab; label: string; icon: React.ReactNode; adminOnly?: boolean };
  const TABS: TabDef[] = [
    { key: "dashboard",  label: "דשבורד",   icon: <LayoutDashboard size={13} /> },
    { key: "attendance", label: "נוכחות",    icon: <ClipboardList size={13} />,  adminOnly: true },
    { key: "workers",    label: "עובדים",    icon: <UserPlus size={13} />,       adminOnly: true },
    { key: "projects",   label: "פרויקטים",  icon: <Building2 size={13} />,      adminOnly: true },
    { key: "expenses",   label: "הוצאות",    icon: <Package size={13} /> },
    { key: "planning",   label: "תכנון",         icon: <Target    size={13} /> },
    { key: "matrix",     label: "מטריצה שבועית", icon: <Grid3x3   size={13} />, adminOnly: true },
    { key: "income",     label: "הכנסות",        icon: <DollarSign size={13} />, adminOnly: true },
    { key: "reports",    label: "דוחות",      icon: <BarChart2 size={13} />,      adminOnly: true },
  ].filter(t => !t.adminOnly || isAdmin) as TabDef[];

  const activeProjects = projects.filter(p => p.status === "active");

  return (
    <>
    <SuccessFlash show={showFlash} onDone={() => setShowFlash(false)} />
    <div dir="rtl" className="min-h-screen bg-bone px-4 py-8 font-body text-charcoal">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/he" className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-accent/60 hover:text-accent transition-colors duration-200">
              בניין איתן
            </Link>
            <h1 className="font-heading text-2xl font-bold text-charcoal">
              {isAdmin ? "ממשק מנהל" : foremanName ? `ברוך הבא, ${foremanName}` : "ממשק מנהל עבודה"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin/health"
                className="flex items-center gap-1.5 border border-charcoal/15 px-3 py-1.5 text-xs text-charcoal/40 hover:border-accent hover:text-accent transition-colors duration-200">
                <Activity size={12} strokeWidth={1.5} />
                סטטוס מערכת
              </Link>
            )}
            <button onClick={handleLogout}
              className="border border-charcoal/20 px-3 py-1.5 text-xs text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
              יציאה
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className={`grid gap-2 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
          {isAdmin && (
            <>
              {[
                { label: "עובדים פעילים", value: staff.filter(s => s.active).length, color: "text-green-600" },
                { label: "באתר כרגע",     value: onSite.length,                       color: "text-accent" },
                { label: "כניסות היום",   value: todayLogs.filter(r => r.action === "כניסה" || r.action === "in").length, color: "text-charcoal/60" },
                { label: "פרויקטים",      value: activeProjects.length,               color: "text-charcoal/50" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-warm-gray-light p-3 text-center">
                  <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[0.6rem] text-charcoal/40 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </>
          )}
          {isForeman && (
            <>
              {[
                { label: "באתר כרגע",    value: onSite.length,                        color: "text-accent" },
                { label: "משימות פעילות", value: tasks.filter(t => t.status === "in_progress").length, color: "text-amber-600" },
                { label: "פרויקטים",     value: activeProjects.length,                color: "text-charcoal/60" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-warm-gray-light p-3 text-center">
                  <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[0.6rem] text-charcoal/40 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-charcoal/10 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap border-b-2 transition-colors duration-150 ${tab === t.key ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal/70"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-4">

            {/* On-site */}
            <Card title="⚡ מי באתר כרגע">
              {onSite.length === 0 ? (
                <p className="text-sm text-charcoal/30 text-center py-2">אין עובדים מדווחים כרגע</p>
              ) : (
                <div className="divide-y divide-charcoal/5">
                  {onSite.map(({ record, worker }) => {
                    const t = record.timestamp_label
                      ? record.timestamp_label.split(" ")[1]
                      : new Date(record.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={record.id} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{record.staff?.name ?? "—"}</p>
                          <p className="text-[0.65rem] text-charcoal/40">{record.staff?.role ?? ""}</p>
                        </div>
                        {record.project && (
                          <div className="flex items-center gap-1 text-[0.65rem] text-charcoal/50">
                            <Building2 size={10} strokeWidth={1.5} />
                            <span className="truncate max-w-[80px]">{record.project.name}</span>
                          </div>
                        )}
                        {isAdmin && worker?.daily_rate && (
                          <span className="text-[0.65rem] text-accent/70 shrink-0">₪{worker.daily_rate}/יום</span>
                        )}
                        <span className="text-[0.7rem] text-green-600 tabular-nums shrink-0">מ-{t}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Admin: daily spend */}
            {isAdmin && (
              <Card title="💰 עלויות היום">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-1.5 border-b border-charcoal/5">
                    <span className="text-sm text-charcoal/60">שכר עובדים (אומדן)</span>
                    <span className="text-sm font-semibold tabular-nums">₪{Math.round(laborEstimate).toLocaleString("he-IL")}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-charcoal/5">
                    <span className="text-sm text-charcoal/60">הוצאות שנרשמו היום</span>
                    <span className="text-sm font-semibold tabular-nums">₪{Math.round(todayExpensesTotal).toLocaleString("he-IL")}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold">סה&quot;כ</span>
                    <span className="text-base font-bold text-accent tabular-nums">
                      ₪{Math.round(laborEstimate + todayExpensesTotal).toLocaleString("he-IL")}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Foreman: project costs */}
            {isForeman && activeProjects.length > 0 && (
              <Card title="📊 עלויות לפי פרויקט">
                <div className="divide-y divide-charcoal/5">
                  {activeProjects.map(p => {
                    const expTotal = budget.find(b => b.project_id === p.id)?.total ?? 0;
                    const taskCount = tasks.filter(t => t.project_id === p.id && t.status !== "completed").length;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-[0.65rem] text-charcoal/40">{taskCount} משימות פעילות</p>
                        </div>
                        <span className="text-sm font-bold text-accent tabular-nums shrink-0">
                          {expTotal > 0 ? `₪${expTotal.toLocaleString("he-IL")}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Admin: profitability */}
            {isAdmin && activeProjects.length > 0 && Object.keys(incomeTotals).length > 0 && (
              <Card title="📈 רווחיות לפי פרויקט">
                <div className="divide-y divide-charcoal/5">
                  {activeProjects.map(p => {
                    const exp    = budget.find(b => b.project_id === p.id)?.total ?? 0;
                    const inc    = incomeTotals[p.id] ?? 0;
                    const profit = inc - exp;
                    return (
                      <div key={p.id} className="py-2.5 space-y-1">
                        <p className="text-sm font-semibold">{p.name}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <p className="text-[0.6rem] text-charcoal/40">הכנסות</p>
                            <p className="font-bold text-green-600 tabular-nums">₪{inc.toLocaleString("he-IL")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.6rem] text-charcoal/40">הוצאות</p>
                            <p className="font-bold text-red-500 tabular-nums">₪{exp.toLocaleString("he-IL")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.6rem] text-charcoal/40">רווח נקי</p>
                            <p className={`font-bold tabular-nums ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {profit >= 0 ? "+" : ""}₪{profit.toLocaleString("he-IL")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Today's tasks */}
            <Card title="📋 משימות היום">
              {todayTasks.length === 0 ? (
                <p className="text-sm text-charcoal/30 text-center py-2">אין משימות פעילות להיום</p>
              ) : (
                <div className="divide-y divide-charcoal/5">
                  {todayTasks.map(t => {
                    const proj = projects.find(p => p.id === t.project_id);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2.5 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{t.task_name}</p>
                          <div className="flex items-center gap-1 text-[0.65rem] text-charcoal/40 mt-0.5">
                            {proj && <><Building2 size={9} strokeWidth={1.5} /><span>{proj.name}</span></>}
                            {t.contractor && <span className="ms-1">· {t.contractor}</span>}
                          </div>
                        </div>
                        <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                        {t.status !== "in_progress" && (
                          <button onClick={() => setTaskStatus(t.id, "in_progress")} className="text-[0.65rem] border border-amber-300 px-2 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">הפעל</button>
                        )}
                        {t.status !== "completed" && (
                          <button onClick={() => setTaskStatus(t.id, "completed")} className="text-[0.65rem] border border-green-300 px-2 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">סיים</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Role breakdown (admin) */}
            {isAdmin && Object.keys(roleMap).length > 0 && (
              <Card title="נוכחות לפי תפקיד">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(roleMap).map(([role, count]) => (
                    <div key={role} className="flex items-center gap-2 bg-bone px-3 py-1.5 border border-charcoal/10">
                      <span className="text-sm font-bold text-accent">{count}</span>
                      <span className="text-xs text-charcoal/60">{role}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── ATTENDANCE (admin only) ────────────────────────────────────────── */}
        {tab === "attendance" && isAdmin && (
          <div className="space-y-5">

            {/* Attendance report — date pickers + view + print */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">דוח נוכחות</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
                <div>
                  <label className="block text-[0.68rem] text-charcoal/50 mb-1 font-body">מתאריך</label>
                  <input type="date" value={attReportFrom}
                    onChange={e => { setAttReportFrom(e.target.value); setAttReportData(null); }}
                    className="w-full border border-warm-gray-light bg-bone text-charcoal text-sm px-3 py-2 focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[0.68rem] text-charcoal/50 mb-1 font-body">עד תאריך</label>
                  <input type="date" value={attReportTo}
                    onChange={e => { setAttReportTo(e.target.value); setAttReportData(null); }}
                    className="w-full border border-warm-gray-light bg-bone text-charcoal text-sm px-3 py-2 focus:outline-none focus:border-accent" />
                </div>
                <button onClick={fetchAttReport} disabled={attReportLoading || !attReportFrom || !attReportTo}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-bone text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors whitespace-nowrap">
                  {attReportLoading
                    ? <><Loader2 size={13} className="animate-spin" /> טוען...</>
                    : <><BarChart2 size={13} /> הצג דוח</>}
                </button>
                <button onClick={printAttReport} disabled={attReportLoading || !attReportFrom || !attReportTo}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-bone disabled:opacity-40 transition-colors whitespace-nowrap">
                  <Download size={13} /> הורד PDF
                </button>
              </div>
              {attReportErr && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle size={12} /> {attReportErr}
                </p>
              )}
            </Card>

            {/* ── Inline attendance report view ─────────────────────────────── */}
            {attReportData && (() => {
              const { rows, summary, from, to } = attReportData;

              // Group by worker
              const byWorker = new Map<string, AttReportRow[]>();
              for (const r of rows) {
                if (!byWorker.has(r.staff_name)) byWorker.set(r.staff_name, []);
                byWorker.get(r.staff_name)!.push(r);
              }

              // Group by date (DD.MM.YYYY) sorted ascending
              const byDate = new Map<string, AttReportRow[]>();
              for (const r of rows) {
                if (!byDate.has(r.date)) byDate.set(r.date, []);
                byDate.get(r.date)!.push(r);
              }
              const sortedDates = [...byDate.keys()].sort((a, b) => {
                const s = (d: string) => d.split(".").reverse().join("-");
                return s(a).localeCompare(s(b));
              });

              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p className="text-[0.68rem] text-charcoal/40 font-body">
                      דוח נוכחות — {from} עד {to}
                    </p>
                    <span className="text-[0.62rem] text-accent font-semibold border border-accent/30 px-2 py-0.5">
                      {rows.length} רשומות · {summary.length} עובדים
                    </span>
                  </div>

                  {/* Summary cards — per worker totals */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {summary.map(s => (
                      <div key={s.phone} className="bg-bone border border-warm-gray-light p-3">
                        <p className="font-heading font-bold text-sm text-charcoal truncate">{s.name}</p>
                        <p className="text-[0.62rem] text-charcoal/40 mt-0.5">{s.phone}</p>
                        <div className="flex gap-3 mt-2">
                          <div>
                            <p className="text-lg font-heading font-bold text-accent leading-none">{s.days}</p>
                            <p className="text-[0.58rem] text-charcoal/40 leading-none mt-0.5">ימים</p>
                          </div>
                          <div className="w-px bg-warm-gray-light" />
                          <div>
                            <p className="text-lg font-heading font-bold text-charcoal leading-none">{s.hours.toFixed(1)}</p>
                            <p className="text-[0.58rem] text-charcoal/40 leading-none mt-0.5">שעות</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Daily summary per worker, grouped by date ── */}
                  {sortedDates.length > 0 && (
                    <Card>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} strokeWidth={1.5} className="text-accent" />
                        <h3 className="font-heading font-bold text-sm">סיכום יומי לפי עובד</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-bone text-charcoal/50">
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light w-16">יום</th>
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">תאריך</th>
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">עובד</th>
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">כניסה</th>
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">יציאה</th>
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">שעות</th>
                              <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">אתר עבודה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedDates.map(date => {
                              const dayRows = byDate.get(date)!;
                              // Derive day-of-week from "DD.MM.YYYY"
                              const [dd, mm, yyyy] = date.split(".");
                              const dow = DAYS_HE[new Date(`${yyyy}-${mm}-${dd}T12:00:00`).getDay()];
                              return dayRows.map((r, i) => (
                                <tr key={`${date}-${i}`}
                                  className={`hover:bg-bone/40 transition-colors ${i === dayRows.length - 1 ? "border-b-2 border-warm-gray-light" : ""}`}
                                  style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF9" }}>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/50 font-medium">
                                    {i === 0 ? dow : ""}
                                  </td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/70">
                                    {i === 0 ? date : ""}
                                  </td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light font-semibold">{r.staff_name}</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-green-700">{r.entry}</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-red-600">{r.exit}</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light font-bold text-accent">
                                    {r.hours !== null ? r.hours.toFixed(2) : <span className="text-charcoal/25">—</span>}
                                  </td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/55 text-[0.68rem] max-w-[160px] truncate">{r.project}</td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {/* Per-worker detail tables */}
                  {[...byWorker.entries()].map(([name, wRows]) => {
                    const ws = summary.find(s => s.name === name);
                    return (
                      <Card key={name}>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-warm-gray-light">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-accent" />
                            <p className="font-heading font-bold text-sm">{name}</p>
                            <span className="text-[0.6rem] text-charcoal/40">{ws?.phone}</span>
                          </div>
                          <div className="flex gap-3 text-[0.68rem] text-charcoal/50">
                            <span><strong className="text-charcoal">{ws?.days ?? 0}</strong> ימים</span>
                            <span><strong className="text-charcoal">{(ws?.hours ?? 0).toFixed(2)}</strong> שעות</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-bone text-charcoal/50">
                                <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">תאריך</th>
                                <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">כניסה</th>
                                <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">יציאה</th>
                                <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">שעות</th>
                                <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">אתר עבודה</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wRows.map((r, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-bone/60"}>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light font-medium">{r.date}</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-green-700">{r.entry}</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-red-600">{r.exit}</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light font-bold text-accent">
                                    {r.hours !== null ? r.hours.toFixed(2) : <span className="text-charcoal/25">—</span>}
                                  </td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/60 text-[0.68rem] max-w-[180px] truncate">{r.project}</td>
                                </tr>
                              ))}
                            </tbody>
                            {wRows.length > 1 && (
                              <tfoot>
                                <tr className="bg-bone font-semibold">
                                  <td colSpan={3} className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/50 text-[0.62rem]">סיכום</td>
                                  <td className="px-2.5 py-1.5 border border-warm-gray-light text-accent font-bold">
                                    {(ws?.hours ?? 0).toFixed(2)}
                                  </td>
                                  <td className="border border-warm-gray-light" />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </Card>
                    );
                  })}

                  {rows.length === 0 && (
                    <div className="text-center py-10 text-charcoal/30 text-sm">
                      לא נמצאו רשומות נוכחות לתקופה זו
                    </div>
                  )}
                </div>
              );
            })()}

            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-heading text-base font-bold">יומן היום</h2>
                  <p className="text-[0.6rem] text-charcoal/30 font-body mt-0.5">מתעדכן אוטומטית כל דקה</p>
                </div>
                <button onClick={reload} className="flex items-center gap-1.5 text-xs border border-accent/30 text-accent hover:bg-accent hover:text-bone px-3 py-1.5 transition-colors duration-150">
                  <RefreshCw size={12} strokeWidth={1.5} /> רענן עכשיו
                </button>
              </div>
              {dataLoading && <p className="text-sm text-charcoal/40 text-center py-4">טוען...</p>}
              {!dataLoading && attLoadErr && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded px-3 py-2.5 text-sm text-red-700 mb-3">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">שגיאה בטעינת דיווחי נוכחות</p>
                    <p className="text-xs text-red-500 mt-0.5">{attLoadErr}</p>
                    <p className="text-xs text-red-400 mt-1">בדוק <a href="/admin/health" className="underline">בדיקת מערכת</a> לאבחון המלא</p>
                  </div>
                </div>
              )}
              {!dataLoading && !attLoadErr && todayLogs.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין דיווחים היום — לחץ "רענן עכשיו" אם עובדים כבר דיווחו</p>}
              {!dataLoading && todayLogs.length > 0 && (
                <div className="divide-y divide-charcoal/5">
                  {todayLogs.map(r => editAttId === r.id ? (
                    <form key={r.id} onSubmit={handleEditAtt} className="py-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="פעולה">
                          <select value={editAttAction} onChange={e => setEditAttAction(e.target.value)} className={INPUT}>
                            <option value="כניסה">כניסה</option>
                            <option value="יציאה">יציאה</option>
                          </select>
                        </Field>
                        <Field label="שעה (תצוגה)">
                          <input value={editAttTimestamp} onChange={e => setEditAttTimestamp(e.target.value)} placeholder="08:30" className={INPUT} dir="ltr" />
                        </Field>
                      </div>
                      <Field label="אתר">
                        <select value={editAttProject} onChange={e => setEditAttProject(e.target.value)} className={INPUT}>
                          <option value="">ללא אתר</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </Field>
                      {editAttMsg && <p className="text-xs text-red-500">{editAttMsg}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={editAttLoading} className="flex-1 bg-accent py-2 text-xs font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">{editAttLoading ? "שומר..." : "שמור"}</button>
                        <button type="button" onClick={() => setEditAttId(null)} className="flex-1 border border-charcoal/20 py-2 text-xs text-charcoal/50 hover:border-accent transition-colors">ביטול</button>
                      </div>
                    </form>
                  ) : (
                    <div key={r.id} className="py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{r.staff?.name ?? "—"}</p>
                          <p className="text-[0.65rem] text-charcoal/35 tabular-nums" dir="ltr">{r.staff?.phone ?? ""}</p>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${r.action === "כניסה" || r.action === "in" ? "text-green-600" : "text-red-400"}`}>
                          {r.action === "in" ? "כניסה" : r.action === "out" ? "יציאה" : r.action}
                        </span>
                        <span className="text-[0.7rem] text-charcoal/35 tabular-nums shrink-0" dir="ltr">
                          {r.timestamp_label || new Date(r.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button onClick={() => startEditAtt(r)} className="text-charcoal/30 hover:text-accent transition-colors shrink-0 p-0.5">
                          <Pencil size={11} strokeWidth={1.5} />
                        </button>
                      </div>
                      {r.project && (
                        <div className="flex items-center gap-1 text-[0.65rem] text-charcoal/40">
                          <Building2 size={10} strokeWidth={1.5} /><span>{r.project.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── WORKERS (admin only) ───────────────────────────────────────────── */}
        {tab === "workers" && isAdmin && (
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={16} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">הוספת עובד</h2>
              </div>
              <form onSubmit={handleAddWorker} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="שם מלא"><input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="ישראל ישראלי" className={INPUT} /></Field>
                  <Field label="טלפון"><input value={newPhone} onChange={e => setNewPhone(e.target.value)} required placeholder="05X-XXXXXXX" type="tel" dir="ltr" className={INPUT} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="תפקיד">
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} className={INPUT}>
                      <option value="עובד">עובד</option><option value="ממונה">ממונה</option><option value="מנהל">מנהל</option>
                    </select>
                  </Field>
                  <Field label='ת"ז (אופציונלי)'>
                    <input value={newNationalId} onChange={e => setNewNationalId(e.target.value.replace(/\D/g, ""))} placeholder="123456789" inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="שכר שעתי (₪)"><input value={newHourlyRate} onChange={e => setNewHourlyRate(e.target.value)} type="number" min="0" step="0.5" placeholder="45.00" dir="ltr" className={INPUT} /></Field>
                  <Field label="שכר יומי (₪)"><input value={newDailyRate}  onChange={e => setNewDailyRate(e.target.value)}  type="number" min="0" step="1"   placeholder="350"   dir="ltr" className={INPUT} /></Field>
                </div>
                {newRole === "ממונה" && (
                  <Field label="PIN לכניסה לפורטל (4–8 ספרות)">
                    <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" maxLength={8} placeholder="1234" dir="ltr" className={INPUT} />
                  </Field>
                )}
                <Btn loading={addLoading}>הוסף עובד</Btn>
                {addMsg && <p className={`text-xs ${addMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{addMsg}</p>}
              </form>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-base font-bold">עובדים ({staff.length})</h2>
                <button onClick={reload} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
                  <RefreshCw size={12} strokeWidth={1.5} /> רענן
                </button>
              </div>
              {staff.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין עובדים רשומים</p>}
              <div className="divide-y divide-charcoal/5">
                {staff.map(s => editingId === s.id ? (
                  <form key={s.id} onSubmit={handleEditWorker} className="py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="שם"><input value={editName} onChange={e => setEditName(e.target.value)} required className={INPUT} /></Field>
                      <Field label="טלפון"><input value={editPhone} onChange={e => setEditPhone(e.target.value)} required type="tel" dir="ltr" className={INPUT} /></Field>
                      <Field label="תפקיד">
                        <select value={editRole} onChange={e => setEditRole(e.target.value)} className={INPUT}>
                          <option value="עובד">עובד</option><option value="ממונה">ממונה</option><option value="מנהל">מנהל</option>
                        </select>
                      </Field>
                      <Field label='ת"ז'><input value={editNationalId} onChange={e => setEditNationalId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} /></Field>
                      <Field label="שכר שעתי (₪)"><input value={editHourlyRate} onChange={e => setEditHourlyRate(e.target.value)} type="number" min="0" step="0.5" dir="ltr" className={INPUT} /></Field>
                      <Field label="שכר יומי (₪)"><input value={editDailyRate}  onChange={e => setEditDailyRate(e.target.value)}  type="number" min="0" step="1"   dir="ltr" className={INPUT} /></Field>
                    </div>
                    {editRole === "ממונה" && (
                      <Field label="PIN חדש (השאר ריק לשמירת הנוכחי)">
                        <input value={editPin} onChange={e => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" maxLength={8} placeholder="4–8 ספרות" dir="ltr" className={INPUT} />
                      </Field>
                    )}
                    {editMsg && <p className="text-xs text-red-500">{editMsg}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={editLoading} className="flex-1 bg-accent py-2 text-xs font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">{editLoading ? "שומר..." : "שמור"}</button>
                      <button type="button" onClick={() => setEditingId(null)} className="flex-1 border border-charcoal/20 py-2 text-xs text-charcoal/50 hover:border-accent transition-colors">ביטול</button>
                    </div>
                  </form>
                ) : (
                  <div key={s.id} className={`flex items-center justify-between py-3 gap-2 ${!s.active ? "opacity-45" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[0.7rem] text-charcoal/40 tabular-nums" dir="ltr">{s.phone}</p>
                      {(s.hourly_rate || s.daily_rate) && (
                        <p className="text-[0.65rem] text-accent/70">
                          {s.hourly_rate ? `₪${s.hourly_rate}/ש׳` : ""}{s.hourly_rate && s.daily_rate ? " · " : ""}{s.daily_rate ? `₪${s.daily_rate}/יום` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[0.65rem] text-charcoal/40">{s.role}</span>
                      {s.role === "ממונה" && (
                        <span className={`text-[0.55rem] px-1.5 py-0.5 ${s.has_pin ? "bg-accent/10 text-accent" : "bg-red-50 text-red-400"}`}>
                          {s.has_pin ? "PIN מוגדר" : "ללא PIN"}
                        </span>
                      )}
                    </div>
                    <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${s.active ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>{s.active ? "פעיל" : "לא פעיל"}</span>
                    <button onClick={() => startEdit(s)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">ערוך</button>
                    <button onClick={() => toggleActive(s.id, s.active)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">{s.active ? "השבת" : "הפעל"}</button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── PROJECTS (admin only) ──────────────────────────────────────────── */}
        {tab === "projects" && isAdmin && (
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">הוספת פרויקט</h2>
              </div>
              <form onSubmit={handleAddProject} className="space-y-3">
                <Field label="שם הפרויקט / אתר">
                  <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required placeholder="פרויקט רחוב הרצל 12" className={INPUT} />
                </Field>
                <Btn loading={projectAddLoading}>הוסף פרויקט</Btn>
                {projectAddMsg && <p className={`text-xs ${projectAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{projectAddMsg}</p>}
              </form>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-base font-bold">פרויקטים ({projects.length})</h2>
                <button onClick={reload} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /> רענן</button>
              </div>
              {projects.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין פרויקטים</p>}
              <div className="divide-y divide-charcoal/5">
                {projects.map((p: Project & { foreman_id?: string | null }) => {
                  const assignedForeman = staff.find(s => s.id === p.foreman_id);
                  return (
                  <div key={p.id} className={`py-3 space-y-2 ${p.status !== "active" ? "opacity-45" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-[0.65rem] text-charcoal/30">{tasks.filter(t => t.project_id === p.id && t.status !== "completed").length} משימות פעילות</p>
                      </div>
                      <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${p.status === "active" ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>{p.status === "active" ? "פעיל" : "לא פעיל"}</span>
                      <button onClick={() => toggleProjectStatus(p.id, p.status ?? "active")} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">{p.status === "active" ? "השבת" : "הפעל"}</button>
                    </div>
                    {/* Foreman assignment */}
                    <div className="flex items-center gap-2">
                      <span className="text-[0.65rem] text-charcoal/40 shrink-0">ממונה:</span>
                      <select
                        value={p.foreman_id ?? ""}
                        onChange={async e => {
                          await fetch(`/api/admin/projects/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foreman_id: e.target.value || null }) });
                          reload();
                        }}
                        className="flex-1 text-[0.65rem] border border-charcoal/10 bg-bone px-2 py-1 focus:border-accent focus:outline-none"
                      >
                        <option value="">— ללא ממונה —</option>
                        {staff.filter(s => s.role === "ממונה" && s.active).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {assignedForeman && (
                        <span className="text-[0.6rem] bg-accent/10 text-accent px-1.5 py-0.5 shrink-0">{assignedForeman.name}</span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── EXPENSES ──────────────────────────────────────────────────────── */}
        {tab === "expenses" && (
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">רישום הוצאה</h2>
              </div>
              <form onSubmit={handleAddMaterial} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="פרויקט">
                    <select value={matProjectId} onChange={e => setMatProjectId(e.target.value)} required className={INPUT}>
                      <option value="">בחר פרויקט...</option>
                      {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="קטגוריה">
                    <select value={matCategory} onChange={e => setMatCategory(e.target.value)} className={INPUT}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="תיאור / פריט"><input value={matName} onChange={e => setMatName(e.target.value)} required placeholder="בטון, שרברב..." className={INPUT} /></Field>
                  <Field label="ספק"><input value={matSupplier} onChange={e => setMatSupplier(e.target.value)} placeholder="שם הספק" className={INPUT} /></Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="כמות"><input value={matQty} onChange={e => setMatQty(e.target.value)} type="number" min="0" step="any" className={INPUT} dir="ltr" /></Field>
                  <Field label="יחידה">
                    <select value={matUnit} onChange={e => setMatUnit(e.target.value)} className={INPUT}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                  <Field label="עלות (₪)"><input value={matCost} onChange={e => setMatCost(e.target.value)} type="number" min="0" step="any" placeholder="0.00" className={INPUT} dir="ltr" /></Field>
                </div>
                <Btn loading={matLoading} disabled={!matProjectId}>רשום הוצאה</Btn>
                {matMsg && <p className={`text-xs ${matMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{matMsg}</p>}
              </form>
            </Card>

            {materials.length > 0 && (
              <Card title="סיכום לפי קטגוריה">
                <div className="divide-y divide-charcoal/5">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const total = materials.filter(m => (m.category ?? "חומרים") === cat).reduce((s, m) => s + (m.cost ?? 0), 0);
                    if (!total) return null;
                    return (
                      <div key={cat} className="flex justify-between items-center py-2">
                        <span className="text-sm text-charcoal/60">{cat}</span>
                        <span className="text-sm font-semibold tabular-nums">₪{total.toLocaleString("he-IL")}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-bold">סה&quot;כ</span>
                    <span className="text-base font-bold text-accent tabular-nums">₪{budget.reduce((s, b) => s + b.total, 0).toLocaleString("he-IL")}</span>
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-sm font-bold">יומן הוצאות</h2>
                <div className="flex items-center gap-2">
                  <select value={matFilter} onChange={e => setMatFilter(e.target.value)} className="text-xs border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none">
                    <option value="">כל הפרויקטים</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={loadMaterials} className="text-charcoal/40 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
                </div>
              </div>
              {materials.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין הוצאות רשומות</p>}
              <div className="divide-y divide-charcoal/5">
                {materials.map(m => (
                  <div key={m.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{m.material_name}</p>
                      <p className="text-[0.7rem] text-charcoal/40">
                        {m.category && <span className="bg-charcoal/5 px-1.5 py-0.5 me-1.5">{m.category}</span>}
                        {m.quantity} {m.unit}{m.supplier ? ` · ${m.supplier}` : ""}
                      </p>
                    </div>
                    {m.cost != null && <span className="text-sm font-bold text-accent tabular-nums shrink-0">₪{m.cost.toLocaleString("he-IL")}</span>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── PLANNING ──────────────────────────────────────────────────────── */}
        {tab === "planning" && (
          <div className="space-y-5">

            {/* ── Add milestone ──────────────────────────────────────────── */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Flag size={15} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">הוספת אבן דרך</h2>
              </div>
              <form onSubmit={handleAddMilestone} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="פרויקט">
                    <select value={newMsProjectId} onChange={e => { setNewMsProjectId(e.target.value); setNewTaskMilestoneId(""); }} required className={INPUT}>
                      <option value="">בחר פרויקט...</option>
                      {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="יעד תאריך">
                    <input type="date" value={newMsTargetDate} onChange={e => setNewMsTargetDate(e.target.value)} className={INPUT} dir="ltr" />
                  </Field>
                </div>
                <Field label="שם אבן הדרך">
                  <input value={newMsName} onChange={e => setNewMsName(e.target.value)} required placeholder="בסיס ושלד, גמר פנים, מסירה..." className={INPUT} />
                </Field>
                <Btn loading={msAddLoading} disabled={!newMsProjectId}>הוסף אבן דרך</Btn>
                {msAddMsg && <p className={`text-xs ${msAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{msAddMsg}</p>}
              </form>
            </Card>

            {/* ── Add task ───────────────────────────────────────────────── */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare2 size={15} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">הוספת משימה שבועית</h2>
              </div>
              <form onSubmit={handleAddTask} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="פרויקט">
                    <select value={newTaskProjectId} onChange={e => { setNewTaskProjectId(e.target.value); setNewTaskMilestoneId(""); }} required className={INPUT}>
                      <option value="">בחר פרויקט...</option>
                      {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="תחת אבן דרך">
                    <select value={newTaskMilestoneId} onChange={e => setNewTaskMilestoneId(e.target.value)} className={INPUT}>
                      <option value="">ללא אבן דרך</option>
                      {milestones.filter(m => m.project_id === newTaskProjectId && m.status !== "completed").map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="שם המשימה">
                    <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} required placeholder="ריצוף, גבס, אינסטלציה..." className={INPUT} />
                  </Field>
                  <Field label="קבלן / צוות">
                    <input value={newTaskContractor} onChange={e => setNewTaskContractor(e.target.value)} placeholder="שם קבלן" className={INPUT} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="תאריך התחלה"><input type="date" value={newTaskStart} onChange={e => setNewTaskStart(e.target.value)} className={INPUT} dir="ltr" /></Field>
                  <Field label="תאריך סיום">  <input type="date" value={newTaskEnd}   onChange={e => setNewTaskEnd(e.target.value)}   className={INPUT} dir="ltr" /></Field>
                </div>
                <Btn loading={taskAddLoading} disabled={!newTaskProjectId}>הוסף משימה</Btn>
                {taskAddMsg && <p className={`text-xs ${taskAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{taskAddMsg}</p>}
              </form>
            </Card>

            {/* ── Weekly look-ahead ──────────────────────────────────────── */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} strokeWidth={1.5} className="text-accent" />
                  <h2 className="font-heading text-sm font-bold">לוח שבועי — שבוע נוכחי</h2>
                </div>
                <button onClick={reload} className="text-charcoal/40 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
              </div>

              {/* Unscheduled this week */}
              {(() => {
                const weekDateSet = new Set(weekDays.map(d => d.date));
                const unscheduled = tasks.filter(t => t.status !== "completed" && (!t.start_date || !weekDateSet.has(t.start_date)));
                if (!unscheduled.length) return null;
                return (
                  <div className="mb-4 space-y-2">
                    <p className="text-[0.65rem] font-bold tracking-widest uppercase text-charcoal/30">ללא לו&quot;ז לשבוע זה</p>
                    {unscheduled.map(t => (
                      <div key={t.id} className="bg-bone border border-charcoal/10 p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckSquare2 size={11} strokeWidth={1.5} className="text-charcoal/20 shrink-0" />
                          <p className="text-xs font-semibold flex-1 truncate">{t.task_name}</p>
                          <span className={`text-[0.6rem] px-1.5 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {weekDays.map(d => (
                            <button key={d.date} onClick={() => assignTaskDay(t.id, d.date)}
                              className={`text-[0.6rem] px-2 py-1 border transition-colors ${d.date === todayStr ? "border-accent text-accent" : "border-charcoal/15 text-charcoal/50 hover:border-accent hover:text-accent"}`}>
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
                {weekDays.map(day => {
                  const dayTasks = tasks.filter(t => t.start_date === day.date && t.status !== "completed");
                  const isToday  = day.date === todayStr;
                  return (
                    <div key={day.date} className={`border ${isToday ? "border-accent/40" : "border-charcoal/10"}`}>
                      <div className={`flex items-center justify-between px-3 py-2 ${isToday ? "bg-accent/[0.05]" : "bg-charcoal/[0.02]"}`}>
                        <span className={`text-xs font-bold ${isToday ? "text-accent" : "text-charcoal/60"}`}>{day.label}</span>
                        <span className="text-[0.6rem] text-charcoal/30 tabular-nums" dir="ltr">{day.short}</span>
                      </div>
                      {dayTasks.length === 0 ? (
                        <p className="text-[0.6rem] text-charcoal/20 text-center py-1.5">ריק</p>
                      ) : (
                        <div className="divide-y divide-charcoal/5">
                          {dayTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                              <CheckSquare2 size={11} strokeWidth={1.5} className={`shrink-0 ${t.status === "in_progress" ? "text-amber-500" : "text-charcoal/20"}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{t.task_name}</p>
                                {t.contractor && <p className="text-[0.6rem] text-charcoal/40">{t.contractor}</p>}
                              </div>
                              {t.status === "planned" && (
                                <button onClick={() => setTaskStatus(t.id, "in_progress")} className="text-[0.6rem] border border-amber-300 px-1.5 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">▶</button>
                              )}
                              {t.status !== "completed" && (
                                <button onClick={() => setTaskStatus(t.id, "completed")} className="text-[0.6rem] border border-green-300 px-1.5 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">✓</button>
                              )}
                              <button onClick={() => assignTaskDay(t.id, null)} className="text-[0.6rem] text-charcoal/20 hover:text-red-400 transition-colors shrink-0">✕</button>
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
              const delayed   = tasks.filter(t => t.status === "delayed");
              const notReady  = tasks.filter(t => t.status !== "completed" && t.status !== "delayed" && (!t.material_ready || !t.sub_confirmed || !t.equipment_on_site));
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
                      const proj = projects.find(p => p.id === t.project_id);
                      return (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100">
                          <span className="text-[0.6rem] px-1.5 py-0.5 bg-red-100 text-red-700 font-semibold shrink-0">עיכוב</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{t.task_name}</p>
                            <p className="text-[0.6rem] text-charcoal/40">{proj?.name}{t.delay_reason ? ` · ${DELAY_REASON_HE[t.delay_reason] ?? t.delay_reason}` : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                    {notReady.map(t => {
                      const proj    = projects.find(p => p.id === t.project_id);
                      const missing = [
                        !t.material_ready    && "חומרים",
                        !t.sub_confirmed     && "קבלן משנה",
                        !t.equipment_on_site && "ציוד",
                      ].filter(Boolean).join(", ");
                      return (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100">
                          <span className="text-[0.6rem] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-semibold shrink-0">לא מוכן</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{t.task_name}</p>
                            <p className="text-[0.6rem] text-charcoal/40">{proj?.name}{missing ? ` · חסר: ${missing}` : ""}</p>
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
                  <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="text-xs border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none">
                    <option value="">כל הפרויקטים</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={reload} className="text-charcoal/40 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
                </div>
              </div>

              {milestones.filter(m => !taskFilter || m.project_id === taskFilter).length === 0 && (
                <p className="text-sm text-charcoal/30 text-center py-6">אין אבני דרך — הוסף אחת למעלה</p>
              )}

              {milestones
                .filter(m => !taskFilter || m.project_id === taskFilter)
                .map(ms => {
                  const msTasks     = tasks.filter(t => t.milestone_id === ms.id);
                  const doneCount   = msTasks.filter(t => t.status === "completed").length;
                  const delayCount  = msTasks.filter(t => t.status === "delayed").length;
                  const pct         = msTasks.length ? Math.round((doneCount / msTasks.length) * 100) : 0;
                  const isExpanded  = expandedMs.has(ms.id);
                  const proj        = projects.find(p => p.id === ms.project_id);

                  return (
                    <div key={ms.id} className={`border ${ms.status === "completed" ? "border-charcoal/8 opacity-60" : delayCount > 0 ? "border-red-200" : "border-charcoal/15"} bg-white`}>
                      {/* Milestone header */}
                      <button onClick={() => toggleMs(ms.id)} className="w-full flex items-center gap-2.5 px-4 py-3 text-right hover:bg-bone/60 transition-colors">
                        <Target size={14} strokeWidth={1.5} className={`shrink-0 ${ms.status === "completed" ? "text-green-500" : ms.status === "in_progress" ? "text-amber-500" : "text-accent/50"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${ms.status === "completed" ? "line-through text-charcoal/50" : "text-charcoal"}`}>{ms.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {proj && <span className="text-[0.6rem] text-charcoal/35">{proj.name}</span>}
                            {ms.target_date && <span className="text-[0.6rem] text-charcoal/35 tabular-nums" dir="ltr">· {ms.target_date}</span>}
                          </div>
                          {msTasks.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex-1 h-1 bg-charcoal/8 overflow-hidden">
                                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[0.55rem] text-charcoal/35 tabular-nums shrink-0">{pct}%</span>
                            </div>
                          )}
                        </div>
                        {delayCount > 0 && <span className="text-[0.6rem] px-1.5 py-0.5 bg-red-50 text-red-600 shrink-0">{delayCount} עיכוב</span>}
                        <span className={`text-[0.6rem] px-2 py-0.5 shrink-0 ${MILESTONE_STATUS_CLS[ms.status]}`}>{MILESTONE_STATUS_HE[ms.status]}</span>
                        <span className="text-[0.6rem] text-charcoal/30 shrink-0 tabular-nums">{doneCount}/{msTasks.length}</span>
                        {isExpanded ? <ChevronUp size={13} strokeWidth={1.5} className="shrink-0 text-charcoal/30" /> : <ChevronDown size={13} strokeWidth={1.5} className="shrink-0 text-charcoal/30" />}
                      </button>

                      {/* Expanded body */}
                      {isExpanded && (
                        <div className="border-t border-charcoal/8">
                          {msTasks.length === 0 ? (
                            <p className="text-[0.65rem] text-charcoal/25 text-center py-3">אין משימות תחת אבן דרך זו</p>
                          ) : (
                            <div className="divide-y divide-charcoal/5">
                              {msTasks.map(t => (
                                <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 ${t.status === "completed" ? "opacity-50" : ""}`}>
                                  <CheckSquare2 size={12} strokeWidth={1.5} className={`shrink-0 ${t.status === "completed" ? "text-green-500" : t.status === "in_progress" ? "text-amber-400" : t.status === "delayed" ? "text-red-400" : "text-charcoal/20"}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold truncate ${t.status === "completed" ? "line-through" : ""}`}>{t.task_name}</p>
                                    <div className="flex items-center gap-2 text-[0.6rem] text-charcoal/35 mt-0.5 flex-wrap">
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
                                  <span className={`text-[0.6rem] px-1.5 py-0.5 shrink-0 ${STATUS_CLS[t.status] ?? ""}`}>{STATUS_HE[t.status] ?? t.status}</span>
                                  {t.status !== "completed" && (
                                    <>
                                      {t.status === "planned" && (
                                        <button onClick={() => setTaskStatus(t.id, "in_progress")} className="text-[0.6rem] border border-amber-300 px-1.5 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">▶</button>
                                      )}
                                      {t.status === "in_progress" && (
                                        <button onClick={() => setTaskStatus(t.id, "planned")} className="text-[0.6rem] border border-charcoal/20 px-1.5 py-0.5 text-charcoal/40 hover:border-accent transition-colors shrink-0">⏸</button>
                                      )}
                                      <button onClick={() => setTaskStatus(t.id, "completed")} className="text-[0.6rem] border border-green-300 px-1.5 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">✓</button>
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
                                <button onClick={() => setMilestoneStatus(ms.id, "in_progress")} className="text-[0.65rem] border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50 transition-colors">▶ הפעל אבן דרך</button>
                              )}
                              {ms.status === "in_progress" && (
                                <button onClick={() => setMilestoneStatus(ms.id, "pending")} className="text-[0.65rem] border border-charcoal/20 px-3 py-1 text-charcoal/50 hover:border-accent transition-colors">⏸ עצור</button>
                              )}
                              <button onClick={() => setMilestoneStatus(ms.id, "completed")} className="text-[0.65rem] border border-green-300 px-3 py-1 text-green-700 hover:bg-green-50 transition-colors">✓ סיים אבן דרך</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Free tasks (no milestone) */}
              {(() => {
                const free = tasks.filter(t => !t.milestone_id && t.status !== "completed" && (!taskFilter || t.project_id === taskFilter));
                if (!free.length) return null;
                return (
                  <div className="border border-charcoal/10 bg-white">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-charcoal/[0.02] border-b border-charcoal/8">
                      <Hammer size={12} strokeWidth={1.5} className="text-charcoal/30" />
                      <p className="text-xs font-semibold text-charcoal/50">משימות ללא אבן דרך</p>
                    </div>
                    <div className="divide-y divide-charcoal/5">
                      {free.map(t => {
                        const proj = projects.find(p => p.id === t.project_id);
                        return (
                          <div key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                            <CheckSquare2 size={12} strokeWidth={1.5} className="shrink-0 text-charcoal/20" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{t.task_name}</p>
                              <div className="flex items-center gap-2 text-[0.6rem] text-charcoal/35 mt-0.5">
                                {proj && <span>{proj.name}</span>}
                                {t.contractor && <span>· {t.contractor}</span>}
                              </div>
                            </div>
                            <span className={`text-[0.6rem] px-1.5 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                            {t.status === "planned" && <button onClick={() => setTaskStatus(t.id, "in_progress")} className="text-[0.6rem] border border-amber-300 px-1.5 py-0.5 text-amber-700 hover:bg-amber-50 shrink-0">▶</button>}
                            <button onClick={() => setTaskStatus(t.id, "completed")} className="text-[0.6rem] border border-green-300 px-1.5 py-0.5 text-green-700 hover:bg-green-50 shrink-0">✓</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── INCOME (admin only) ────────────────────────────────────────────── */}
        {tab === "income" && isAdmin && (
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">רישום תשלום</h2>
              </div>
              <form onSubmit={handleAddIncome} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="פרויקט">
                    <select value={incProjectId} onChange={e => setIncProjectId(e.target.value)} required className={INPUT}>
                      <option value="">בחר פרויקט...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="תאריך קבלה"><input type="date" value={incDate} onChange={e => setIncDate(e.target.value)} className={INPUT} dir="ltr" /></Field>
                </div>
                <Field label="סכום (₪)"><input value={incAmount} onChange={e => setIncAmount(e.target.value)} required type="number" min="1" step="any" placeholder="10,000" dir="ltr" className={INPUT} /></Field>
                <Field label="תיאור / הערה"><input value={incDesc} onChange={e => setIncDesc(e.target.value)} placeholder="מקדמה ראשונה, תשלום סופי..." className={INPUT} /></Field>
                <Btn loading={incLoading} disabled={!incProjectId || !incAmount}>רשום תשלום</Btn>
                {incMsg && <p className={`text-xs ${incMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{incMsg}</p>}
              </form>
            </Card>

            {income.length > 0 && (
              <>
                <Card title="סיכום הכנסות לפי פרויקט">
                  <div className="divide-y divide-charcoal/5">
                    {Object.entries(incomeTotals).map(([projId, total]) => {
                      const proj = projects.find(p => p.id === projId);
                      return (
                        <div key={projId} className="flex justify-between items-center py-2">
                          <span className="text-sm text-charcoal/60 truncate flex-1">{proj?.name ?? projId}</span>
                          <span className="text-sm font-semibold tabular-nums text-green-600">₪{total.toLocaleString("he-IL")}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold">סה&quot;כ הכנסות</span>
                      <span className="text-base font-bold text-green-600 tabular-nums">
                        ₪{Object.values(incomeTotals).reduce((a, b) => a + b, 0).toLocaleString("he-IL")}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card title="יומן תשלומים">
                  <div className="divide-y divide-charcoal/5">
                    {income.map(r => (
                      <div key={r.id} className="py-2.5 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {(r.project as { name?: string } | null)?.name ?? projects.find(p => p.id === r.project_id)?.name ?? "—"}
                          </p>
                          {r.description && <p className="text-[0.7rem] text-charcoal/40">{r.description}</p>}
                          <p className="text-[0.65rem] text-charcoal/30 tabular-nums" dir="ltr">{r.received_date}</p>
                        </div>
                        <span className="text-sm font-bold text-green-600 tabular-nums shrink-0">+₪{r.amount.toLocaleString("he-IL")}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── REPORTS (admin only) ───────────────────────────────────────────── */}
        {tab === "reports" && isAdmin && (
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList size={16} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">הגשת דוח יומי</h2>
              </div>
              <form onSubmit={handleAddReport} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="פרויקט">
                    <select value={reportProjectId} onChange={e => setReportProjectId(e.target.value)} required className={INPUT}>
                      <option value="">בחר פרויקט...</option>
                      {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="תאריך"><input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className={INPUT} dir="ltr" /></Field>
                </div>
                <Field label="מזג אוויר">
                  <select value={reportWeather} onChange={e => setReportWeather(e.target.value)} className={INPUT}>
                    <option value="">בחר...</option>
                    {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
                <Field label="סיכום עבודה">
                  <textarea value={reportSummary} onChange={e => setReportSummary(e.target.value)} placeholder="תאר את עבודת היום..." rows={4} className={`${INPUT} resize-none`} />
                </Field>
                <Field label="אירועים מיוחדים">
                  <textarea value={reportSpecial} onChange={e => setReportSpecial(e.target.value)} placeholder="תקלות, ביקורת, הנחיות..." rows={2} className={`${INPUT} resize-none`} />
                </Field>
                <Btn loading={reportLoading} disabled={!reportProjectId}>שמור דוח</Btn>
                {reportMsg && <p className={`text-xs ${reportMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{reportMsg}</p>}
              </form>
            </Card>

            {reports.length > 0 && (
              <Card title="דוחות אחרונים">
                <div className="divide-y divide-charcoal/5">
                  {reports.slice(0, 10).map(r => (
                    <div key={r.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{(r.project as { name?: string } | null)?.name ?? r.project_id}</p>
                        <span className="text-[0.7rem] text-charcoal/40 tabular-nums">{r.date}</span>
                      </div>
                      {r.weather        && <p className="text-xs text-charcoal/50">{r.weather}</p>}
                      {r.summary        && <p className="text-xs text-charcoal/70 line-clamp-2">{r.summary}</p>}
                      {r.special_events && <p className="text-xs text-amber-600 line-clamp-1">⚠️ {r.special_events}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── WEEKLY MATRIX (admin only) ─────────────────────────────────────── */}
        {tab === "matrix" && isAdmin && (
          <div className="p-1">
            <WeeklyPlanner projects={activeProjects} />
          </div>
        )}

        <p className="text-center font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20 pt-2">
          בניין איתן — פורטל ניהול פנימי
        </p>
      </div>
    </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const INPUT = "w-full border border-charcoal/15 bg-bone px-3 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[0.7rem] text-charcoal/50">{label}</label>
      {children}
    </div>
  );
}

function Btn({ loading, disabled, children }: { loading: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full bg-accent py-3 text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200">
      {loading ? "שומר..." : children}
    </button>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-warm-gray-light p-5 space-y-3">
      {title && <h2 className="font-heading text-sm font-bold">{title}</h2>}
      {children}
    </div>
  );
}
