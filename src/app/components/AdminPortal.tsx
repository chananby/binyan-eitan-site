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
  UserCog, Clock, MapPin, UserX, FileText, Inbox,
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
import LoginScreen from "../admin/_components/tabs/LoginScreen";
import DashboardTab from "../admin/_components/tabs/DashboardTab";
import PayrollTab from "../admin/_components/tabs/PayrollTab";
import QuotesTab from "../admin/_components/tabs/QuotesTab";
import DocumentsTab from "../admin/_components/tabs/DocumentsTab";
import { useVacationDrawer } from "../admin/_components/hooks/useVacationDrawer";
import { useChangePassword } from "../admin/_components/hooks/useChangePassword";
import { useIncomeForm } from "../admin/_components/hooks/useIncomeForm";
import { useExpensesForm } from "../admin/_components/hooks/useExpensesForm";
import { useAttendanceReport } from "../admin/_components/hooks/useAttendanceReport";
import { usePayroll } from "../admin/_components/hooks/usePayroll";
import { useMilestonesAndTasks } from "../admin/_components/hooks/useMilestonesAndTasks";
import { useWorkerForms } from "../admin/_components/hooks/useWorkerForms";
import { useAdminAttendance } from "../admin/_components/hooks/useAdminAttendance";
import type {
  StaffMember, VacationRecord, PayrollRow, AttendanceRecord,
  Project, Task, Milestone, Material, BudgetLine, IncomeRecord,
  AttReportRow, AttSummaryRow, AttReportData,
} from "../admin/_components/types";
import type { WorkerHistoryDay } from "../../lib/worker-history-aggregate";

// ── Types ──────────────────────────────────────────────────────────────────────
type AuthState = "loading" | "unauthenticated" | "foreman" | "admin";
type AdminTab  = "dashboard" | "attendance" | "workers" | "projects" | "expenses" | "planning" | "matrix" | "income" | "reports" | "payroll" | "quotes" | "documents" | "account";
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
  quotes:     "quotes",
  documents:  "documents",
  account:    "account",
};

