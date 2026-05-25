"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useFeedback } from "../hooks/useFeedback";
import SuccessFlash from "./SuccessFlash";
import ForemanPortal from "./ForemanPortal";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { parseMoney, parsePositive } from "../../lib/money";
import Image from "next/image";
import Link from "next/link";
import {
  LogIn, Building2, Package, BarChart2, LayoutDashboard,
  ClipboardList, UserPlus, Loader2, Activity,
  AlertCircle, DollarSign, Target,
  ChevronLeft, Grid3x3, Download, Plus,
  UserCog, Clock, MapPin, UserX,
} from "lucide-react";
import { Card } from "../admin/_components/shared/Card";
import AttentionPanel, { type AttentionItem } from "../admin/_components/shared/AttentionPanel";
import { Field } from "../admin/_components/shared/Field";
import { Btn } from "../admin/_components/shared/Btn";
import { TabRefreshBar } from "../admin/_components/shared/TabRefreshBar";
import { INPUT } from "../admin/_components/shared/constants";
import IncomeTab from "../admin/_components/tabs/IncomeTab";
import AccountTab from "../admin/_components/tabs/AccountTab";
import { ReportsTabPanel, MatrixTabPanel } from "../admin/_components/tabs/ReportsAndMatrixTabs";
import WorkersTab from "../admin/_components/tabs/WorkersTab";
import ProjectsTab from "../admin/_components/tabs/ProjectsTab";
import ExpensesTab from "../admin/_components/tabs/ExpensesTab";
import PlanningTab from "../admin/_components/tabs/PlanningTab";
import AttendanceTab, { type ManualType, type AttendanceSubTab } from "../admin/_components/tabs/AttendanceTab";
import type { WorkerHistoryDay } from "../../lib/worker-history-aggregate";

// ── Types ──────────────────────────────────────────────────────────────────────
type AuthState = "loading" | "unauthenticated" | "foreman" | "admin";
type AdminTab  = "dashboard" | "attendance" | "workers" | "projects" | "expenses" | "planning" | "matrix" | "income" | "reports" | "payroll" | "account";
type LoginMode = "pin" | "password";

const HASH_TO_TAB: Record<string, AdminTab> = {
  attendance: "attendance",
  workers:    "workers",
  staff:      "workers",
  projects:   "projects",
  expenses:   "expenses",
  planning:   "planning",
  matrix:     "matrix",
  weekly:     "matrix",
  income:     "income",
  reports:    "reports",
  payroll:    "payroll",
  salary:     "payroll",
  account:    "account",
};

interface StaffMember {
  id: string; name: string; phone: string; role: string; active: boolean;
  national_id?: string | null; hourly_rate?: number | null; daily_rate?: number | null;
  employment_type?: "hourly" | "daily" | "global";
  monthly_global_salary?: number | null;
  travel_allowance?: boolean;
  pension_status?: string | null;
  holiday_eligible?: boolean;
  is_freelancer?: boolean;
  start_date?: string | null;
  notes?: string | null;
  has_pin?: boolean;
}
interface VacationRecord {
  id: string;
  staff_id: string;
  date: string;
  half_day: boolean;
  notes: string | null;
}
interface PayrollRow {
  staff_id: string;
  name: string;
  national_id: string | null;
  employment_type: string;
  days_worked: number;
  hours_worked: number;
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
  vacation_days: number;
  holiday_eligible: boolean;
  travel_allowance: boolean;
  pension_status: string | null;
  gross_salary: number;
  deleted_at?: string | null;
}
interface AttendanceRecord {
  id: string; action: string; timestamp_label: string; recorded_at: string;
  clock_at?: string | null; created_at?: string; is_manual?: boolean; status?: string;
  lat?: string | null; lng?: string | null;
  distance_from_project_m?: number | null;
  staff: { id: string; name: string; phone: string; role?: string } | null;
  project: { id: string; name: string } | null;
}
interface Project {
  id: string;
  name: string;
  status?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  foreman_id?: string | null;
}
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
  unit: string; supplier: string | null; cost: number | null; category?: string; received_at: string | null;
}
interface BudgetLine { project_id: string; project_name: string; total: number; }
interface IncomeRecord {
  id: string; project_id: string; amount: number; description: string | null;
  received_date: string; created_at: string; project?: { id: string; name: string } | null;
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

// ── Post-login redirect helpers ────────────────────────────────────────────────
// Open-redirect protection: target must be a relative path on the same origin.
// Returns the path (pathname + search + hash) or null if invalid / not present.
function getValidatedRedirectTo(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("redirectTo");
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;   // must be a path
  if (raw.startsWith("//")) return null;   // protocol-relative → other origin
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

// Foreman only has portal access at /admin root. Admin can reach any /admin/* path.
function canRoleAccessPath(role: "admin" | "foreman", path: string): boolean {
  const p = path.split(/[?#]/)[0];
  if (role === "admin") return p === "/admin" || p.startsWith("/admin/");
  return p === "/admin" || p === "/admin/";
}

function resolvePostLoginPath(role: "admin" | "foreman"): string {
  const target = getValidatedRedirectTo();
  if (target && canRoleAccessPath(role, target)) return target;
  return role === "admin" ? "/admin/hub" : "/admin";
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
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin identity (populated by /api/admin/whoami after auth)
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminName,  setAdminName]  = useState<string | null>(null);

  // Change password form
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew,     setPwNew]     = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
  const [newEmploymentType,   setNewEmploymentType]   = useState<"hourly" | "daily" | "global">("hourly");
  const [newGlobalSalary,     setNewGlobalSalary]     = useState("");
  // New workers default to "employee" (is_freelancer=false), and the add form
  // mirrors that with travel_allowance=true. Toggling "freelancer" in the form
  // flips travel_allowance off (and vice versa) — see WorkersTab.
  const [newTravelAllowance,  setNewTravelAllowance]  = useState(true);
  const [newPensionStatus,    setNewPensionStatus]    = useState("");
  const [newHolidayEligible,  setNewHolidayEligible]  = useState(true);
  const [newIsFreelancer,     setNewIsFreelancer]     = useState(false);
  const [newStartDate,        setNewStartDate]        = useState("");
  const [newNotes,            setNewNotes]            = useState("");
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
  const [editEmploymentType,  setEditEmploymentType]  = useState<"hourly" | "daily" | "global">("hourly");
  const [editGlobalSalary,    setEditGlobalSalary]    = useState("");
  const [editTravelAllowance, setEditTravelAllowance] = useState(false);
  const [editPensionStatus,   setEditPensionStatus]   = useState("");
  const [editHolidayEligible, setEditHolidayEligible] = useState(true);
  const [editIsFreelancer,    setEditIsFreelancer]    = useState(false);
  const [editStartDate,       setEditStartDate]       = useState("");
  const [editNotes,           setEditNotes]           = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg,     setEditMsg]     = useState("");

  // Vacation editor (per-staff drawer)
  const [vacationFor,    setVacationFor]    = useState<string | null>(null);
  const [vacationRows,   setVacationRows]   = useState<VacationRecord[]>([]);
  const [vacationDate,   setVacationDate]   = useState("");
  const [vacationHalf,   setVacationHalf]   = useState(false);
  const [vacationLoading, setVacationLoading] = useState(false);
  const [vacationMsg,    setVacationMsg]    = useState("");

  // Payroll tab
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payrollProject,    setPayrollProject]    = useState<string>("");
  const [payrollRows,       setPayrollRows]       = useState<PayrollRow[]>([]);
  const [payrollLoading,    setPayrollLoading]    = useState(false);
  const [payrollExporting,  setPayrollExporting]  = useState(false);

  // Projects UI
  const [newProjectName,    setNewProjectName]    = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  const [projectAddLoading, setProjectAddLoading] = useState(false);
  const [projectAddMsg,     setProjectAddMsg]     = useState("");
  const [editingProjectId,  setEditingProjectId]  = useState<string | null>(null);
  const [editProjectAddress, setEditProjectAddress] = useState("");
  const [editProjectSaving, setEditProjectSaving]   = useState(false);
  const [editProjectMsg,    setEditProjectMsg]     = useState("");

