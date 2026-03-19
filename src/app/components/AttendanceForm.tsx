"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogIn, LogOut, MapPin, CheckCircle, AlertCircle, Loader2,
  ChevronRight, RefreshCw, UserPlus, Lock, Building2,
  ClipboardList, Package, BarChart2, LayoutDashboard, Hammer, Pencil,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Step      = "phone" | "locating" | "project" | "ready" | "submitting" | "success" | "error";
type AdminView = "none" | "password" | "dashboard";
type AdminTab  = "dashboard" | "attendance" | "workers" | "projects" | "expenses" | "planning" | "reports";

interface GeoCoords { lat: number; lng: number; }
interface StaffMember {
  id: string; name: string; phone: string; role: string; active: boolean;
  national_id?: string | null; hourly_rate?: number | null; daily_rate?: number | null;
}
interface AttendanceRecord {
  id: string; action: string; timestamp_label: string; recorded_at: string;
  staff: { id: string; name: string; phone: string; role?: string } | null;
  project: { id: string; name: string } | null;
}
interface Project { id: string; name: string; status?: string; }
interface DailyReport {
  id: string; project_id: string; date: string; weather: string | null;
  summary: string | null; special_events: string | null; created_at: string;
  project: { id: string; name: string } | null;
}
interface Material {
  id: string; project_id: string; material_name: string; quantity: number;
  unit: string; supplier: string | null; cost: number | null; category?: string; created_at: string;
}
interface BudgetLine { project_id: string; project_name: string; total: number; }
interface Task {
  id: string; project_id: string; task_name: string; start_date: string | null;
  end_date: string | null; contractor: string | null;
  status: "planned" | "in_progress" | "completed";
  notes: string | null; project?: { id: string; name: string } | null;
}

const EXPENSE_CATEGORIES = ["חומרים", "קבלן משנה", "הזמנות", "כלי עבודה"];
const UNITS = ["יחידות", "קוב", 'מ"ר', 'מ"א', "טון", 'ק"ג', "ליטר"];
const WEATHER_OPTIONS = ["☀️ בהיר", "⛅ מעונן חלקית", "☁️ מעונן", "🌧️ גשום", "🌩️ סוערת", "🌬️ רוחות חזקות"];
const STATUS_HE: Record<string, string> = { planned: "מתוכנן", in_progress: "בביצוע", completed: "הושלם" };
const STATUS_CLS: Record<string, string> = {
  planned: "bg-charcoal/5 text-charcoal/60",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
};