// Entity types are exported from ../admin/_components/types — imported above.

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
  // Password change form — state + handler in useChangePassword

  // Tactile / audio feedback
  const feedback  = useFeedback();

  // Password-change form — state + handler in useChangePassword
  const changePw = useChangePassword(feedback);
  const {
    pwCurrent, setPwCurrent,
    pwNew,     setPwNew,
    pwConfirm, setPwConfirm,
    pwSaving,
    pwMsg, setPwMsg,
    handleChangePassword,
  } = changePw;
  const [showFlash, setShowFlash] = useState(false);

  // Friendly session-expiry banner — populated when a polled admin
  // fetch comes back 401, OR when the client's own idle tracker passes
  // the 90-minute threshold. Surfaced to LoginScreen and cleared on the
  // first user interaction there.
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

  // Idle activity tracker. lastActivityRef holds the wall-clock time of
  // the most recent user input event. The polling effect checks this
  // before each loadData call; passing IDLE_TIMEOUT_MS triggers a
  // local logout + the friendly banner above.
  const lastActivityRef = useRef<number>(Date.now());
  const IDLE_TIMEOUT_MS = 90 * 60 * 1000;

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
  // Milestones + tasks add forms + per-row mutations — useMilestonesAndTasks
  const msTasks = useMilestonesAndTasks(() => reload());
  const {
    expandedMs,        setExpandedMs,
    newMsProjectId,    setNewMsProjectId,
    newMsName,         setNewMsName,
    newMsTargetDate,   setNewMsTargetDate,
    msAddLoading,
    msAddMsg,
    newTaskMilestoneId, setNewTaskMilestoneId,
    taskFilter,         setTaskFilter,
    newTaskProjectId,   setNewTaskProjectId,
    newTaskName,        setNewTaskName,
    newTaskStart,       setNewTaskStart,
    newTaskEnd,         setNewTaskEnd,
    newTaskContractor,  setNewTaskContractor,
    taskAddLoading,
    taskAddMsg,
    handleAddTask,
    handleAddMilestone,
    setTaskStatus,
    setMilestoneStatus,
    toggleMs,
    assignTaskDay,
  } = msTasks;

  // (task milestone assignment now lives in useMilestonesAndTasks above)

  // Workers add+edit forms — state + CRUD handlers in useWorkerForms
  const workers = useWorkerForms(() => reload());
  const {
    newName, setNewName,
    newPhone, setNewPhone,
    newRole, setNewRole,
    newNationalId, setNewNationalId,
    newHourlyRate, setNewHourlyRate,
    newDailyRate,  setNewDailyRate,
    newPin,        setNewPin,
    newEmploymentType,   setNewEmploymentType,
    newGlobalSalary,     setNewGlobalSalary,
    newTravelAllowance,  setNewTravelAllowance,
    newPensionStatus,    setNewPensionStatus,
    newHolidayEligible,  setNewHolidayEligible,
    newIsFreelancer,     setNewIsFreelancer,
    newAttendanceExempt, setNewAttendanceExempt,
    newStartDate,        setNewStartDate,
    newEmploymentEndDate, setNewEmploymentEndDate,
    newNotes,            setNewNotes,
    newBankName,         setNewBankName,
    newBankBranch,       setNewBankBranch,
    newBankAccount,      setNewBankAccount,
    newBankAccountOwner, setNewBankAccountOwner,
    newBankIban,         setNewBankIban,
    addLoading, addMsg,
    editingId,       setEditingId,
    editName,        setEditName,
    editPhone,       setEditPhone,
    editRole,        setEditRole,
    editNationalId,  setEditNationalId,
    editHourlyRate,  setEditHourlyRate,
    editDailyRate,   setEditDailyRate,
    editPin,         setEditPin,
    editEmploymentType,  setEditEmploymentType,
    editGlobalSalary,    setEditGlobalSalary,
    editTravelAllowance, setEditTravelAllowance,
    editPensionStatus,   setEditPensionStatus,
    editHolidayEligible, setEditHolidayEligible,
    editIsFreelancer,    setEditIsFreelancer,
    editAttendanceExempt,setEditAttendanceExempt,
    editStartDate,       setEditStartDate,
    editEmploymentEndDate, setEditEmploymentEndDate,
    editNotes,           setEditNotes,
    editBankName,         setEditBankName,
    editBankBranch,       setEditBankBranch,
    editBankAccount,      setEditBankAccount,
    editBankAccountOwner, setEditBankAccountOwner,
    editBankIban,         setEditBankIban,
    editLoading, editMsg,
    handleAddWorker,
    handleEditWorker,
    startEdit,
    toggleActive,
    deleteWorker,
  } = workers;

  // Vacation editor (per-staff drawer) — state + handlers in useVacationDrawer
  const vacation = useVacationDrawer();
  const {
    vacationFor,    setVacationFor,
    vacationRows,
    vacationDate,   setVacationDate,
    vacationHalf,   setVacationHalf,
    vacationLoading,
    vacationMsg,
    openVacationDrawer,
    handleAddVacation,
    handleDeleteVacation,
  } = vacation;

  // Payroll tab
  // Payroll — state + loader + export in usePayroll
  const payroll = usePayroll();
  const {
    payrollMonth,     setPayrollMonth,
    payrollStaffId,   setPayrollStaffId,
    payrollRows,
    payrollLoading,
    payrollExporting,
    loadPayroll,
    exportPayroll,
  } = payroll;

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
  // Expenses add form — state + handler in useExpensesForm. matFilter
  // stays here because loadMaterials() depends on it (and re-fires from
  // useEffect when it changes).
  const expensesForm = useExpensesForm(() => loadMaterials(), feedback);
  const {
    matProjectId, setMatProjectId,
    matCategory,  setMatCategory,
    matName,      setMatName,
    matQty,       setMatQty,
    matUnit,      setMatUnit,
    matSupplier,  setMatSupplier,
    matCost,      setMatCost,
    matLoading,
    matMsg,
    handleAddMaterial,
  } = expensesForm;
  const [matFilter,    setMatFilter]    = useState("");

  // Planning UI
  // (task add-form state now lives in useMilestonesAndTasks above)

  // Attendance report + per-worker history — state + loader in useAttendanceReport
  const attReport = useAttendanceReport();
  const {
    attReportFrom,    setAttReportFrom,
    attReportTo,      setAttReportTo,
    attReportLoading, setAttReportLoading,
    attReportErr,     setAttReportErr,
    attReportData,    setAttReportData,
    historyStaffId,   setHistoryStaffId,
    historyFrom,      setHistoryFrom,
    historyTo,        setHistoryTo,
    historyDays,
    historyLoading,
    historyError,
    loadHistory,
  } = attReport;

  // Pending approvals — list stays here because the dashboard's
  // AttentionPanel reads it; the per-row mutation handlers live in
  // useAdminAttendance below.
  const [pendingRecords,   setPendingRecords]   = useState<AttendanceRecord[]>([]);
  const [pendingLoading,   setPendingLoading]   = useState(false);
  const [pendingErr,       setPendingErr]       = useState<string | null>(null);

  // Admin attendance — edit + manual + approve/reject + recent log
  const adminAtt = useAdminAttendance({
    reload: () => reload(),
    loadPending: () => loadPending(),
    setPendingRecords,
    setPendingErr,
  });
  const {
    editAttId,        setEditAttId,
    editAttAction,    setEditAttAction,
    editAttProject,   setEditAttProject,
    editAttTimestamp, setEditAttTimestamp,
    editAttLoading,
    editAttMsg,
    editAttIsPending: _editAttIsPending,
    manualOpen,      setManualOpen,
    manualStaffId,   setManualStaffId,
    manualDate,      setManualDate,
    manualType,      setManualType,
    manualEntryTime, setManualEntryTime,
    manualExitTime,  setManualExitTime,
    manualProject,   setManualProject,
    manualNotes,     setManualNotes,
    manualLoading,
    manualMsg,       setManualMsg,
    manualErr,       setManualErr,
    pendingActionId,
    recentLogs,
    recentLogsLoading,
    recentLogsErr,
    recentLogsVisible, setRecentLogsVisible,
    loadRecentLogs,
    approveAttRecord,
    rejectAttRecord,
    startEditAtt,
    handleEditAtt,
    handleEditAndApproveAtt,
    handleManualEntry,
  } = adminAtt;
  void _editAttIsPending;

  // Worker correction requests (the "report a mistake" workflow)
  const [correctionRequests, setCorrectionRequests] = useState<import("../admin/_components/shared/CorrectionRequestsPanel").CorrectionRequest[]>([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionsErr,     setCorrectionsErr]     = useState<string | null>(null);

  // Attendance sub-tab (history slice lives in useAttendanceReport above)
  const [attendanceSubTab, setAttendanceSubTab] = useState<AttendanceSubTab>("live");

  // (recent log + edit/manual/approve handlers now live in useAdminAttendance above)

  // Refresh bar
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);

  // Refs used by auto-refresh interval (avoids stale closures)
  const autoTabRef          = useRef<AdminTab>("dashboard");
  const lastRefreshedRef    = useRef<Date | null>(null);
  useEffect(() => { autoTabRef.current = tab; });
  useEffect(() => { lastRefreshedRef.current = lastRefreshed; });

  // Income UI
  // Income add form — state + handler in useIncomeForm
  const incomeForm = useIncomeForm(loadIncome);
  const {
    incProjectId, setIncProjectId,
    incAmount,    setIncAmount,
    incDesc,      setIncDesc,
    incDate,      setIncDate,
    incLoading,
    incMsg,
    handleAddIncome,
  } = incomeForm;

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

  // ── Idle tracker (admin only) ──────────────────────────────────────────────
  // Stamp lastActivityRef on any real input event. The polling effect
  // reads this ref before each tick — once the gap passes 90 minutes
  // we kick the admin to login with the friendly banner. mousemove is
  // throttled implicitly by the ref-only update (no re-render).
  useEffect(() => {
    if (authState !== "admin") return;
    const stamp = () => { lastActivityRef.current = Date.now(); };
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    for (const e of events) window.addEventListener(e, stamp, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, stamp);
    };
  }, [authState]);

  // ── 401 + idle-timeout handler (shared) ────────────────────────────────────
  // Called by the polling loops below whenever something looks expired.
  // Triggers a clean local logout + the friendly banner in LoginScreen.
  const expireSession = useCallback(async () => {
    setSessionExpiredMsg("ההתחברות פגה עקב חוסר פעילות. אנא התחבר מחדש.");
    setAuthState("unauthenticated");
    try { await fetch("/api/admin-auth", { method: "DELETE" }); } catch { /* best effort */ }
    setStaff([]); setTodayLogs([]); setProjects([]); setTasks([]);
    setMaterials([]); setBudget([]); setIncome([]);
  }, []);

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
    if (authState === "admin") { loadPending(); loadCorrectionRequests(); }
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
        await Promise.all([loadData("admin"), loadPending(), loadCorrectionRequests()]);
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
    // Idle short-circuit (admin only): if the admin tab is open but the
    // user hasn't moved/typed/clicked for 90 min, don't keep refreshing
    // the cookie via the polling round-trip — log out and surface the
    // friendly banner instead.
    if (role === "admin" && Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
      await expireSession();
      return;
    }
    setDataLoading(true); setAttLoadErr(null);
    try {
      const results = await Promise.allSettled([
        fetch("/api/admin/attendance/today"),
        fetch("/api/admin/projects"),
        fetch("/api/admin/tasks"),
        fetch("/api/admin/milestones"),
      ]);
      const [logsR, projR, tasksR, msR] = results;

      // Any 401 from the polled endpoints means the cookie expired
      // server-side — kick to login with the friendly banner. We bail
      // before touching the response bodies so partial state doesn't
      // appear post-expiry.
      if (role === "admin") {
        const got401 = results.some(r => r.status === "fulfilled" && r.value.status === 401);
        if (got401) {
          await expireSession();
          return;
        }
      }

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
        if (staffRes.status === 401) { await expireSession(); return; }
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

  async function loadCorrectionRequests() {
    setCorrectionsLoading(true); setCorrectionsErr(null);
    try {
      const res = await fetch("/api/admin/attendance/corrections");
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json(); setCorrectionRequests(d.requests ?? []);
    } catch (e) { setCorrectionsErr(String(e)); }
    finally { setCorrectionsLoading(false); }
  }

  // Resolve one request, then prune it from the local list optimistically.
  // Approval may have rewritten an attendance row — refresh the live logs
  // too so today/recent reflect the new time.
  async function resolveCorrection(id: string, status: "approved" | "rejected"): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/attendance/corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? `שגיאה ${res.status}`);
        return false;
      }
      setCorrectionRequests((cur) => cur.filter((r) => r.id !== id));
      if (status === "approved") {
        await Promise.all([loadData("admin"), loadPending(), loadCorrectionRequests()]);
      }
      return true;
    } catch {
      alert("שגיאת רשת — נסה שוב");
      return false;
    }
  }

  function reload() { if (authState === "admin" || authState === "foreman") loadData(authState); }

  async function handleTabRefresh() {
    if (refreshing || dataLoading) return;
    setRefreshing(true);
    try {
      if (tab === "expenses")                               { await loadMaterials(); setLastRefreshed(new Date()); }
      else if (tab === "income")                            { await loadIncome();    setLastRefreshed(new Date()); }
      else if (tab === "attendance" && authState === "admin")
        await Promise.all([loadData("admin"), loadPending(), loadCorrectionRequests()]);
      else
        await loadData(authState as "admin" | "foreman");
      // loadData's finally sets lastRefreshed for the branches above that call it
    } finally { setRefreshing(false); }
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
      // Keep the typed password in place on failure — clearing it makes
      // Chrome's password manager re-prompt autofill (the form mounts
      // fresh-looking), which the user reported as a double-prompt UX bug.
      else { feedback.error(); setLoginErr("אימייל או סיסמה שגויים"); }
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

  // ── Income CRUD ────────────────────────────────────────────────────────────
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
      <LoginScreen
        showFlash={showFlash} onFlashDone={() => setShowFlash(false)}
        loginMode={loginMode} setLoginMode={setLoginMode}
        pin={pin} setPin={setPin}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        loginErr={loginErr} setLoginErr={setLoginErr}
        loginLoading={loginLoading}
        onPinKey={handlePinKey}
        onPinBackspace={handlePinBackspace}
        onPinLogin={handlePinLogin}
        onPasswordLogin={handlePasswordLogin}
        sessionExpiredMsg={sessionExpiredMsg}
        onClearSessionExpiredMsg={() => setSessionExpiredMsg(null)}
      />
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
    { key: "quotes",     label: "הצעות מחיר",  icon: <FileText  size={13} />,      adminOnly: true },
    { key: "documents",  label: "אסמכתאות",   icon: <Inbox     size={13} />,      adminOnly: true },
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
  // Workers who should be on site today and haven't clocked yet. Excludes
  // attendance_exempt staff (e.g. managers on global salary who aren't
  // expected to clock) so they don't pollute the count or the absent list.
  let notClockedInCount = 0;
  let notClockedInIds: Set<string> = new Set();
  if (isAdmin && israelHour >= 9 && israelHour < 14) {
    const clockedIds = new Set(
      todayLogs.filter(r => r.staff?.id).map(r => r.staff!.id)
    );
    const absent = staff.filter(
      s => s.active
        && (s.role === "עובד" || s.role === "ממונה")
        && !s.attendance_exempt
        && !clockedIds.has(s.id)
    );
    notClockedInCount = absent.length;
    notClockedInIds   = new Set(absent.map(s => s.id));
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
      // Force the live sub-tab so the admin lands on TodayLog (and the new
      // missing-today panel beneath it), regardless of where the last
      // attendance-tab visit left them.
      onClick: () => { setAttendanceSubTab("live"); goToTab("attendance"); },
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
    <div dir="rtl" className="min-h-screen bg-bone-dark px-4 py-8 font-body text-charcoal">
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
                className="flex items-center gap-1.5 border border-charcoal/15 px-3 py-1.5 text-xs text-charcoal/55 hover:border-accent hover:text-accent transition-colors duration-200">
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
                // Unified neutral colour for stat numbers. "באתר כרגע"
                // keeps the accent because it's the one number that
                // changes minute-to-minute and reflects "right now"; the
                // others are cumulative facts that don't need a hue.
                { label: "עובדים פעילים", value: staff.filter(s => s.active).length, color: "text-charcoal" },
                { label: "באתר כרגע",     value: onSite.length,                       color: "text-accent" },
                { label: "כניסות היום",   value: todayLogs.filter(r => r.action === "כניסה" || r.action === "in").length, color: "text-charcoal" },
                { label: "פרויקטים",      value: activeProjects.length,               color: "text-charcoal" },
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
                { label: "משימות פעילות", value: tasks.filter(t => t.status === "in_progress").length, color: "text-charcoal" },
                { label: "פרויקטים",     value: activeProjects.length,                color: "text-charcoal" },
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
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap border-b-2 transition-colors duration-150 ${tab === t.key ? "border-accent text-accent" : "border-transparent text-charcoal/55 hover:text-charcoal/70"}`}
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
          <DashboardTab
            isAdmin={isAdmin} isForeman={isForeman}
            onSite={onSite} laborEstimate={laborEstimate}
            todayExpensesTotal={todayExpensesTotal}
            todayTasks={todayTasks} roleMap={roleMap}
            activeProjects={activeProjects}
            staff={staff} todayLogs={todayLogs}
            projects={projects} tasks={tasks}
            budget={budget} incomeTotals={incomeTotals}
            refreshing={refreshing} dataLoading={dataLoading}
            lastRefreshed={lastRefreshed} onTabRefresh={handleTabRefresh}
            attentionItems={attentionItems}
            onSetTaskStatus={setTaskStatus}
          />
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
            correctionRequests={correctionRequests}
            correctionsLoading={correctionsLoading}
            correctionsErr={correctionsErr}
            onLoadCorrections={loadCorrectionRequests}
            onResolveCorrection={resolveCorrection}
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
            absentTodayIds={notClockedInIds}
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
            newAttendanceExempt={newAttendanceExempt} setNewAttendanceExempt={setNewAttendanceExempt}
            newStartDate={newStartDate}             setNewStartDate={setNewStartDate}
            newEmploymentEndDate={newEmploymentEndDate} setNewEmploymentEndDate={setNewEmploymentEndDate}
            newNotes={newNotes}                     setNewNotes={setNewNotes}
            newBankName={newBankName}                 setNewBankName={setNewBankName}
            newBankBranch={newBankBranch}             setNewBankBranch={setNewBankBranch}
            newBankAccount={newBankAccount}           setNewBankAccount={setNewBankAccount}
            newBankAccountOwner={newBankAccountOwner} setNewBankAccountOwner={setNewBankAccountOwner}
            newBankIban={newBankIban}                 setNewBankIban={setNewBankIban}
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
            editAttendanceExempt={editAttendanceExempt} setEditAttendanceExempt={setEditAttendanceExempt}
            editStartDate={editStartDate}           setEditStartDate={setEditStartDate}
            editEmploymentEndDate={editEmploymentEndDate} setEditEmploymentEndDate={setEditEmploymentEndDate}
            editNotes={editNotes}                   setEditNotes={setEditNotes}
            editBankName={editBankName}                 setEditBankName={setEditBankName}
            editBankBranch={editBankBranch}             setEditBankBranch={setEditBankBranch}
            editBankAccount={editBankAccount}           setEditBankAccount={setEditBankAccount}
            editBankAccountOwner={editBankAccountOwner} setEditBankAccountOwner={setEditBankAccountOwner}
            editBankIban={editBankIban}                 setEditBankIban={setEditBankIban}
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
          <PayrollTab
            staff={staff}
            payrollMonth={payrollMonth}     setPayrollMonth={setPayrollMonth}
            payrollStaffId={payrollStaffId} setPayrollStaffId={setPayrollStaffId}
            payrollRows={payrollRows}
            payrollLoading={payrollLoading}
            payrollExporting={payrollExporting}
            onLoadPayroll={loadPayroll}
            onExportPayroll={exportPayroll}
          />
        )}

        {/* ── QUOTES (admin only) ────────────────────────────────────────────── */}
        {tab === "quotes" && isAdmin && <QuotesTab />}

        {/* ── DOCUMENTS (admin only) ─────────────────────────────────────────── */}
        {tab === "documents" && isAdmin && <DocumentsTab />}

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
                  <p className="text-[0.75rem] text-charcoal/55 uppercase tracking-widest">ימי חופשה</p>
                  <h3 className="font-heading text-base font-bold">{worker?.name ?? "—"}</h3>
                </div>
                <button onClick={() => setVacationFor(null)} className="text-charcoal/55 hover:text-charcoal transition-colors p-1">
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
                    <p className="text-xs text-charcoal/55 text-center py-4">אין ימי חופשה רשומים</p>
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
                          <button onClick={() => handleDeleteVacation(v.id)} className="text-charcoal/55 hover:text-red-500 transition-colors text-xs border border-charcoal/15 px-2 py-1">מחק</button>
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