  // Distance threshold (system setting). Default 500m if unset.
  const [farThresholdM,        setFarThresholdM]        = useState<number>(500);
  const [farThresholdInput,    setFarThresholdInput]    = useState<string>("500");
  const [farThresholdSaving,   setFarThresholdSaving]   = useState(false);
  const [farThresholdMsg,      setFarThresholdMsg]      = useState("");

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

  // Attendance edit UI
  const [editAttId,        setEditAttId]        = useState<string | null>(null);
  const [editAttAction,    setEditAttAction]    = useState("כניסה");
  const [editAttProject,   setEditAttProject]   = useState("");
  const [editAttTimestamp, setEditAttTimestamp] = useState("");
  const [editAttLoading,   setEditAttLoading]   = useState(false);
  const [editAttMsg,       setEditAttMsg]        = useState("");
  const [editAttIsPending, setEditAttIsPending] = useState(false);

  // Manual attendance entry (admin creates on behalf of worker)
  const [manualOpen,      setManualOpen]      = useState(false);
  const [manualStaffId,   setManualStaffId]   = useState("");
  const [manualDate,      setManualDate]      = useState("");
  const [manualType,      setManualType]      = useState<ManualType>("regular");
  const [manualEntryTime, setManualEntryTime] = useState("");
  const [manualExitTime,  setManualExitTime]  = useState("");
  const [manualProject,   setManualProject]   = useState("");
  const [manualNotes,     setManualNotes]     = useState("");
  const [manualLoading,   setManualLoading]   = useState(false);
  const [manualMsg,       setManualMsg]       = useState<string | null>(null);
  const [manualErr,       setManualErr]       = useState<string | null>(null);

  // Pending approvals
  const [pendingRecords,   setPendingRecords]   = useState<AttendanceRecord[]>([]);
  const [pendingLoading,   setPendingLoading]   = useState(false);
  const [pendingErr,       setPendingErr]       = useState<string | null>(null);
  const [pendingActionId,  setPendingActionId]  = useState<string | null>(null);