function nowLabel() {
  return new Date().toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AttendanceForm({ lang = "he" }: { lang?: "he" | "en" }) {
  const portalHref = `/${lang}/internal`;
  const backLabel  = lang === "he" ? "חזור לתפריט הראשי" : "Back to Portal";

  // ── Worker attendance state ──────────────────────────────────────────────
  const [step, setStep]                     = useState<Step>("phone");
  const [phone, setPhone]                   = useState("");
  const [coords, setCoords]                 = useState<GeoCoords | null>(null);
  const [geoError, setGeoError]             = useState<string | null>(null);
  const [workerName, setWorkerName]         = useState<string | null>(null);
  const [action, setAction]                 = useState<"in" | "out" | null>(null);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [timestamp, setTimestamp]           = useState("");
  const [dailyMessage, setDailyMessage]     = useState<string | null>(null);
  const [autoRegistered, setAutoRegistered] = useState(false);

  // ── Project selection (worker flow) ─────────────────────────────────────
  const [projects, setProjects]                   = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading]     = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // ── Admin state ──────────────────────────────────────────────────────────
  const [adminView, setAdminView]   = useState<AdminView>("none");
  const [adminTab, setAdminTab]     = useState<AdminTab>("dashboard");
  const [adminPw, setAdminPw]       = useState("");
  const [adminErr, setAdminErr]     = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin — core data
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [todayLogs, setTodayLogs]       = useState<AttendanceRecord[]>([]);
  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [reports, setReports]           = useState<DailyReport[]>([]);
  const [materials, setMaterials]       = useState<Material[]>([]);
  const [budget, setBudget]             = useState<BudgetLine[]>([]);
  const [dataLoading, setDataLoading]   = useState(false);

  // Admin — add worker
  const [newName, setNewName]               = useState("");
  const [newPhone, setNewPhone]             = useState("");
  const [newRole, setNewRole]               = useState("עובד");
  const [newNationalId, setNewNationalId]   = useState("");
  const [newHourlyRate, setNewHourlyRate]   = useState("");
  const [newDailyRate, setNewDailyRate]     = useState("");
  const [addLoading, setAddLoading]         = useState(false);
  const [addMsg, setAddMsg]                 = useState("");

  // Admin — edit worker
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editName, setEditName]               = useState("");
  const [editPhone, setEditPhone]             = useState("");
  const [editRole, setEditRole]               = useState("עובד");
  const [editNationalId, setEditNationalId]   = useState("");
  const [editHourlyRate, setEditHourlyRate]   = useState("");
  const [editDailyRate, setEditDailyRate]     = useState("");
  const [editLoading, setEditLoading]         = useState(false);
  const [editMsg, setEditMsg]                 = useState("");

  // Admin — projects
  const [newProjectName, setNewProjectName]       = useState("");
  const [projectAddLoading, setProjectAddLoading] = useState(false);
  const [projectAddMsg, setProjectAddMsg]         = useState("");

  // Admin — expenses
  const [matProjectId, setMatProjectId] = useState("");
  const [matCategory, setMatCategory]   = useState("חומרים");
  const [matName, setMatName]           = useState("");
  const [matQty, setMatQty]             = useState("1");
  const [matUnit, setMatUnit]           = useState("יחידות");
  const [matSupplier, setMatSupplier]   = useState("");
  const [matCost, setMatCost]           = useState("");
  const [matLoading, setMatLoading]     = useState(false);
  const [matMsg, setMatMsg]             = useState("");
  const [matFilter, setMatFilter]       = useState("");

  // Admin — daily reports
  const [reportProjectId, setReportProjectId] = useState("");
  const [reportDate, setReportDate]           = useState(new Date().toISOString().slice(0, 10));
  const [reportWeather, setReportWeather]     = useState("");
  const [reportSummary, setReportSummary]     = useState("");
  const [reportSpecial, setReportSpecial]     = useState("");
  const [reportLoading, setReportLoading]     = useState(false);
  const [reportMsg, setReportMsg]             = useState("");

  // Admin — tasks
  const [taskFilter, setTaskFilter]             = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskName, setNewTaskName]           = useState("");
  const [newTaskStart, setNewTaskStart]         = useState("");
  const [newTaskEnd, setNewTaskEnd]             = useState("");
  const [newTaskContractor, setNewTaskContractor] = useState("");
  const [taskAddLoading, setTaskAddLoading]     = useState(false);
  const [taskAddMsg, setTaskAddMsg]             = useState("");

  // Admin — retroactive attendance edit
  const [editAttId, setEditAttId]             = useState<string | null>(null);
  const [editAttAction, setEditAttAction]     = useState("כניסה");
  const [editAttProject, setEditAttProject]   = useState("");
  const [editAttTimestamp, setEditAttTimestamp] = useState("");
  const [editAttLoading, setEditAttLoading]   = useState(false);
  const [editAttMsg, setEditAttMsg]           = useState("");

  // ── Dashboard computed values ─────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);

  const { onSite, laborEstimate } = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ record: AttendanceRecord; worker?: StaffMember }> = [];
    for (const log of todayLogs) { // DESC order — first = latest per worker
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

  // ── Session restore ───────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem("be_admin") === "1") setAdminView("dashboard");
  }, []);

  // ── Load worker-flow projects ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== "project") return;
    setProjectsLoading(true);
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {}).finally(() => setProjectsLoading(false));
  }, [step]);

  // ── Load admin data on dashboard entry ───────────────────────────────────
  useEffect(() => { if (adminView === "dashboard") loadAdminData(); }, [adminView]);

  // ── Tab-triggered loaders ────────────────────────────────────────────────
  useEffect(() => {
    if (adminView === "dashboard" && adminTab === "expenses") loadMaterials();
  }, [adminTab, adminView, matFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (adminView === "dashboard" && adminTab === "reports") loadReports();
  }, [adminTab, adminView]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function loadAdminData() {
    setDataLoading(true);
    try {
      const results = await Promise.allSettled([
        fetch("/api/admin/staff"),
        fetch("/api/admin/attendance/today"),
        fetch("/api/admin/projects"),
        fetch("/api/admin/tasks"),
      ]);
      const [staffR, logsR, projR, tasksR] = results;
      if (staffR.status  === "fulfilled" && staffR.value.ok)  { const d = await staffR.value.json();  setStaff(d.staff ?? []); }
      if (logsR.status   === "fulfilled" && logsR.value.ok)   { const d = await logsR.value.json();   setTodayLogs(d.records ?? []); }
      if (projR.status   === "fulfilled" && projR.value.ok)   { const d = await projR.value.json();   setAdminProjects(d.projects ?? []); }
      if (tasksR.status  === "fulfilled" && tasksR.value.ok)  { const d = await tasksR.value.json();  setTasks(d.tasks ?? []); }
    } finally { setDataLoading(false); }
  }

  async function loadReports() {
    const res = await fetch("/api/admin/daily-reports");
    if (res.ok) { const d = await res.json(); setReports(d.reports ?? []); }
  }

  async function loadMaterials() {
    const url = matFilter ? `/api/admin/materials?project_id=${matFilter}` : "/api/admin/materials";
    const res = await fetch(url);
    if (res.ok) { const d = await res.json(); setMaterials(d.materials ?? []); setBudget(d.budget ?? []); }
  }

  // ── Admin auth ────────────────────────────────────────────────────────────
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault(); setAdminLoading(true); setAdminErr("");
    try {
      const res  = await fetch("/api/admin-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: adminPw }) });
      const data = await res.json();
      if (data.ok) { sessionStorage.setItem("be_admin", "1"); setAdminView("dashboard"); setAdminPw(""); }
      else         { setAdminErr("סיסמה שגויה"); setAdminPw(""); }
    } catch { setAdminErr("שגיאת רשת"); }
    finally  { setAdminLoading(false); }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem("be_admin"); setAdminView("none");
    setStaff([]); setTodayLogs([]); setAdminProjects([]); setTasks([]); setReports([]); setMaterials([]);
  }

  // ── Worker CRUD ───────────────────────────────────────────────────────────
  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !current }) });
    loadAdminData();
  }

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault(); setAddLoading(true); setAddMsg("");
    try {
      const res  = await fetch("/api/admin/staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, role: newRole, national_id: newNationalId, hourly_rate: newHourlyRate ? parseFloat(newHourlyRate) : null, daily_rate: newDailyRate ? parseFloat(newDailyRate) : null }),
      });
      const data = await res.json();
      if (res.ok) { setAddMsg("✓ " + newName + " נוסף"); setNewName(""); setNewPhone(""); setNewRole("עובד"); setNewNationalId(""); setNewHourlyRate(""); setNewDailyRate(""); loadAdminData(); }
      else        { setAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setAddMsg("שגיאת רשת: " + String(err)); }
    finally { setAddLoading(false); }
  }

  function startEdit(s: StaffMember) {
    setEditingId(s.id); setEditName(s.name); setEditPhone(s.phone); setEditRole(s.role);
    setEditNationalId(s.national_id ?? "");
    setEditHourlyRate(s.hourly_rate != null ? String(s.hourly_rate) : "");
    setEditDailyRate(s.daily_rate   != null ? String(s.daily_rate)  : "");
    setEditMsg("");
  }

  async function handleEditWorker(e: React.FormEvent) {
    e.preventDefault(); if (!editingId) return;
    setEditLoading(true); setEditMsg("");
    try {
      const res  = await fetch(`/api/admin/staff/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone, role: editRole, national_id: editNationalId, hourly_rate: editHourlyRate ? parseFloat(editHourlyRate) : null, daily_rate: editDailyRate ? parseFloat(editDailyRate) : null }),
      });
      const data = await res.json();
      if (res.ok) { setEditingId(null); loadAdminData(); }
      else        { setEditMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditMsg("שגיאת רשת: " + String(err)); }
    finally { setEditLoading(false); }
  }

  // ── Project CRUD ──────────────────────────────────────────────────────────
  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault(); setProjectAddLoading(true); setProjectAddMsg("");
    try {
      const res  = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newProjectName }) });
      const data = await res.json();
      if (res.ok) { setProjectAddMsg("✓ " + newProjectName + " נוסף"); setNewProjectName(""); loadAdminData(); }
      else        { setProjectAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setProjectAddMsg("שגיאת רשת: " + String(err)); }
    finally { setProjectAddLoading(false); }
  }

  async function toggleProjectStatus(id: string, current: string) {
    const next = current === "active" ? "inactive" : "active";
    await fetch(`/api/admin/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    loadAdminData();
  }

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault(); setMatLoading(true); setMatMsg("");
    try {
      const res  = await fetch("/api/admin/materials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: matProjectId, material_name: matName, quantity: parseFloat(matQty) || 1, unit: matUnit, supplier: matSupplier, cost: matCost ? parseFloat(matCost) : null, category: matCategory }),
      });
      const data = await res.json();
      if (res.ok) { setMatMsg("✓ " + matName + " נרשם"); setMatName(""); setMatQty("1"); setMatSupplier(""); setMatCost(""); loadMaterials(); }
      else        { setMatMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setMatMsg("שגיאת רשת: " + String(err)); }
    finally { setMatLoading(false); }
  }

  // ── Task CRUD ─────────────────────────────────────────────────────────────
  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault(); setTaskAddLoading(true); setTaskAddMsg("");
    try {
      const res  = await fetch("/api/admin/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: newTaskProjectId, task_name: newTaskName, start_date: newTaskStart || null, end_date: newTaskEnd || null, contractor: newTaskContractor }),
      });
      const data = await res.json();
      if (res.ok) { setTaskAddMsg("✓ " + newTaskName + " נוסף"); setNewTaskName(""); setNewTaskStart(""); setNewTaskEnd(""); setNewTaskContractor(""); loadAdminData(); }
      else        { setTaskAddMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setTaskAddMsg("שגיאת רשת: " + String(err)); }
    finally { setTaskAddLoading(false); }
  }

  async function setTaskStatus(id: string, status: string) {
    await fetch(`/api/admin/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadAdminData();
  }

  // ── Daily report ──────────────────────────────────────────────────────────
  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault(); setReportLoading(true); setReportMsg("");
    try {
      const res  = await fetch("/api/admin/daily-reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: reportProjectId, date: reportDate, weather: reportWeather, summary: reportSummary, special_events: reportSpecial }),
      });
      const data = await res.json();
      if (res.ok) { setReportMsg("✓ דוח נשמר"); setReportSummary(""); setReportSpecial(""); setReportWeather(""); loadReports(); }
      else        { setReportMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setReportMsg("שגיאת רשת: " + String(err)); }
    finally { setReportLoading(false); }
  }

  // ── Retroactive attendance edit ───────────────────────────────────────────
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
      const res  = await fetch(`/api/admin/attendance/${editAttId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: editAttAction, project_id: editAttProject || null, timestamp_label: editAttTimestamp }),
      });
      const data = await res.json();
      if (res.ok) { setEditAttId(null); loadAdminData(); }
      else        { setEditAttMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditAttMsg("שגיאת רשת: " + String(err)); }
    finally { setEditAttLoading(false); }
  }

  // ── Worker attendance callbacks ───────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 9) return;
    setGeoError(null); setStep("locating");
    if (!navigator.geolocation) { setGeoError("הדפדפן לא תומך בשיתוף מיקום"); setStep("phone"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStep("project"); },
      () => { setGeoError("גישה למיקום נדרשת לדיווח נוכחות — אנא אשר גישה ונסה שוב."); setStep("phone"); },
      { timeout: 12000, enableHighAccuracy: true }
    );
  }, [phone]);

  const submit = useCallback(async (selectedAction: "in" | "out") => {
    if (!coords) return;
    setAction(selectedAction); setStep("submitting");
    const ts = nowLabel(); setTimestamp(ts);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          action: selectedAction === "in" ? "כניסה" : "יציאה",
          lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6), timestamp: ts,
          ...(selectedProjectId && { project_id: selectedProjectId }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkerName(data.name ?? null); setDailyMessage(data.message ?? null);
        setAutoRegistered(data.auto_registered ?? false); setStep("success");
      } else if (data.error === "phone_not_found") {
        setErrorMsg("מספר הטלפון לא נמצא ברשימת הצוות. פנה למנהל."); setStep("error");
      } else {
        setErrorMsg(data.error ?? "שגיאה לא ידועה — נסה שוב."); setStep("error");
      }
    } catch { setErrorMsg("בעיית תקשורת — בדוק חיבור אינטרנט ונסה שוב."); setStep("error"); }
  }, [coords, phone, selectedProjectId]);

  const reset = () => {
    setStep("phone"); setPhone(""); setCoords(null); setGeoError(null);
    setWorkerName(null); setAction(null); setErrorMsg(null);
    setDailyMessage(null); setAutoRegistered(false); setSelectedProjectId("");
  };

  // ── Admin: password screen ────────────────────────────────────────────────
  if (adminView === "password") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <Lock size={40} strokeWidth={1.5} className="text-accent" />
        <div className="text-center space-y-1">
          <p className="font-heading text-xl font-bold text-charcoal">ניהול אתר</p>
          <p className="font-body text-xs text-charcoal/40">הזן סיסמת מנהל</p>
        </div>
        <form onSubmit={handleAdminLogin} className="w-full space-y-4">
          <input type="password" autoFocus value={adminPw} onChange={e => setAdminPw(e.target.value)} placeholder="סיסמה"
            className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-lg tracking-[0.3em] text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors duration-200" />
          {adminErr && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
              <p className="font-body text-xs">{adminErr}</p>
            </div>
          )}
          <button type="submit" disabled={adminLoading || !adminPw.trim()}
            className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {adminLoading ? <><Loader2 size={16} className="animate-spin" /> מאמת...</> : "כניסה"}
          </button>
        </form>
        <button onClick={() => setAdminView("none")} className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors underline underline-offset-2">
          חזור לשעון נוכחות
        </button>
      </Screen>
    );
  }

  // ── Admin: Dashboard ──────────────────────────────────────────────────────
  if (adminView === "dashboard") {
    const activeStaff   = staff.filter(s => s.active);
    const inactiveStaff = staff.filter(s => !s.active);
    const todayIns      = todayLogs.filter(r => r.action === "כניסה" || r.action === "in").length;
    const todayOuts     = todayLogs.filter(r => r.action === "יציאה" || r.action === "out").length;

    const TAB_DEFS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
      { key: "dashboard",  label: "דשבורד",    icon: <LayoutDashboard size={13} /> },
      { key: "attendance", label: "נוכחות",     icon: <ClipboardList size={13} /> },
      { key: "workers",    label: "עובדים",     icon: <UserPlus size={13} /> },
      { key: "projects",   label: "פרויקטים",   icon: <Building2 size={13} /> },
      { key: "expenses",   label: "הוצאות",     icon: <Package size={13} /> },
      { key: "planning",   label: "תכנון",       icon: <Hammer size={13} /> },
      { key: "reports",    label: "דוחות",       icon: <BarChart2 size={13} /> },
    ];

    return (
      <div dir="rtl" className="min-h-screen bg-bone px-4 py-8 font-body text-charcoal">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-accent/60">בנין איתן</p>
              <h1 className="font-heading text-2xl font-bold text-charcoal">ממשק מנהל עבודה</h1>
            </div>
            <button onClick={handleAdminLogout}
              className="border border-charcoal/20 px-3 py-1.5 text-xs text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
              יציאה
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "פעילים",      value: activeStaff.length,   color: "text-green-600" },
              { label: "באתר כעת",    value: onSite.length,        color: "text-accent" },
              { label: "כניסות היום", value: todayIns,             color: "text-charcoal/60" },
              { label: "יציאות",      value: todayOuts,            color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-warm-gray-light p-3 text-center">
                <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[0.65rem] text-charcoal/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-charcoal/10 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {TAB_DEFS.map(t => (
              <button key={t.key} onClick={() => setAdminTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap border-b-2 transition-colors duration-150 ${adminTab === t.key ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal/70"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Dashboard ─────────────────────────────────────────── */}
          {adminTab === "dashboard" && (
            <div className="space-y-4">

              {/* On-site now */}
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
                          {worker?.daily_rate && (
                            <span className="text-[0.65rem] text-accent/70 shrink-0">₪{worker.daily_rate}/יום</span>
                          )}
                          <span className="text-[0.7rem] text-green-600 tabular-nums shrink-0">מ-{t}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Daily spend */}
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

              {/* Today's tasks */}
              <Card title="📋 משימות היום">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-charcoal/30 text-center py-2">אין משימות פעילות להיום</p>
                ) : (
                  <div className="divide-y divide-charcoal/5">
                    {todayTasks.map(t => {
                      const proj = adminProjects.find(p => p.id === t.project_id);
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

              {/* Role breakdown */}
              {Object.keys(roleMap).length > 0 && (
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

          {/* ── Tab: Attendance ─────────────────────────────────────────── */}
          {adminTab === "attendance" && (
            <div className="space-y-5">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-base font-bold">יומן היום</h2>
                  <button onClick={loadAdminData} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
                    <RefreshCw size={12} strokeWidth={1.5} /> רענן
                  </button>
                </div>
                {dataLoading && <p className="text-sm text-charcoal/40 text-center py-4">טוען...</p>}
                {!dataLoading && todayLogs.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין דיווחים היום</p>}
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
                            {adminProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                          <button onClick={() => startEditAtt(r)} title="ערוך רשומה"
                            className="text-charcoal/30 hover:text-accent transition-colors shrink-0 p-0.5">
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

          {/* ── Tab: Workers ─────────────────────────────────────────────── */}
          {adminTab === "workers" && (
            <div className="space-y-5">

              {/* Add worker */}
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
                    <Field label="שכר שעתי (₪)">
                      <input value={newHourlyRate} onChange={e => setNewHourlyRate(e.target.value)} type="number" min="0" step="0.5" placeholder="45.00" dir="ltr" className={INPUT} />
                    </Field>
                    <Field label="שכר יומי (₪)">
                      <input value={newDailyRate} onChange={e => setNewDailyRate(e.target.value)} type="number" min="0" step="1" placeholder="350" dir="ltr" className={INPUT} />
                    </Field>
                  </div>
                  <Btn loading={addLoading}>הוסף עובד</Btn>
                  {addMsg && <p className={`text-xs ${addMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{addMsg}</p>}
                </form>
              </Card>

              {/* Staff list */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-base font-bold">רשימת עובדים ({staff.length})</h2>
                  <button onClick={loadAdminData} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
                    <RefreshCw size={12} strokeWidth={1.5} /> רענן
                  </button>
                </div>
                {dataLoading && <p className="text-sm text-charcoal/40 text-center py-4">טוען...</p>}
                {!dataLoading && staff.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין עובדים רשומים</p>}
                {!dataLoading && staff.length > 0 && (
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
                          <Field label='ת"ז'><input value={editNationalId} onChange={e => setEditNationalId(e.target.value.replace(/\D/g, ""))} placeholder="ספרות בלבד" inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} /></Field>
                          <Field label="שכר שעתי (₪)">
                            <input value={editHourlyRate} onChange={e => setEditHourlyRate(e.target.value)} type="number" min="0" step="0.5" dir="ltr" className={INPUT} />
                          </Field>
                          <Field label="שכר יומי (₪)">
                            <input value={editDailyRate} onChange={e => setEditDailyRate(e.target.value)} type="number" min="0" step="1" dir="ltr" className={INPUT} />
                          </Field>
                        </div>
                        {editMsg && <p className="text-xs text-red-500">{editMsg}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={editLoading} className="flex-1 bg-accent py-2 text-xs font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">{editLoading ? "שומר..." : "שמור"}</button>
                          <button type="button" onClick={() => setEditingId(null)} className="flex-1 border border-charcoal/20 py-2 text-xs text-charcoal/50 hover:border-accent transition-colors">ביטול</button>
                        </div>
                      </form>
                    ) : (
                      <div key={s.id} className={`flex items-center justify-between py-3 gap-2 ${!s.active ? "opacity-45" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-charcoal truncate">{s.name}</p>
                          <p className="text-[0.7rem] text-charcoal/40 tabular-nums" dir="ltr">{s.phone}</p>
                          {s.national_id && <p className="text-[0.65rem] text-charcoal/30 tabular-nums" dir="ltr">ת&quot;ז: {s.national_id}</p>}
                          {(s.hourly_rate || s.daily_rate) && (
                            <p className="text-[0.65rem] text-accent/70">
                              {s.hourly_rate ? `₪${s.hourly_rate}/ש׳` : ""}
                              {s.hourly_rate && s.daily_rate ? " · " : ""}
                              {s.daily_rate ? `₪${s.daily_rate}/יום` : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-[0.65rem] text-charcoal/40 shrink-0">{s.role}</span>
                        <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${s.active ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>{s.active ? "פעיל" : "לא פעיל"}</span>
                        <button onClick={() => startEdit(s)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">ערוך</button>
                        <button onClick={() => toggleActive(s.id, s.active)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">{s.active ? "השבת" : "הפעל"}</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Inactive workers count */}
              {inactiveStaff.length > 0 && (
                <p className="text-xs text-charcoal/30 text-center">{inactiveStaff.length} עובדים לא פעילים מוסתרים</p>
              )}
            </div>
          )}

          {/* ── Tab: Projects ─────────────────────────────────────────────── */}
          {adminTab === "projects" && (
            <div className="space-y-5">
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} strokeWidth={1.5} className="text-accent" />
                  <h2 className="font-heading text-base font-bold">הוספת פרויקט / אתר בנייה</h2>
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
                  <h2 className="font-heading text-base font-bold">פרויקטים ({adminProjects.length})</h2>
                  <button onClick={loadAdminData} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
                    <RefreshCw size={12} strokeWidth={1.5} /> רענן
                  </button>
                </div>
                {!dataLoading && adminProjects.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין פרויקטים עדיין</p>}
                <div className="divide-y divide-charcoal/5">
                  {adminProjects.map(p => (
                    <div key={p.id} className={`flex items-center justify-between py-3 gap-2 ${p.status !== "active" ? "opacity-45" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-[0.65rem] text-charcoal/30">
                          {tasks.filter(t => t.project_id === p.id && t.status !== "completed").length} משימות פעילות
                        </p>
                      </div>
                      <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${p.status === "active" ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>{p.status === "active" ? "פעיל" : "לא פעיל"}</span>
                      <button onClick={() => toggleProjectStatus(p.id, p.status ?? "active")} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">
                        {p.status === "active" ? "השבת" : "הפעל"}
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Tab: Expenses ─────────────────────────────────────────────── */}
          {adminTab === "expenses" && (
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
                        {adminProjects.filter(p => p.status === "active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>
                    <Field label="קטגוריה">
                      <select value={matCategory} onChange={e => setMatCategory(e.target.value)} className={INPUT}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="תיאור / פריט">
                      <input value={matName} onChange={e => setMatName(e.target.value)} required placeholder="בטון, שרברב..." className={INPUT} />
                    </Field>
                    <Field label="ספק">
                      <input value={matSupplier} onChange={e => setMatSupplier(e.target.value)} placeholder="שם הספק" className={INPUT} />
                    </Field>
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

              {/* Summary by category */}
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
                      <span className="text-base font-bold text-accent tabular-nums">
                        ₪{budget.reduce((s, b) => s + b.total, 0).toLocaleString("he-IL")}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Expenses log */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-sm font-bold">יומן הוצאות</h2>
                  <div className="flex items-center gap-2">
                    <select value={matFilter} onChange={e => setMatFilter(e.target.value)} className="text-xs border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none">
                      <option value="">כל הפרויקטים</option>
                      {adminProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

          {/* ── Tab: Planning ─────────────────────────────────────────────── */}
          {adminTab === "planning" && (
            <div className="space-y-5">
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Hammer size={16} strokeWidth={1.5} className="text-accent" />
                  <h2 className="font-heading text-base font-bold">הוספת משימה</h2>
                </div>
                <form onSubmit={handleAddTask} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="פרויקט">
                      <select value={newTaskProjectId} onChange={e => setNewTaskProjectId(e.target.value)} required className={INPUT}>
                        <option value="">בחר פרויקט...</option>
                        {adminProjects.filter(p => p.status === "active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>
                    <Field label="קבלן / צוות">
                      <input value={newTaskContractor} onChange={e => setNewTaskContractor(e.target.value)} placeholder="שם קבלן / צוות" className={INPUT} />
                    </Field>
                  </div>
                  <Field label="שם המשימה">
                    <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} required placeholder="התקנת תקרת גבס, ריצוף..." className={INPUT} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="תאריך התחלה"><input type="date" value={newTaskStart} onChange={e => setNewTaskStart(e.target.value)} className={INPUT} dir="ltr" /></Field>
                    <Field label="תאריך סיום">  <input type="date" value={newTaskEnd}   onChange={e => setNewTaskEnd(e.target.value)}   className={INPUT} dir="ltr" /></Field>
                  </div>
                  <Btn loading={taskAddLoading} disabled={!newTaskProjectId}>הוסף משימה</Btn>
                  {taskAddMsg && <p className={`text-xs ${taskAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{taskAddMsg}</p>}
                </form>
              </Card>

              {/* Task list */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-sm font-bold">רשימת משימות ({tasks.filter(t => !taskFilter || t.project_id === taskFilter).length})</h2>
                  <div className="flex items-center gap-2">
                    <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className="text-xs border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none">
                      <option value="">כל הפרויקטים</option>
                      {adminProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={loadAdminData} className="text-charcoal/40 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
                  </div>
                </div>
                {tasks.filter(t => !taskFilter || t.project_id === taskFilter).length === 0 ? (
                  <p className="text-sm text-charcoal/30 text-center py-4">אין משימות</p>
                ) : (
                  <div className="divide-y divide-charcoal/5">
                    {tasks
                      .filter(t => !taskFilter || t.project_id === taskFilter)
                      .map(t => {
                        const proj = adminProjects.find(p => p.id === t.project_id);
                        return (
                          <div key={t.id} className={`py-3 space-y-2 ${t.status === "completed" ? "opacity-50" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{t.task_name}</p>
                                <div className="flex flex-wrap items-center gap-x-2 text-[0.65rem] text-charcoal/40 mt-0.5">
                                  {proj && <span><Building2 size={9} className="inline me-0.5" strokeWidth={1.5} />{proj.name}</span>}
                                  {t.contractor && <span>· {t.contractor}</span>}
                                  {t.start_date && <span dir="ltr">· {t.start_date}{t.end_date ? ` → ${t.end_date}` : ""}</span>}
                                </div>
                              </div>
                              <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                            </div>
                            {t.status !== "completed" && (
                              <div className="flex gap-2">
                                {t.status === "planned" && (
                                  <button onClick={() => setTaskStatus(t.id, "in_progress")} className="text-[0.65rem] border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50 transition-colors">▶ הפעל</button>
                                )}
                                {t.status === "in_progress" && (
                                  <button onClick={() => setTaskStatus(t.id, "planned")} className="text-[0.65rem] border border-charcoal/20 px-3 py-1 text-charcoal/50 hover:border-accent hover:text-accent transition-colors">⏸ עצור</button>
                                )}
                                <button onClick={() => setTaskStatus(t.id, "completed")} className="text-[0.65rem] border border-green-300 px-3 py-1 text-green-700 hover:bg-green-50 transition-colors">✓ סיים</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── Tab: Reports ──────────────────────────────────────────────── */}
          {adminTab === "reports" && (
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
                        {adminProjects.filter(p => p.status === "active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                  {Object.keys(roleMap).length > 0 && (
                    <div className="bg-bone border border-charcoal/10 p-3 space-y-1">
                      <p className="text-[0.7rem] font-bold text-charcoal/50 uppercase tracking-wide">נוכחות היום</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(roleMap).map(([role, count]) => (
                          <span key={role} className="text-xs bg-white border border-charcoal/10 px-2 py-0.5"><strong>{count}</strong> {role}</span>
                        ))}
                      </div>
                    </div>
                  )}
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

          {/* Back button */}
          <button onClick={handleAdminLogout}
            className="w-full border border-charcoal/20 py-3 text-xs tracking-widest uppercase text-charcoal/40 hover:border-accent hover:text-accent transition-colors duration-200">
            חזור לשעון נוכחות
          </button>

        </div>
      </div>
    );
  }

  // ── Worker attendance screens ─────────────────────────────────────────────

  if (step === "success") {
    const isIn = action === "in";
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <CheckCircle size={64} strokeWidth={1} className={isIn ? "text-green-500" : "text-red-400"} />
        <div className="text-center space-y-1">
          <p className="font-heading text-2xl font-bold text-charcoal">{isIn ? "כניסה נרשמה ✅" : "יציאה נרשמה 🔴"}</p>
          {workerName && <p className="font-heading text-xl text-charcoal/80">שלום {workerName}</p>}
          <p className="font-body text-sm text-charcoal/40">{timestamp}</p>
          {selectedProject && (
            <div className="flex items-center justify-center gap-1 text-sm text-charcoal/50 mt-1">
              <Building2 size={14} strokeWidth={1.5} /><span>{selectedProject.name}</span>
            </div>
          )}
        </div>
        {autoRegistered && (
          <div className="w-full rounded-sm border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-amber-500">רישום אוטומטי</p>
            <p className="font-body text-sm leading-relaxed text-charcoal/80">הטלפון נרשם כמשתמש ראשון במערכת. עדכן את שמך בדשבורד הניהולי.</p>
          </div>
        )}
        {dailyMessage ? (
          <div className="w-full rounded-sm border border-sky-200 bg-sky-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-sky-400">הודעת היום</p>
            <p className="font-body text-base leading-relaxed text-charcoal/80">{dailyMessage}</p>
          </div>
        ) : (
          <p className="font-body text-sm text-charcoal/30">{isIn ? "עבודה טובה! 💪" : "שיהיה לך יום נעים 👋"}</p>
        )}
        <button onClick={reset}
          className="mt-2 w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
          דיווח נוסף
        </button>
      </Screen>
    );
  }

  if (step === "error") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <AlertCircle size={56} strokeWidth={1} className="text-red-400" />
        <p className="font-body text-center text-sm text-charcoal/70 leading-relaxed max-w-xs">{errorMsg}</p>
        <button onClick={reset}
          className="mt-4 w-full bg-charcoal py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-charcoal/80 transition-colors duration-200">
          נסה שוב
        </button>
      </Screen>
    );
  }

  if (step === "submitting") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <Loader2 size={48} strokeWidth={1.5} className="text-accent animate-spin" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">שולח דיווח…</p>
      </Screen>
    );
  }

  if (step === "locating") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <MapPin size={48} strokeWidth={1.5} className="text-accent animate-pulse" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">מאתר מיקום…</p>
      </Screen>
    );
  }

  if (step === "project") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <div className="text-center space-y-1">
          <Building2 size={36} strokeWidth={1.5} className="text-accent mx-auto" />
          <p className="font-heading text-xl font-bold text-charcoal">בחר אתר בנייה</p>
          <p className="font-body text-xs text-charcoal/40">בחר את האתר שבו אתה עובד היום</p>
        </div>
        <div className="w-full space-y-3">
          {projectsLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-charcoal/40">
              <Loader2 size={18} className="animate-spin" />
              <span className="font-body text-sm">טוען אתרים...</span>
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center font-body text-sm text-charcoal/40 py-4">אין אתרי בנייה פעילים — פנה למנהל</p>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setStep("ready"); }}
                  className={`w-full flex items-center gap-3 px-5 py-4 border transition-all duration-150 text-right ${selectedProjectId === p.id ? "border-accent bg-accent/5 text-accent" : "border-charcoal/15 bg-white hover:border-accent/50 text-charcoal"}`}>
                  <Building2 size={18} strokeWidth={1.5} className="shrink-0" />
                  <p className="font-heading text-sm font-semibold truncate flex-1">{p.name}</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={reset}
            className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2 w-full text-center">
            שנה מספר
          </button>
        </div>
      </Screen>
    );
  }

  if (step === "ready" && coords) {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <div className="text-center space-y-1">
          <p className="font-body text-[0.6rem] font-bold tracking-[0.22em] uppercase text-accent/70">מיקום אושר ✓</p>
          <p className="font-body text-sm text-charcoal/50 tabular-nums" dir="ltr">{phone}</p>
          {selectedProject && (
            <div className="flex items-center justify-center gap-1 text-xs text-charcoal/50">
              <Building2 size={12} strokeWidth={1.5} /><span>{selectedProject.name}</span>
            </div>
          )}
        </div>
        <div className="w-full grid grid-cols-2 gap-4">
          <button onClick={() => submit("in")}
            className="flex flex-col items-center justify-center gap-3 bg-green-600 hover:bg-green-700 active:scale-95 py-8 transition-all duration-150 rounded-sm">
            <LogIn size={32} strokeWidth={1.5} className="text-white" />
            <span className="font-heading text-lg font-bold text-white">כניסה</span>
          </button>
          <button onClick={() => submit("out")}
            className="flex flex-col items-center justify-center gap-3 bg-red-500 hover:bg-red-600 active:scale-95 py-8 transition-all duration-150 rounded-sm">
            <LogOut size={32} strokeWidth={1.5} className="text-white" />
            <span className="font-heading text-lg font-bold text-white">יציאה</span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => setStep("project")} className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2">שנה אתר</button>
          <button onClick={reset} className="font-body text-xs text-charcoal/20 hover:text-charcoal/50 transition-colors duration-200">שנה מספר</button>
        </div>
      </Screen>
    );
  }

  // Default: phone entry
  return (
    <Screen backHref={portalHref} backLabel={backLabel}>
      <div className="text-center space-y-1">
        <p className="font-heading text-xl font-bold text-charcoal">שעון נוכחות</p>
        <p className="font-body text-xs text-charcoal/40">הזן מספר טלפון לזיהוי</p>
      </div>
      <div className="w-full space-y-4">
        <input
          type="tel" inputMode="numeric" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && requestLocation()}
          placeholder="05X-XXX-XXXX"
          className="w-full border border-charcoal/20 bg-white px-5 py-5 text-center font-body text-xl tracking-widest text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors duration-200"
          autoComplete="tel" dir="ltr"
        />
        {geoError && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <p className="font-body text-xs text-red-600 leading-snug">{geoError}</p>
          </div>
        )}
        <button onClick={requestLocation} disabled={phone.replace(/\D/g, "").length < 9}
          className="w-full bg-accent py-5 font-heading text-base font-bold tracking-[0.15em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2">
          <MapPin size={18} strokeWidth={1.5} />
          אשר מיקום והמשך
        </button>
      </div>
      <button onClick={() => setAdminView("password")}
        className="mt-4 flex items-center gap-1.5 font-body text-[0.65rem] tracking-widest uppercase text-charcoal/20 hover:text-charcoal/50 transition-colors duration-200">
        <Lock size={10} strokeWidth={1.5} />
        ניהול
      </button>
    </Screen>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

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

function Screen({ children, backHref, backLabel }: { children: React.ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16 gap-6" dir="rtl">
      {backHref && (
        <div className="absolute top-5 end-5">
          <Link href={backHref}
            className="flex items-center gap-1 font-body text-xs text-charcoal/35 hover:text-accent transition-colors duration-200">
            <ChevronRight size={14} strokeWidth={1.5} />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}
      <Link href={backHref ?? "/he/internal"} className="mb-2">
        <Image src="/logo.png" alt="Binyan Eitan" width={110} height={32} className="h-8 w-auto brightness-0 opacity-60" />
      </Link>
      {children}
      <p className="mt-6 font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
        בניין איתן — מערכת נוכחות פנימית
      </p>
    </div>
  );
}