  // Attendance sub-tab + Worker-history panel
  const [attendanceSubTab, setAttendanceSubTab] = useState<AttendanceSubTab>("live");
  const [historyStaffId,   setHistoryStaffId]   = useState("");
  const [historyFrom, setHistoryFrom] = useState(() =>
    new Date(Date.now() - 29 * 86_400_000).toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" })
  );
  const [historyTo, setHistoryTo] = useState(() =>
    new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" })
  );
  const [historyDays,    setHistoryDays]    = useState<WorkerHistoryDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError,   setHistoryError]   = useState<string | null>(null);

  // Recent records (last 7 days) for retroactive editing
  const [recentLogs,        setRecentLogs]        = useState<AttendanceRecord[]>([]);
  const [recentLogsLoading, setRecentLogsLoading] = useState(false);
  const [recentLogsErr,     setRecentLogsErr]     = useState<string | null>(null);
  const [recentLogsVisible, setRecentLogsVisible] = useState(false);

  // Refresh bar
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);

  // Refs used by auto-refresh interval (avoids stale closures)
  const autoTabRef          = useRef<AdminTab>("dashboard");
  const lastRefreshedRef    = useRef<Date | null>(null);
  useEffect(() => { autoTabRef.current = tab; });
  useEffect(() => { lastRefreshedRef.current = lastRefreshed; });

  // Income UI
  const [incProjectId, setIncProjectId] = useState("");
  const [incAmount,    setIncAmount]    = useState("");
  const [incDesc,      setIncDesc]      = useState("");
  const [incDate,      setIncDate]      = useState(new Date().toISOString().slice(0, 10));
  const [incLoading,   setIncLoading]   = useState(false);
  const [incMsg,       setIncMsg]       = useState("");

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
    () => materials.filter(m => (m.received_at ?? "").startsWith(todayStr)).reduce((s, m) => s + (m.cost ?? 0), 0),
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
        const role = d.role;
        // Already-authenticated visitor with a valid redirectTo: honor it.
        if (role === "admin" || role === "foreman") {
          const target = getValidatedRedirectTo();
          if (target && canRoleAccessPath(role, target) && target !== window.location.pathname + window.location.search) {
            window.location.assign(target);
            return;
          }
        }
        setAuthState(role ?? "unauthenticated");
        if (role === "admin") {
          if (d.email) setAdminEmail(d.email);
          if (d.name)  setAdminName(d.name);
        } else if (role === "foreman") {
          if (d.name)    setForemanName(d.name);
          if (d.staffId) setForemanStaffId(d.staffId);
        }
      })
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (authState === "admin" || authState === "foreman") {
      const hash = typeof window !== "undefined" ? window.location.hash.slice(1).toLowerCase() : "";
      const hashTab = HASH_TO_TAB[hash];
      setTab(hashTab && authState === "admin" ? hashTab : "dashboard");
      loadData(authState);

      // Sync hash ↔ tab in both directions:
      //  - back/forward through browser history switches the tab
      //  - URL stays shareable when an admin lands deep in the app
      // Foreman tabs aren't hash-driven, so the listener no-ops for them.
      const isAdminAtMount = authState === "admin";
      const onHashChange = () => {
        if (!isAdminAtMount) return;
        const h = window.location.hash.slice(1).toLowerCase();
        const t = HASH_TO_TAB[h];
        setTab(t || "dashboard");
      };
      window.addEventListener("hashchange", onHashChange);
      cleanup = () => window.removeEventListener("hashchange", onHashChange);
    }
    // Load system settings once on auth (admin only)
    if (authState === "admin") {
      fetch("/api/admin/settings")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          const raw = d?.settings?.["attendance_far_threshold_m"];
          const n = parseInt(raw, 10);
          if (!isNaN(n) && n >= 0) {
            setFarThresholdM(n);
            setFarThresholdInput(String(n));
          }
        })
        .catch(() => {});
    }

    return cleanup;
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((authState === "admin" || authState === "foreman") && tab === "expenses") loadMaterials();
  }, [tab, matFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authState === "admin" && tab === "income") loadIncome();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Load on admin auth so the Attendance tab's red badge is accurate from
    // any starting tab. Also reload when the user opens Attendance to catch
    // anything created in the last 2 min between auto-refreshes.
    if (authState === "admin") loadPending();
  }, [authState, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh attendance every 60 s ────────────────────────────────────
  useEffect(() => {
    if (authState !== "admin" && authState !== "foreman") return;
    const iv = setInterval(async () => {
      const res = await fetch("/api/admin/attendance/today").catch(() => null);
      if (res?.ok) { const d = await res.json(); setTodayLogs(d.records ?? []); }
    }, 60_000);
    return () => clearInterval(iv);
  }, [authState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh dashboard + attendance every 120 s (visibility-aware) ────
  useEffect(() => {
    if (authState !== "admin" && authState !== "foreman") return;
    const AUTO_TABS: AdminTab[] = ["dashboard", "attendance"];
    const INTERVAL_MS = 120_000;

    async function doRefresh() {
      if (document.visibilityState !== "visible") return;
      if (!AUTO_TABS.includes(autoTabRef.current)) return;
      if (autoTabRef.current === "attendance" && authState === "admin") {
        await Promise.all([loadData("admin"), loadPending()]);
      } else {
        await loadData(authState as "admin" | "foreman");
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (!AUTO_TABS.includes(autoTabRef.current)) return;
      const elapsed = lastRefreshedRef.current
        ? Date.now() - lastRefreshedRef.current.getTime()
        : Infinity;
      if (elapsed >= INTERVAL_MS) doRefresh();
    }

    const iv = setInterval(doRefresh, INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
    } finally { setDataLoading(false); setLastRefreshed(new Date()); }
  }

  async function loadMaterials() {
    const url = matFilter ? `/api/admin/materials?project_id=${matFilter}` : "/api/admin/materials";
    const res = await fetch(url);
    if (res.ok) { const d = await res.json(); setMaterials(d.materials ?? []); setBudget(d.budget ?? []); }
  }

  async function loadIncome() {
    const res = await fetch("/api/admin/income");
    if (res.ok) { const d = await res.json(); setIncome(d.income ?? []); setIncomeTotals(d.totals ?? {}); }
  }

  async function loadPending() {
    setPendingLoading(true); setPendingErr(null);
    try {
      const res = await fetch("/api/admin/attendance/pending");
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json(); setPendingRecords(d.records ?? []);
    } catch (e) { setPendingErr(String(e)); }
    finally { setPendingLoading(false); }
  }

  async function loadRecentLogs() {
    setRecentLogsLoading(true); setRecentLogsErr(null);
    try {
      const res = await fetch("/api/admin/attendance/recent?days=7");
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json(); setRecentLogs(d.records ?? []);
    } catch (e) { setRecentLogsErr(String(e)); }
    finally { setRecentLogsLoading(false); }
  }

  // Per-worker history (sub-tab inside Attendance). Cleared when staffId
  // is empty — that's the "pick a worker" idle state.
  const loadHistory = useCallback(async () => {
    if (!historyStaffId) {
      setHistoryDays([]); setHistoryError(null); return;
    }
    setHistoryLoading(true); setHistoryError(null);
    try {
      const q = new URLSearchParams({ from: historyFrom, to: historyTo });
      const res = await fetch(`/api/admin/staff/${historyStaffId}/history?${q.toString()}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json();
      setHistoryDays(d.days ?? []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : String(e));
      setHistoryDays([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyStaffId, historyFrom, historyTo]);

  function reload() { if (authState === "admin" || authState === "foreman") loadData(authState); }

  async function handleTabRefresh() {
    if (refreshing || dataLoading) return;
    setRefreshing(true);
    try {
      if (tab === "expenses")                               { await loadMaterials(); setLastRefreshed(new Date()); }
      else if (tab === "income")                            { await loadIncome();    setLastRefreshed(new Date()); }
      else if (tab === "attendance" && authState === "admin")
        await Promise.all([loadData("admin"), loadPending()]);
      else
        await loadData(authState as "admin" | "foreman");
      // loadData's finally sets lastRefreshed for the branches above that call it
    } finally { setRefreshing(false); }
  }

  async function approveAttRecord(id: string) {
    if (pendingActionId) return;
    setPendingActionId(id); setPendingErr(null);
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
      if (res.ok) setPendingRecords(p => p.filter(r => r.id !== id));
      else { const d = await res.json().catch(() => ({})); setPendingErr("שגיאה באישור: " + (d.error ?? res.status)); }
    } catch { setPendingErr("שגיאת רשת — לא ניתן לאשר. נסה שוב."); }
    finally { setPendingActionId(null); }
  }

  async function rejectAttRecord(id: string) {
    if (pendingActionId) return;
    setPendingActionId(id); setPendingErr(null);
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }) });
      if (res.ok) setPendingRecords(p => p.filter(r => r.id !== id));
      else { const d = await res.json().catch(() => ({})); setPendingErr("שגיאה בדחייה: " + (d.error ?? res.status)); }
    } catch { setPendingErr("שגיאת רשת — לא ניתן לדחות. נסה שוב."); }
    finally { setPendingActionId(null); }
  }

  // ── Login handlers ─────────────────────────────────────────────────────────
  async function handlePinLogin(submittedPin: string) {
    setLoginLoading(true); setLoginErr("");
    try {
      const res  = await fetch("/api/foreman-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: submittedPin }) });
      const data = await res.json();
      if (data.ok) {
        feedback.success(); setShowFlash(true);
        setForemanName(data.name ?? null); setForemanStaffId(data.staffId ?? null);
        const dest = resolvePostLoginPath("foreman");
        const here = window.location.pathname + window.location.search + window.location.hash;
        if (dest !== here) {
          window.location.assign(dest);
          return;
        }
        setAuthState("foreman");
      }
      else { feedback.error(); setLoginErr("קוד שגוי"); setPin(""); }
    } catch { setLoginErr("שגיאת רשת"); }
    finally { setLoginLoading(false); }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoginLoading(true); setLoginErr("");
    try {
      const res  = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.ok) {
        feedback.success(); setShowFlash(true);
        const dest = resolvePostLoginPath("admin");
        const here = window.location.pathname + window.location.search + window.location.hash;
        if (dest !== here) {
          window.location.assign(dest);
          return;
        }
        setAuthState("admin");
      }
      else if (res.status === 429) { feedback.error(); setLoginErr("יותר מדי נסיונות. נסה שוב בעוד כמה דקות."); }
      else { feedback.error(); setLoginErr("אימייל או סיסמה שגויים"); setPassword(""); }
    } catch { setLoginErr("שגיאת רשת"); }
    finally { setLoginLoading(false); }
  }

  async function handleLogout() {
    await fetch(authState === "foreman" ? "/api/foreman-auth" : "/api/admin-auth", { method: "DELETE" });
    setAuthState("unauthenticated");
    setForemanName(null);
    setAdminEmail(null); setAdminName(null);
    setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwMsg(null);
    setStaff([]); setTodayLogs([]); setProjects([]); setTasks([]);
    setMaterials([]); setBudget([]); setIncome([]);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!pwCurrent || !pwNew || !pwConfirm) return;
    if (pwNew.length < 8) {
      setPwMsg({ kind: "err", text: "סיסמה חדשה חייבת להיות באורך 8 תווים לפחות." });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ kind: "err", text: "אישור הסיסמה לא תואם לסיסמה החדשה." });
      return;
    }
    if (pwNew === pwCurrent) {
      setPwMsg({ kind: "err", text: "הסיסמה החדשה זהה לנוכחית. בחר/י סיסמה אחרת." });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (data.ok) {
        feedback.success();
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
        setPwMsg({ kind: "ok", text: "הסיסמה הוחלפה בהצלחה." });
      } else if (res.status === 401 && data.error === "wrong_current_password") {
        feedback.error();
        setPwMsg({ kind: "err", text: "הסיסמה הנוכחית שגויה." });
      } else if (res.status === 401) {
        feedback.error();
        setPwMsg({ kind: "err", text: "ההתחברות פגה. חזור/חזרי להתחבר." });
      } else if (res.status === 400 && data.error === "password_too_short") {
        feedback.error();
        setPwMsg({ kind: "err", text: "סיסמה חדשה חייבת להיות באורך 8 תווים לפחות." });
      } else {
        feedback.error();
        setPwMsg({ kind: "err", text: "שגיאה בשינוי סיסמה. נסה/י שוב." });
      }
    } catch {
      feedback.error();
      setPwMsg({ kind: "err", text: "שגיאת רשת. נסה/י שוב." });
    } finally {
      setPwSaving(false);
    }
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
        body: JSON.stringify({
          name: newName, phone: newPhone, role: newRole, national_id: newNationalId,
          hourly_rate: parseMoney(newHourlyRate),
          daily_rate:  parseMoney(newDailyRate),
          employment_type:       newEmploymentType,
          monthly_global_salary: parseMoney(newGlobalSalary),
          travel_allowance:      newTravelAllowance,
          pension_status:        newPensionStatus,
          holiday_eligible:      newHolidayEligible,
          is_freelancer:         newIsFreelancer,
          start_date:            newStartDate || undefined,
          notes:                 newNotes || undefined,
          pin: newPin || undefined,
        }) });
      const data = await res.json();
      if (res.ok) {
        setAddMsg("✓ " + newName + " נוסף");
        setNewName(""); setNewPhone(""); setNewNationalId("");
        setNewHourlyRate(""); setNewDailyRate(""); setNewPin("");
        setNewEmploymentType("hourly"); setNewGlobalSalary("");
        // Reset to "employee + travel=true" — the default for a fresh add.
        setNewTravelAllowance(true); setNewPensionStatus(""); setNewHolidayEligible(true);
        setNewIsFreelancer(false); setNewStartDate(""); setNewNotes("");
        reload();
      } else {
        setAddMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) { setAddMsg("שגיאת רשת: " + String(err)); }
    finally { setAddLoading(false); }
  }

  function startEdit(s: StaffMember) {
    setEditingId(s.id); setEditName(s.name); setEditPhone(s.phone); setEditRole(s.role);
    setEditNationalId(s.national_id ?? "");
    setEditHourlyRate(s.hourly_rate != null ? String(s.hourly_rate) : "");
    setEditDailyRate(s.daily_rate   != null ? String(s.daily_rate)  : "");
    setEditEmploymentType(s.employment_type ?? "hourly");
    setEditGlobalSalary(s.monthly_global_salary != null ? String(s.monthly_global_salary) : "");
    setEditTravelAllowance(!!s.travel_allowance);
    setEditPensionStatus(s.pension_status ?? "");
    setEditHolidayEligible(s.holiday_eligible !== false); // default true
    setEditIsFreelancer(!!s.is_freelancer);
    setEditStartDate(s.start_date ?? "");
    setEditNotes(s.notes ?? "");
    setEditPin(""); // always blank — admin sets a new PIN explicitly
    setEditMsg("");
  }

  async function handleEditWorker(e: React.FormEvent) {
    e.preventDefault(); if (!editingId) return;
    setEditLoading(true); setEditMsg("");
    try {
      const body: Record<string, unknown> = {
        name: editName, phone: editPhone, role: editRole, national_id: editNationalId,
        hourly_rate: parseMoney(editHourlyRate),
        daily_rate:  parseMoney(editDailyRate),
        employment_type:       editEmploymentType,
        monthly_global_salary: parseMoney(editGlobalSalary),
        travel_allowance:      editTravelAllowance,
        pension_status:        editPensionStatus,
        holiday_eligible:      editHolidayEligible,
        is_freelancer:         editIsFreelancer,
        start_date:            editStartDate || null,
        notes:                 editNotes || null,
      };
      if (editPin) body.pin = editPin; // only send if a new PIN was entered
      const res  = await fetch(`/api/admin/staff/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { setEditingId(null); reload(); }
      else        { setEditMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditMsg("שגיאת רשת: " + String(err)); }
    finally { setEditLoading(false); }
  }

  // ── Vacation drawer ────────────────────────────────────────────────────────
  async function openVacationDrawer(staffId: string) {
    setVacationFor(staffId);
    setVacationDate(""); setVacationHalf(false); setVacationMsg("");
    await loadVacationRows(staffId);
  }
  async function loadVacationRows(staffId: string) {
    try {
      const res = await fetch(`/api/admin/vacation?staff_id=${staffId}`);
      const data = await res.json();
      if (res.ok) setVacationRows(data.records ?? []);
    } catch { /* keep current rows */ }
  }
  async function handleAddVacation(e: React.FormEvent) {
    e.preventDefault();
    if (!vacationFor || !vacationDate) return;
    setVacationLoading(true); setVacationMsg("");
    try {
      const res = await fetch("/api/admin/vacation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: vacationFor, date: vacationDate, half_day: vacationHalf }),
      });
      const data = await res.json();
      if (res.ok) {
        setVacationDate(""); setVacationHalf(false);
        await loadVacationRows(vacationFor);
      } else {
        setVacationMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) {
      setVacationMsg("שגיאת רשת: " + String(err));
    } finally {
      setVacationLoading(false);
    }
  }
  async function handleDeleteVacation(id: string) {
    if (!vacationFor) return;
    await fetch(`/api/admin/vacation/${id}`, { method: "DELETE" });
    await loadVacationRows(vacationFor);
  }

  // ── Payroll ────────────────────────────────────────────────────────────────
  async function loadPayroll() {
    setPayrollLoading(true);
    try {
      const q = new URLSearchParams({ month: payrollMonth });
      if (payrollProject) q.set("project_id", payrollProject);
      const res = await fetch(`/api/admin/payroll?${q.toString()}`);
      const data = await res.json();
      if (res.ok) setPayrollRows(data.rows ?? []);
      else setPayrollRows([]);
    } catch {
      setPayrollRows([]);
    } finally {
      setPayrollLoading(false);
    }
  }
  async function exportPayroll() {
    setPayrollExporting(true);
    try {
      const q = new URLSearchParams({ month: payrollMonth });
      if (payrollProject) q.set("project_id", payrollProject);
      const res = await fetch(`/api/admin/payroll/export?${q.toString()}`);
      if (!res.ok) {
        alert("שגיאה בייצוא: " + res.status);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${payrollMonth}${payrollProject ? "-project" : ""}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPayrollExporting(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !current }) });
    reload();
  }

  async function deleteWorker(id: string) {
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "שגיאה במחיקה" }));
      alert(data.error ?? "שגיאה במחיקה");
      return;
    }
    reload();
  }

  // Called from WorkersTab — jump to the history sub-tab pre-selected with
  // this worker, regardless of which tab the admin is currently on.
  function viewWorkerHistory(staffId: string) {
    setHistoryStaffId(staffId);
    setAttendanceSubTab("history");
    goToTab("attendance");
  }

  // Reload the history any time the selection / range changes, but only while
  // the user is actually looking at the history sub-tab — saves a roundtrip
  // when they navigate elsewhere.
  useEffect(() => {
    if (tab !== "attendance" || attendanceSubTab !== "history") return;
    loadHistory();
  }, [tab, attendanceSubTab, historyStaffId, historyFrom, historyTo, loadHistory]);

  // ── Project CRUD ───────────────────────────────────────────────────────────
  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault(); setProjectAddLoading(true); setProjectAddMsg("");
    try {
      const res  = await fetch("/api/admin/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          address: newProjectAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let msg = "✓ " + newProjectName + " נוסף";
        if (data.geocode_failed) msg += " — אבל לא הצלחתי למצוא קואורדינטות לכתובת";
        setProjectAddMsg(msg);
        setNewProjectName(""); setNewProjectAddress("");
        reload();
      } else {
        setProjectAddMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) { setProjectAddMsg("שגיאת רשת: " + String(err)); }
    finally { setProjectAddLoading(false); }
  }

  async function toggleProjectStatus(id: string, current: string) {
    await fetch(`/api/admin/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: current === "active" ? "inactive" : "active" }) });
    reload();
  }

  function startEditProjectAddress(p: Project) {
    setEditingProjectId(p.id);
    setEditProjectAddress(p.address ?? "");
    setEditProjectMsg("");
  }

  async function saveProjectAddress(id: string) {
    setEditProjectSaving(true); setEditProjectMsg("");
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: editProjectAddress.trim() || null,
          geocode: true, // request fresh geocoding from the server
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.geocode_failed) {
          setEditProjectMsg("נשמר — אבל לא נמצאו קואורדינטות. נסה כתובת מדויקת יותר (רחוב, מספר, עיר).");
        } else {
          setEditingProjectId(null);
        }
        reload();
      } else {
        setEditProjectMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) { setEditProjectMsg("שגיאת רשת: " + String(err)); }
    finally { setEditProjectSaving(false); }
  }

  async function saveFarThreshold() {
    setFarThresholdSaving(true); setFarThresholdMsg("");
    try {
      const n = parseInt(farThresholdInput, 10);
      if (isNaN(n) || n < 0) {
        setFarThresholdMsg("צריך מספר חיובי במטרים");
        return;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "attendance_far_threshold_m", value: String(n) }),
      });
      if (res.ok) { setFarThresholdM(n); setFarThresholdMsg("✓ נשמר"); }
      else        { setFarThresholdMsg("שגיאה בשמירה"); }
    } catch (err) { setFarThresholdMsg("שגיאת רשת: " + String(err)); }
    finally { setFarThresholdSaving(false); }
  }

  // ── Expense CRUD ───────────────────────────────────────────────────────────
  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault(); setMatLoading(true); setMatMsg("");
    const qty = parsePositive(matQty);
    if (qty === null) { setMatMsg("שגיאה: כמות חייבת להיות מספר חיובי"); setMatLoading(false); return; }
    const cost = parseMoney(matCost); // null if empty/invalid; valid 0 stays 0
    if (matCost.trim() && cost === null) { setMatMsg("שגיאה: עלות לא תקינה"); setMatLoading(false); return; }
    try {
      const res  = await fetch("/api/admin/materials", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: matProjectId, material_name: matName, quantity: qty, unit: matUnit, supplier: matSupplier, cost, category: matCategory }) });
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
  function startEditAtt(r: AttendanceRecord, isPending = false) {
    setEditAttId(r.id);
    setEditAttIsPending(isPending);
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
      if (res.ok) {
        const wasPending = editAttIsPending;
        setEditAttId(null); setEditAttIsPending(false);
        if (wasPending) loadPending();
        else if (recentLogsVisible) loadRecentLogs();
        reload();
      } else { setEditAttMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditAttMsg("שגיאת רשת: " + String(err)); }
    finally { setEditAttLoading(false); }
  }

  async function handleEditAndApproveAtt() {
    if (!editAttId) return;
    setEditAttLoading(true); setEditAttMsg("");
    try {
      const res  = await fetch(`/api/admin/attendance/${editAttId}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: editAttAction, project_id: editAttProject || null, timestamp_label: editAttTimestamp, status: "approved" }) });
      const data = await res.json();
      if (res.ok) { setEditAttId(null); setEditAttIsPending(false); loadPending(); reload(); }
      else        { setEditAttMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setEditAttMsg("שגיאת רשת: " + String(err)); }
    finally { setEditAttLoading(false); }
  }

  // ── Admin manual attendance entry ──────────────────────────────────────────
  async function handleManualEntry(e: React.FormEvent) {
    e.preventDefault(); setManualLoading(true); setManualErr(null); setManualMsg(null);
    try {
      const res = await fetch("/api/admin/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id:   manualStaffId,
          date:       manualDate,
          type:       manualType,
          entry_time: manualEntryTime || undefined,
          exit_time:  manualExitTime  || undefined,
          project_id: manualProject   || undefined,
          notes:      manualNotes     || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const count = data.created === 2 ? "2 רשומות (כניסה + יציאה)" : "רשומה אחת";
        setManualMsg(`נוסף בהצלחה ✓ — ${count}`);
        setManualOpen(false);
        setManualStaffId(""); setManualDate(""); setManualType("regular");
        setManualEntryTime(""); setManualExitTime(""); setManualProject(""); setManualNotes("");
        reload();
      } else { setManualErr("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setManualErr("שגיאת רשת: " + String(err)); }
    finally { setManualLoading(false); }
  }

  // ── Income CRUD ────────────────────────────────────────────────────────────
  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault(); setIncLoading(true); setIncMsg("");
    const amount = parsePositive(incAmount);
    if (amount === null) { setIncMsg("שגיאה: סכום חייב להיות מספר חיובי"); setIncLoading(false); return; }
    try {
      const res  = await fetch("/api/admin/income", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: incProjectId, amount, description: incDesc, received_date: incDate }) });
      const data = await res.json();
      if (res.ok) { setIncMsg("✓ תשלום נרשם"); setIncAmount(""); setIncDesc(""); loadIncome(); }
      else        { setIncMsg("שגיאה: " + (data.error ?? res.status)); }
    } catch (err) { setIncMsg("שגיאת רשת: " + String(err)); }
    finally { setIncLoading(false); }
  }

  // ── Daily report ───────────────────────────────────────────────────────────

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
            <button key={mode} onClick={() => { setLoginMode(mode); setPin(""); setEmail(""); setPassword(""); setLoginErr(""); }}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${loginMode === mode ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal/60"}`}>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[0.75rem] tracking-widest uppercase text-charcoal/30">{sub}</p>
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
            <form onSubmit={handlePasswordLogin} className="space-y-3" dir="rtl">
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="אימייל"
                dir="ltr"
                className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
              />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="סיסמה"
                className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
              />
              <Btn loading={loginLoading} disabled={!email.trim() || !password.trim()}><LogIn size={14} className="inline me-1.5" />כניסה</Btn>
              <div className="text-center pt-1">
                <Link href="/admin/forgot-password" className="text-xs text-charcoal/40 hover:text-accent transition-colors">
                  שכחתי סיסמה
                </Link>
              </div>
            </form>
          )}

          {loginErr && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
              <AlertCircle size={14} strokeWidth={1.5} />{loginErr}
            </div>
          )}
        </div>

        <p className="font-body text-[0.7rem] tracking-widest uppercase text-charcoal/20">
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
    { key: "payroll",    label: "שכר",         icon: <DollarSign size={13} />,    adminOnly: true },
    { key: "account",    label: "חשבון",      icon: <UserCog   size={13} />,      adminOnly: true },
  ].filter(t => !t.adminOnly || isAdmin) as TabDef[];

  const activeProjects = projects.filter(p => p.status === "active");

  // ── Tab navigation helper ──────────────────────────────────────────────────
  // Used by both the tab bar and the AttentionPanel; keeps the URL hash in
  // sync so the active tab is shareable and the back button works.
  function goToTab(key: AdminTab) {
    setTab(key);
    if (typeof window !== "undefined") {
      const base = window.location.pathname + window.location.search;
      const next = key === "dashboard" ? base : `${base}#${key}`;
      history.replaceState(null, "", next);
    }
  }

  // ── AttentionPanel inputs ──────────────────────────────────────────────────
  // All counts are derived from state already loaded by the dashboard; no
  // new endpoint required. The "not clocked in" item only fires between
  // 09:00–14:00 Israel time so it doesn't flag overnight or evening hours
  // when no-one is expected to be on site.
  const israelHour = parseInt(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem", hour: "numeric", hour12: false }),
    10
  );
  const delayedCount = tasks.filter(t => t.status === "delayed").length;
  const noGpsCount   = projects.filter(p => p.status === "active" && (p.lat == null || p.lng == null)).length;
  let notClockedInCount = 0;
  if (isAdmin && israelHour >= 9 && israelHour < 14) {
    const clockedIds = new Set(
      todayLogs.filter(r => r.staff?.id).map(r => r.staff!.id)
    );
    notClockedInCount = staff.filter(
      s => s.active && (s.role === "עובד" || s.role === "ממונה") && !clockedIds.has(s.id)
    ).length;
  }
  const attentionItems: AttentionItem[] = [
    {
      key: "pending",
      icon: <Clock size={14} strokeWidth={1.5} />,
      label: "בקשות תיקון נוכחות ממתינות לאישור",
      count: pendingRecords.length,
      severity: "high",
      onClick: () => goToTab("attendance"),
    },
    {
      key: "delayed",
      icon: <AlertCircle size={14} strokeWidth={1.5} />,
      label: "משימות בעיכוב",
      count: delayedCount,
      severity: "medium",
      onClick: () => goToTab("planning"),
    },
    {
      key: "not-clocked",
      icon: <UserX size={14} strokeWidth={1.5} />,
      label: "עובדים פעילים שטרם החתימו היום",
      count: notClockedInCount,
      severity: "medium",
      onClick: () => goToTab("attendance"),
    },
    {
      key: "no-gps",
      icon: <MapPin size={14} strokeWidth={1.5} />,
      label: "פרויקטים פעילים ללא GPS",
      count: noGpsCount,
      severity: "info",
      onClick: () => goToTab("projects"),
    },
  ];

  return (
    <>
    <SuccessFlash show={showFlash} onDone={() => setShowFlash(false)} />
    <div dir="rtl" className="min-h-screen bg-bone px-4 py-8 font-body text-charcoal">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/he" className="text-[0.75rem] font-bold tracking-[0.2em] uppercase text-accent/60 hover:text-accent transition-colors duration-200">
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
        <div className={`grid gap-2 ${isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
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
                  <div className="text-[0.75rem] text-charcoal/60 mt-0.5 leading-tight">{s.label}</div>
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
                  <div className="text-[0.75rem] text-charcoal/60 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap border-b border-charcoal/10">
          {TABS.map(t => {
            // Only Attendance carries the pending-approvals badge for now.
            // Easy to extend later: keep the count source local to the tab def.
            const badgeCount = t.key === "attendance" ? pendingRecords.length : 0;
            return (
              <button
                key={t.key}
                onClick={() => goToTab(t.key)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap border-b-2 transition-colors duration-150 ${tab === t.key ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal/70"}`}
              >
                {t.icon} {t.label}
                {badgeCount > 0 && (
                  <span
                    className="absolute -top-0.5 -end-0.5 bg-red-500 text-white text-[0.6rem] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none"
                    aria-label={`${badgeCount} ממתינים לאישור`}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-4">
            <TabRefreshBar loading={refreshing || dataLoading} onRefresh={handleTabRefresh} lastRefreshed={lastRefreshed} />
            <p className="text-[0.75rem] text-charcoal/30 text-center -mt-2">מתעדכן אוטומטית כל 2 דקות</p>

            {/* Things that need attention — admin only; auto-hides when empty */}
            {isAdmin && <AttentionPanel items={attentionItems} />}

            {/* On-site */}
            <Card title="⚡ מי באתר כרגע">
              {onSite.length === 0 ? (
                <p className="text-sm text-charcoal/30 text-center py-2">אין עובדים מדווחים כרגע</p>
              ) : (
                <div className="divide-y divide-charcoal/5">
                  {onSite.map(({ record, worker }) => {
                    const t = record.clock_at
                      ? new Date(record.clock_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })
                      : new Date(record.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={record.id} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{record.staff?.name ?? "—"}</p>
                          <p className="text-[0.75rem] text-charcoal/40">{record.staff?.role ?? ""}</p>
                        </div>
                        {record.project && (
                          <div className="flex items-center gap-1 text-[0.75rem] text-charcoal/50">
                            <Building2 size={10} strokeWidth={1.5} />
                            <span className="truncate max-w-[80px]">{record.project.name}</span>
                          </div>
                        )}
                        {isAdmin && worker?.daily_rate && (
                          <span className="text-[0.75rem] text-accent/70 shrink-0">₪{worker.daily_rate}/יום</span>
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
                          <p className="text-[0.75rem] text-charcoal/40">{taskCount} משימות פעילות</p>
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
                            <p className="text-[0.75rem] text-charcoal/40">הכנסות</p>
                            <p className="font-bold text-green-600 tabular-nums">₪{inc.toLocaleString("he-IL")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.75rem] text-charcoal/40">הוצאות</p>
                            <p className="font-bold text-red-500 tabular-nums">₪{exp.toLocaleString("he-IL")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[0.75rem] text-charcoal/40">רווח נקי</p>
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
                          <div className="flex items-center gap-1 text-[0.75rem] text-charcoal/40 mt-0.5">
                            {proj && <><Building2 size={9} strokeWidth={1.5} /><span>{proj.name}</span></>}
                            {t.contractor && <span className="ms-1">· {t.contractor}</span>}
                          </div>
                        </div>
                        <span className={`text-[0.75rem] px-2 py-0.5 shrink-0 ${STATUS_CLS[t.status]}`}>{STATUS_HE[t.status]}</span>
                        {t.status !== "in_progress" && (
                          <button onClick={() => setTaskStatus(t.id, "in_progress")} className="text-[0.75rem] border border-amber-300 px-2 py-0.5 text-amber-700 hover:bg-amber-50 transition-colors shrink-0">הפעל</button>
                        )}
                        {t.status !== "completed" && (
                          <button onClick={() => setTaskStatus(t.id, "completed")} className="text-[0.75rem] border border-green-300 px-2 py-0.5 text-green-700 hover:bg-green-50 transition-colors shrink-0">סיים</button>
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
          <AttendanceTab
            attReportFrom={attReportFrom}       setAttReportFrom={setAttReportFrom}
            attReportTo={attReportTo}           setAttReportTo={setAttReportTo}
            attReportLoading={attReportLoading} setAttReportLoading={setAttReportLoading}
            attReportErr={attReportErr}         setAttReportErr={setAttReportErr}
            attReportData={attReportData}       setAttReportData={setAttReportData}
            editAttId={editAttId}               setEditAttId={setEditAttId}
            editAttAction={editAttAction}       setEditAttAction={setEditAttAction}
            editAttProject={editAttProject}     setEditAttProject={setEditAttProject}
            editAttTimestamp={editAttTimestamp} setEditAttTimestamp={setEditAttTimestamp}
            editAttLoading={editAttLoading}
            editAttMsg={editAttMsg}
            onStartEditAtt={startEditAtt}
            onHandleEditAtt={handleEditAtt}
            onHandleEditAndApprove={handleEditAndApproveAtt}
            manualOpen={manualOpen}           setManualOpen={setManualOpen}
            manualStaffId={manualStaffId}     setManualStaffId={setManualStaffId}
            manualDate={manualDate}           setManualDate={setManualDate}
            manualType={manualType}           setManualType={setManualType}
            manualEntryTime={manualEntryTime} setManualEntryTime={setManualEntryTime}
            manualExitTime={manualExitTime}   setManualExitTime={setManualExitTime}
            manualProject={manualProject}     setManualProject={setManualProject}
            manualNotes={manualNotes}         setManualNotes={setManualNotes}
            manualLoading={manualLoading}
            manualMsg={manualMsg} setManualMsg={setManualMsg}
            manualErr={manualErr} setManualErr={setManualErr}
            onManualEntry={handleManualEntry}
            pendingRecords={pendingRecords}
            pendingLoading={pendingLoading}
            pendingErr={pendingErr}
            pendingActionId={pendingActionId}
            onLoadPending={loadPending}
            onApproveAtt={approveAttRecord}
            onRejectAtt={rejectAttRecord}
            todayLogs={todayLogs}
            dataLoading={dataLoading}
            attLoadErr={attLoadErr}
            onReload={reload}
            recentLogs={recentLogs}
            recentLogsLoading={recentLogsLoading}
            recentLogsErr={recentLogsErr}
            recentLogsVisible={recentLogsVisible} setRecentLogsVisible={setRecentLogsVisible}
            onLoadRecentLogs={loadRecentLogs}
            staff={staff}
            projects={projects}
            farThresholdM={farThresholdM}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            onTabRefresh={handleTabRefresh}
            subTab={attendanceSubTab}             setSubTab={setAttendanceSubTab}
            historyStaffId={historyStaffId}       setHistoryStaffId={setHistoryStaffId}
            historyFrom={historyFrom}             setHistoryFrom={setHistoryFrom}
            historyTo={historyTo}                 setHistoryTo={setHistoryTo}
            historyDays={historyDays}
            historyLoading={historyLoading}
            historyError={historyError}
            onLoadHistory={loadHistory}
          />
        )}

        {/* ── WORKERS (admin only) ───────────────────────────────────────────── */}
        {tab === "workers" && isAdmin && (
          <WorkersTab
            staff={staff}
            newName={newName}                       setNewName={setNewName}
            newPhone={newPhone}                     setNewPhone={setNewPhone}
            newRole={newRole}                       setNewRole={setNewRole}
            newNationalId={newNationalId}           setNewNationalId={setNewNationalId}
            newEmploymentType={newEmploymentType}   setNewEmploymentType={setNewEmploymentType}
            newHourlyRate={newHourlyRate}           setNewHourlyRate={setNewHourlyRate}
            newDailyRate={newDailyRate}             setNewDailyRate={setNewDailyRate}
            newGlobalSalary={newGlobalSalary}       setNewGlobalSalary={setNewGlobalSalary}
            newTravelAllowance={newTravelAllowance} setNewTravelAllowance={setNewTravelAllowance}
            newHolidayEligible={newHolidayEligible} setNewHolidayEligible={setNewHolidayEligible}
            newPensionStatus={newPensionStatus}     setNewPensionStatus={setNewPensionStatus}
            newIsFreelancer={newIsFreelancer}       setNewIsFreelancer={setNewIsFreelancer}
            newStartDate={newStartDate}             setNewStartDate={setNewStartDate}
            newNotes={newNotes}                     setNewNotes={setNewNotes}
            newPin={newPin}                         setNewPin={setNewPin}
            addLoading={addLoading} addMsg={addMsg}
            onAddWorker={handleAddWorker}
            editingId={editingId}                   setEditingId={setEditingId}
            editName={editName}                     setEditName={setEditName}
            editPhone={editPhone}                   setEditPhone={setEditPhone}
            editRole={editRole}                     setEditRole={setEditRole}
            editNationalId={editNationalId}         setEditNationalId={setEditNationalId}
            editEmploymentType={editEmploymentType} setEditEmploymentType={setEditEmploymentType}
            editHourlyRate={editHourlyRate}         setEditHourlyRate={setEditHourlyRate}
            editDailyRate={editDailyRate}           setEditDailyRate={setEditDailyRate}
            editGlobalSalary={editGlobalSalary}     setEditGlobalSalary={setEditGlobalSalary}
            editTravelAllowance={editTravelAllowance} setEditTravelAllowance={setEditTravelAllowance}
            editHolidayEligible={editHolidayEligible} setEditHolidayEligible={setEditHolidayEligible}
            editPensionStatus={editPensionStatus}   setEditPensionStatus={setEditPensionStatus}
            editIsFreelancer={editIsFreelancer}     setEditIsFreelancer={setEditIsFreelancer}
            editStartDate={editStartDate}           setEditStartDate={setEditStartDate}
            editNotes={editNotes}                   setEditNotes={setEditNotes}
            editPin={editPin}                       setEditPin={setEditPin}
            editLoading={editLoading} editMsg={editMsg}
            onEditWorker={handleEditWorker}
            onStartEdit={startEdit}
            onToggleActive={toggleActive}
            onDeleteWorker={deleteWorker}
            onViewHistory={viewWorkerHistory}
            onOpenVacation={openVacationDrawer}
            onReload={reload}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            dataLoading={dataLoading}
            onTabRefresh={handleTabRefresh}
          />
        )}

        {/* ── PROJECTS (admin only) ──────────────────────────────────────────── */}
        {tab === "projects" && isAdmin && (
          <ProjectsTab
            projects={projects}
            staff={staff}
            tasks={tasks}
            newProjectName={newProjectName}       setNewProjectName={setNewProjectName}
            newProjectAddress={newProjectAddress} setNewProjectAddress={setNewProjectAddress}
            projectAddLoading={projectAddLoading} projectAddMsg={projectAddMsg}
            onAddProject={handleAddProject}
            editingProjectId={editingProjectId}     setEditingProjectId={setEditingProjectId}
            editProjectAddress={editProjectAddress} setEditProjectAddress={setEditProjectAddress}
            editProjectSaving={editProjectSaving}
            editProjectMsg={editProjectMsg}         setEditProjectMsg={setEditProjectMsg}
            onStartEditAddress={startEditProjectAddress}
            onSaveProjectAddress={saveProjectAddress}
            onToggleProjectStatus={toggleProjectStatus}
            onReload={reload}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            dataLoading={dataLoading}
            onTabRefresh={handleTabRefresh}
          />
        )}

        {/* ── EXPENSES ──────────────────────────────────────────────────────── */}
        {tab === "expenses" && (
          <ExpensesTab
            materials={materials}
            budget={budget}
            projects={projects}
            activeProjects={activeProjects}
            matProjectId={matProjectId} setMatProjectId={setMatProjectId}
            matCategory={matCategory}   setMatCategory={setMatCategory}
            matName={matName}           setMatName={setMatName}
            matSupplier={matSupplier}   setMatSupplier={setMatSupplier}
            matQty={matQty}             setMatQty={setMatQty}
            matUnit={matUnit}           setMatUnit={setMatUnit}
            matCost={matCost}           setMatCost={setMatCost}
            matLoading={matLoading} matMsg={matMsg}
            matFilter={matFilter}       setMatFilter={setMatFilter}
            onAddMaterial={handleAddMaterial}
            onReloadMaterials={loadMaterials}
            expenseCategories={EXPENSE_CATEGORIES}
            units={UNITS}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            onTabRefresh={handleTabRefresh}
          />
        )}

        {/* ── PLANNING ──────────────────────────────────────────────────────── */}
        {tab === "planning" && (
          <PlanningTab
            projects={projects}
            activeProjects={activeProjects}
            tasks={tasks}
            milestones={milestones}
            weekDays={weekDays}
            todayStr={todayStr}
            newMsProjectId={newMsProjectId}   setNewMsProjectId={setNewMsProjectId}
            newMsName={newMsName}             setNewMsName={setNewMsName}
            newMsTargetDate={newMsTargetDate} setNewMsTargetDate={setNewMsTargetDate}
            msAddLoading={msAddLoading} msAddMsg={msAddMsg}
            onAddMilestone={handleAddMilestone}
            newTaskProjectId={newTaskProjectId}     setNewTaskProjectId={setNewTaskProjectId}
            newTaskMilestoneId={newTaskMilestoneId} setNewTaskMilestoneId={setNewTaskMilestoneId}
            newTaskName={newTaskName}               setNewTaskName={setNewTaskName}
            newTaskContractor={newTaskContractor}   setNewTaskContractor={setNewTaskContractor}
            newTaskStart={newTaskStart}             setNewTaskStart={setNewTaskStart}
            newTaskEnd={newTaskEnd}                 setNewTaskEnd={setNewTaskEnd}
            taskAddLoading={taskAddLoading} taskAddMsg={taskAddMsg}
            onAddTask={handleAddTask}
            taskFilter={taskFilter} setTaskFilter={setTaskFilter}
            expandedMs={expandedMs} onToggleMs={toggleMs}
            onAssignTaskDay={assignTaskDay}
            onSetTaskStatus={setTaskStatus}
            onSetMilestoneStatus={setMilestoneStatus}
            onReload={reload}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            dataLoading={dataLoading}
            onTabRefresh={handleTabRefresh}
          />
        )}

        {/* ── INCOME (admin only) ────────────────────────────────────────────── */}
        {tab === "income" && isAdmin && (
          <IncomeTab
            projects={projects}
            income={income}
            incomeTotals={incomeTotals}
            incProjectId={incProjectId} setIncProjectId={setIncProjectId}
            incAmount={incAmount}       setIncAmount={setIncAmount}
            incDesc={incDesc}           setIncDesc={setIncDesc}
            incDate={incDate}           setIncDate={setIncDate}
            incLoading={incLoading}
            incMsg={incMsg}
            onAddIncome={handleAddIncome}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            onTabRefresh={handleTabRefresh}
          />
        )}

        {/* ── REPORTS (admin only) — lazy-loaded ─────────────────────────────── */}
        {tab === "reports" && isAdmin && (
          <ReportsTabPanel
            activeProjects={activeProjects}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            onTabRefresh={handleTabRefresh}
          />
        )}

        {/* ── WEEKLY MATRIX (admin only) ─────────────────────────────────────── */}
        {tab === "matrix" && isAdmin && (
          <MatrixTabPanel
            activeProjects={activeProjects}
            lastRefreshed={lastRefreshed}
            refreshing={refreshing}
            onTabRefresh={handleTabRefresh}
            dataLoading={dataLoading}
          />
        )}

        {/* ── PAYROLL (admin only) ───────────────────────────────────────────── */}
        {tab === "payroll" && isAdmin && (
          <div className="space-y-3">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} strokeWidth={1.5} className="text-accent" />
                <h2 className="font-heading text-base font-bold">דוח שכר חודשי</h2>
              </div>
              <p className="text-xs text-charcoal/50 mb-4 leading-relaxed">
                בחר חודש ולחץ "טען" לראות סיכום ימי עבודה, שעות, חופשה ושכר ברוטו לכל עובד פעיל.
                ייצוא ל-XLSX מוכן לשליחה לרוא"ח.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="חודש">
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={e => setPayrollMonth(e.target.value)}
                    className={INPUT}
                    dir="ltr"
                  />
                </Field>
                <Field label="פרויקט (אופציונלי)">
                  <select value={payrollProject} onChange={e => setPayrollProject(e.target.value)} className={INPUT}>
                    <option value="">כל הפרויקטים</option>
                    {activeProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-end gap-2">
                  <button
                    onClick={loadPayroll}
                    disabled={payrollLoading}
                    className="flex-1 bg-accent py-2.5 text-xs font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {payrollLoading ? <><Loader2 size={13} className="animate-spin" /> טוען…</> : "טען נתונים"}
                  </button>
                  <button
                    onClick={exportPayroll}
                    disabled={payrollExporting || payrollLoading}
                    className="flex-1 border border-accent py-2.5 text-xs font-semibold tracking-wider uppercase text-accent hover:bg-accent/[0.08] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                    title="ייצוא ל-XLSX (גם בלי לטעון תחילה)"
                  >
                    {payrollExporting ? <><Loader2 size={13} className="animate-spin" /> מייצא…</> : <><Download size={13} /> XLSX</>}
                  </button>
                </div>
              </div>
            </Card>

            {payrollRows.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-sm font-bold">{payrollRows.length} עובדים</h3>
                  <span className="text-sm font-bold text-accent tabular-nums">
                    סה"כ ברוטו: ₪{payrollRows.reduce((s, r) => s + r.gross_salary, 0).toLocaleString("he-IL", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-warm-gray-light">
                        <th className="text-start py-2 font-semibold text-charcoal/60">שם</th>
                        <th className="text-start py-2 font-semibold text-charcoal/60">סוג</th>
                        <th className="text-center py-2 font-semibold text-charcoal/60">ימים</th>
                        <th className="text-center py-2 font-semibold text-charcoal/60">שעות</th>
                        <th className="text-center py-2 font-semibold text-charcoal/60">חופשה</th>
                        <th className="text-center py-2 font-semibold text-charcoal/60">חגים</th>
                        <th className="text-center py-2 font-semibold text-charcoal/60">נסיעות</th>
                        <th className="text-start py-2 font-semibold text-charcoal/60">פנסיה</th>
                        <th className="text-end py-2 font-semibold text-charcoal/60">ברוטו</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRows.map(r => (
                        <tr key={r.staff_id} className="border-b border-charcoal/5">
                          <td className="py-2 font-semibold">
                            {r.name}
                            {r.deleted_at && <span className="ms-2 text-[0.75rem] font-normal text-charcoal/40">🗑️ (מחוק)</span>}
                          </td>
                          <td className="py-2 text-charcoal/60">
                            {r.employment_type === "hourly" ? "שעתי" : r.employment_type === "daily" ? "יומי" : "גלובלי"}
                          </td>
                          <td className="py-2 text-center tabular-nums">{r.days_worked}</td>
                          <td className="py-2 text-center tabular-nums">{r.hours_worked.toFixed(1)}</td>
                          <td className="py-2 text-center tabular-nums">{r.vacation_days}</td>
                          <td className="py-2 text-center">{r.holiday_eligible ? "✓" : "—"}</td>
                          <td className="py-2 text-center">{r.travel_allowance ? "✓" : "—"}</td>
                          <td className="py-2 text-charcoal/60 truncate max-w-[120px]">{r.pension_status ?? "—"}</td>
                          <td className="py-2 text-end font-bold text-accent tabular-nums">₪{r.gross_salary.toLocaleString("he-IL", { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {!payrollLoading && payrollRows.length === 0 && (
              <Card>
                <p className="text-sm text-charcoal/30 text-center py-6">לחץ "טען נתונים" לראות דוח לחודש שנבחר.</p>
              </Card>
            )}
          </div>
        )}

        {/* ── ACCOUNT (admin only) ───────────────────────────────────────────── */}
        {tab === "account" && isAdmin && (
          <AccountTab
            adminEmail={adminEmail}
            adminName={adminName}
            farThresholdM={farThresholdM}
            farThresholdInput={farThresholdInput}
            setFarThresholdInput={setFarThresholdInput}
            farThresholdSaving={farThresholdSaving}
            farThresholdMsg={farThresholdMsg}
            onSaveFarThreshold={saveFarThreshold}
            pwCurrent={pwCurrent} setPwCurrent={setPwCurrent}
            pwNew={pwNew}         setPwNew={setPwNew}
            pwConfirm={pwConfirm} setPwConfirm={setPwConfirm}
            pwSaving={pwSaving}
            pwMsg={pwMsg}
            onChangePassword={handleChangePassword}
          />
        )}

        <p className="text-center font-body text-[0.7rem] tracking-widest uppercase text-charcoal/20 pt-2">
          בניין איתן — פורטל ניהול פנימי
        </p>
      </div>

      {/* ── VACATION DRAWER (overlay) ───────────────────────────────────────── */}
      {vacationFor && (() => {
        const worker = staff.find(s => s.id === vacationFor);
        return (
          <div className="fixed inset-0 bg-charcoal/40 z-50 flex items-center justify-center p-4" onClick={() => setVacationFor(null)}>
            <div className="bg-bone max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="bg-white border-b border-warm-gray-light px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[0.75rem] text-charcoal/40 uppercase tracking-widest">ימי חופשה</p>
                  <h3 className="font-heading text-base font-bold">{worker?.name ?? "—"}</h3>
                </div>
                <button onClick={() => setVacationFor(null)} className="text-charcoal/40 hover:text-charcoal transition-colors p-1">
                  <ChevronLeft size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <form onSubmit={handleAddVacation} className="space-y-3">
                  <Field label="תאריך">
                    <input type="date" value={vacationDate} onChange={e => setVacationDate(e.target.value)} required className={INPUT} dir="ltr" />
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={vacationHalf} onChange={e => setVacationHalf(e.target.checked)} className="accent-accent" />
                    <span className="text-charcoal/70">חצי יום</span>
                  </label>
                  <button type="submit" disabled={vacationLoading || !vacationDate} className="w-full bg-accent py-2.5 text-xs font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                    {vacationLoading ? <><Loader2 size={13} className="animate-spin" /> מוסיף…</> : <><Plus size={13} /> הוסף יום חופש</>}
                  </button>
                  {vacationMsg && <p className="text-xs text-red-500">{vacationMsg}</p>}
                </form>

                <div className="border-t border-warm-gray-light pt-4">
                  <p className="text-[0.7rem] text-charcoal/50 mb-2">היסטוריה ({vacationRows.length})</p>
                  {vacationRows.length === 0 ? (
                    <p className="text-xs text-charcoal/30 text-center py-4">אין ימי חופשה רשומים</p>
                  ) : (
                    <div className="divide-y divide-charcoal/5">
                      {vacationRows.map(v => (
                        <div key={v.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm font-semibold tabular-nums" dir="ltr">
                              {new Date(v.date).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </p>
                            {v.half_day && <p className="text-[0.75rem] text-amber-600">חצי יום</p>}
                            {v.notes && <p className="text-[0.75rem] text-charcoal/50">{v.notes}</p>}
                          </div>
                          <button onClick={() => handleDeleteVacation(v.id)} className="text-charcoal/30 hover:text-red-500 transition-colors text-xs border border-charcoal/15 px-2 py-1">מחק</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </>
  );
}


