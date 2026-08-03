"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useFeedback } from "../hooks/useFeedback";
import SuccessFlash from "./SuccessFlash";
import ForemanPortal from "./ForemanPortal";
import ViewAsBanner from "./ViewAsBanner";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { parseMoney, parsePositive } from "../../lib/money";
import Image from "next/image";
import Link from "next/link";
import {
  LogIn, Building2, Package, BarChart2, LayoutDashboard,
  ClipboardList, UserPlus, Loader2, Activity,
  AlertCircle, DollarSign, Target,
  ChevronLeft, Grid3x3, Download, Plus,
  UserCog, MapPin, UserX, FileText, Inbox, Users, Coins,
  AlertTriangle, XCircle, Images, Menu, PanelRight,
} from "lucide-react";
import { Card } from "../admin/_components/shared/Card";
import AttentionPanel, { type AttentionItem } from "../admin/_components/shared/AttentionPanel";
import { Field } from "../admin/_components/shared/Field";
import { Btn } from "../admin/_components/shared/Btn";
import { TabRefreshBar } from "../admin/_components/shared/TabRefreshBar";
import { INPUT } from "../admin/_components/shared/constants";
import IncomeTab from "../admin/_components/tabs/IncomeTab";
import AccountTab from "../admin/_components/tabs/AccountTab";
import AdminSidebar, { type SidebarGroup } from "../admin/_components/shared/AdminSidebar";
import { ReportsTabPanel, MatrixTabPanel } from "../admin/_components/tabs/ReportsAndMatrixTabs";
import WorkersTab from "../admin/_components/tabs/WorkersTab";
import ProjectsTab from "../admin/_components/tabs/ProjectsTab";
import BoardScreen from "../admin/_components/tabs/BoardScreen";
import ExpensesTab from "../admin/_components/tabs/ExpensesTab";
import PlanningTab from "../admin/_components/tabs/PlanningTab";
import AttendanceTab, { type ManualType, type AttendanceSubTab, type AbsentWorker } from "../admin/_components/tabs/AttendanceTab";
import LoginScreen from "../admin/_components/tabs/LoginScreen";
import DashboardTab from "../admin/_components/tabs/DashboardTab";
import PayrollTab from "../admin/_components/tabs/PayrollTab";
import QuotesTab from "../admin/_components/tabs/QuotesTab";
import GalleryTab from "../admin/_components/tabs/GalleryTab";
import DocumentsTab from "../admin/_components/tabs/DocumentsTab";
import JoinRequestsTab, { type JoinRequest } from "../admin/_components/tabs/JoinRequestsTab";
import CollectionsTab, { type CollectionsData } from "../admin/_components/tabs/CollectionsTab";
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
import { computeTodayLaborCost } from "../../lib/today-labor-cost";
import type { PnlResult } from "../../lib/finance-pnl";
import type { IncompleteItem, IncompleteSummary } from "../../lib/attendance-incompleteness";

interface IncompleteEngineResult { items: IncompleteItem[]; summary: IncompleteSummary; }

// ── Types ──────────────────────────────────────────────────────────────────────
type AuthState = "loading" | "unauthenticated" | "foreman" | "admin";
type AdminTab  = "dashboard" | "attendance" | "workers" | "join_requests" | "projects" | "board" | "expenses" | "planning" | "matrix" | "income" | "collections" | "reports" | "payroll" | "quotes" | "gallery" | "documents" | "account";
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
  collections: "collections",
  reports:    "reports",
  payroll:    "payroll",
  salary:     "payroll",
  quotes:     "quotes",
  gallery:    "gallery",
  documents:  "documents",
  account:    "account",
};

// Sidebar grouping of the admin tabs (order + Hebrew group labels). dashboard
// sits alone on top; account is pinned to the bottom; the rest are grouped by
// domain. Every one of the 17 tabs appears exactly once. The actual label/icon/
// badge for each key is pulled from the (permission-filtered) TABS at render, so
// a hidden tab never shows and never reserves space in its group.
const SIDEBAR_GROUP_DEFS: { label: string | null; keys: AdminTab[]; footer?: boolean }[] = [
  { label: null,              keys: ["dashboard"] },
  { label: "נוכחות ואנשים",    keys: ["attendance", "workers", "payroll", "reports", "join_requests"] },
  { label: "לקוחות ופרויקטים", keys: ["quotes", "projects", "collections"] },
  { label: "שטח ותכנון",       keys: ["board", "planning", "matrix"] },
  { label: "כספים",            keys: ["documents", "income", "expenses"] },
  { label: "אתר",              keys: ["gallery"] },
  { label: null,              keys: ["account"], footer: true },
];

// Entity types are exported from ../admin/_components/types — imported above.

const MILESTONE_STATUS_HE: Record<string, string>  = { pending: "ממתין", in_progress: "בביצוע", completed: "הושלם" };
const MILESTONE_STATUS_CLS: Record<string, string> = {
  pending:     "bg-charcoal/5 text-charcoal/65",
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
  // Navigation mode — the new sidebar is built ALONGSIDE the classic tab row and
  // toggled here (stage 2, behind a flag). Default "tabs" (zero surprise); read
  // the saved choice after mount to avoid a hydration mismatch. Hanan flips it
  // himself from the header, no deploy needed.
  const [navMode,          setNavMode]          = useState<"tabs" | "sidebar">("tabs");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen,    setMobileNavOpen]    = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("admin_nav") === "sidebar") setNavMode("sidebar");
      if (localStorage.getItem("admin_sidebar_collapsed") === "1") setSidebarCollapsed(true);
    } catch { /* localStorage unavailable — keep defaults */ }
  }, []);
  function toggleNavMode() {
    setNavMode((m) => {
      const next = m === "sidebar" ? "tabs" : "sidebar";
      try { localStorage.setItem("admin_nav", next); } catch { /* ignore */ }
      return next;
    });
  }
  function toggleSidebarCollapsed() {
    setSidebarCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }
  const [foremanName,    setForemanName]    = useState<string | null>(null);
  const [foremanStaffId, setForemanStaffId] = useState<string | null>(null);
  // Set when this "foreman" session is actually an admin viewing-as-foreman.
  const [viewAs,         setViewAs]         = useState<{ adminName: string | null; viewedName: string | null } | null>(null);

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
    newOfficeOnly,       setNewOfficeOnly,
    newLabel,            setNewLabel,
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
    editOfficeOnly,      setEditOfficeOnly,
    editLabel,           setEditLabel,
    editAttendanceExempt,setEditAttendanceExempt,
    editStartDate,       setEditStartDate,
    editEmploymentEndDate, setEditEmploymentEndDate,
    editNotes,           setEditNotes,
    editBankName,         setEditBankName,
    editBankBranch,       setEditBankBranch,
    editBankAccount,      setEditBankAccount,
    editBankAccountOwner, setEditBankAccountOwner,
    editBankIban,         setEditBankIban,
    editLanguage,         setEditLanguage,
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
    payrollIncomplete,
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

  // Location enforcement (system settings). Independent of the visual
  // far threshold above — see attendance-settings.ts for the 2-tier model.
  // Defaults mirror the code-level fallbacks so an unset settings row
  // still surfaces coherent values in the UI while the admin dials them in.
  const [gpsEnforce,            setGpsEnforce]            = useState<boolean>(false);
  const [gpsEnforceRadius,      setGpsEnforceRadius]      = useState<number>(100);
  const [gpsEnforceRadiusInput, setGpsEnforceRadiusInput] = useState<string>("100");
  const [remoteExitCap,         setRemoteExitCap]         = useState<number>(3);
  const [remoteExitCapInput,    setRemoteExitCapInput]    = useState<string>("3");
  const [gpsEnforceSaving,      setGpsEnforceSaving]      = useState(false);
  const [gpsEnforceMsg,         setGpsEnforceMsg]         = useState("");

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
  // Orphan clock-ins from prior days (B1 signal path). Populated from
  // /api/admin/attendance/stale-opens; drives an AttentionPanel row. Same
  // scoping shape as pendingRecords, so refetches ride along in the same
  // useEffects and auto-refresh loops.
  const [staleOpens, setStaleOpens] = useState<Array<{
    staff_id: string; staff_name: string;
    project_id: string | null; project_name: string | null;
    clock_at: string; day_ymd: string;
  }>>([]);
  // Silent-failure log for the "worker got stuck" panel. Same scoping
  // pattern as staleOpens — populated from /api/admin/attendance/failures,
  // count drives an AttentionPanel row, rows render inside AttendanceTab's
  // new "failures" subtab. Only carries category='worker_stuck' rows from
  // the last 24h; noise/security_signal stay in the DB for pattern
  // analysis but don't surface here.
  const [failures, setFailures] = useState<Array<{
    id: string; error_code: string; http_status: number;
    action: string | null; distance_m: number | null; attempted_at: string;
    staff: { id: string; name: string } | null;
    project: { id: string; name: string } | null;
  }>>([]);
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [failuresErr,     setFailuresErr]     = useState<string | null>(null);
  // Incompleteness engine (round 3): the full "what's missing" picture over
  // the last 3 months. Drives the dashboard "N ימים לא שלמים" attention row
  // and the dedicated "מרכז החוסרים" sub-tab. Same non-fatal loading pattern
  // as staleOpens/failures.
  const [incomplete, setIncomplete] = useState<IncompleteEngineResult | null>(null);
  const [incompleteLoading, setIncompleteLoading] = useState(false);
  const [incompleteErr,     setIncompleteErr]     = useState<string | null>(null);
  // Last project each worker clocked at — feeds the "מי לא הגיע היום" panel so
  // the admin sees where an absent worker was last expected. Keyed by staff_id.
  // Non-fatal like the loaders above; a load failure just means no 📍 chips.
  const [lastProjects, setLastProjects] = useState<Record<string, string | null>>({});
  const [pendingLoading,   setPendingLoading]   = useState(false);
  const [pendingErr,       setPendingErr]       = useState<string | null>(null);

  // Join requests — public submissions from /he/join awaiting review.
  // List lives here so the badge count on the "בקשות" tab stays visible
  // from every other tab. Mutation (approve / reject) happens inside
  // JoinRequestsTab + ApproveWorkerDialog; this just owns the list +
  // a refresher.
  const [joinRequests,     setJoinRequests]     = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsErr,  setJoinRequestsErr]  = useState<string | null>(null);

  // CollectionsTab — what's currently due to be collected, across all
  // projects. Loaded by loadCollections() on admin init + on tab open.
  const [collections,        setCollections]        = useState<CollectionsData | null>(null);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsErr,     setCollectionsErr]     = useState<string | null>(null);

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
    // Group every attendance row of today by staff_id so the cost
    // calculation sees ALL of a worker's in/out events (not just the
    // latest one). Iteration order is todayLogs's (created_at desc),
    // but the helper sorts events chronologically on its own.
    const byStaff = new Map<string, AttendanceRecord[]>();
    for (const log of todayLogs) {
      const sid = log.staff?.id;
      if (!sid) continue;
      const arr = byStaff.get(sid) ?? [];
      arr.push(log);
      byStaff.set(sid, arr);
    }

    // onSite: workers whose MOST RECENT row is a clock-in — drives the
    // "מי באתר כרגע" card. Same definition as before; the cost surface
    // no longer borrows it.
    const onSiteList: Array<{ record: AttendanceRecord; worker?: StaffMember }> = [];
    // attendedToday: one entry per worker who showed up at all,
    // carrying every event of theirs so the cost helper can pair
    // clock-in/clock-out events itself.
    const attendedToday: Array<{ worker?: StaffMember; events: AttendanceRecord[] }> = [];

    // "On site" = the worker's LATEST event by WORK time (clock_at) is a
    // clock-in — the same last-event semantics hasOpenRecord uses. Picking
    // rows[0] (newest by created_at / insertion order) was the latent bug: a
    // retroactive or manual entry inserted later carries an EARLIER clock_at,
    // so the most-recently-inserted row is not the most-recent event. clock_at
    // falls back to created_at then recorded_at when absent. Both action
    // vocabularies (in / כניסה) count as a clock-in.
    const workTs = (r: AttendanceRecord) =>
      new Date(r.clock_at ?? r.created_at ?? r.recorded_at).getTime();
    for (const [sid, rows] of byStaff) {
      const worker = staff.find(s => s.id === sid);
      attendedToday.push({ worker, events: rows });
      let latest = rows[0];
      for (const r of rows) if (workTs(r) > workTs(latest)) latest = r;
      if (latest && (latest.action === "כניסה" || latest.action === "in")) {
        onSiteList.push({ record: latest, worker });
      }
    }

    // Approach C — actual hours from in/out pairs with a 10h safety cap,
    // daily/global handled per employment_type. NaN-safe.
    return {
      onSite: onSiteList,
      laborEstimate: computeTodayLaborCost(attendedToday, Date.now()),
    };
  }, [todayLogs, staff]);

  const todayExpensesTotal = useMemo(
    () => materials.filter(m => (m.received_at ?? "").startsWith(todayStr)).reduce((s, m) => s + (m.cost ?? 0), 0),
    [materials, todayStr]
  );

  // Forward-looking monthly salary forecast — admin only, one-shot fetch on
  // mount. The route does the rate lookup + math; we surface total/count
  // to the dashboard card, and per_worker[] to the breakdown dialog.
  // A failure leaves total/count at null so the card shows "—" instead of
  // a misleading 0; per_worker stays [] in that case so the dialog opens
  // empty rather than crashing.
  const [salaryForecast, setSalaryForecast] = useState<{
    total: number | null;
    count: number | null;
    loading: boolean;
    lines: {
      id: string; name: string; employment_type: string;
      rate: number; monthly_forecast: number; missing_rate: boolean;
    }[];
    month: string;
  }>({
    total: null, count: null, loading: false, lines: [],
    month: new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }).slice(0, 7),
  });
  // Guarded on authState (not the derived `isAdmin` const, which is declared
  // later in this component). Refetches only when the worker transitions
  // into admin mode — on a login or a view-as flip.
  useEffect(() => {
    if (authState !== "admin") return;
    let cancelled = false;
    setSalaryForecast(prev => ({ ...prev, loading: true }));
    fetch("/api/admin/payroll/forecast")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d) return;
        setSalaryForecast(prev => ({
          ...prev,
          total: d.total ?? 0,
          count: d.count ?? 0,
          lines: Array.isArray(d.per_worker) ? d.per_worker : [],
          month: d.month ?? prev.month,
          loading: false,
        }));
      })
      .catch(() => {
        if (!cancelled) setSalaryForecast(prev => ({
          ...prev, total: null, count: null, lines: [], loading: false,
        }));
      });
    return () => { cancelled = true; };
  }, [authState]);

  // Monthly P&L for the dashboard card. Mirrors the salaryForecast shape:
  // null while loading, a populated PnlResult on success, null again on
  // failure (the card stays out of the way rather than flashing zeros).
  // Refetches on the same admin-transition trigger; the dashboard's
  // 2-minute polling cycle picks up subsequent changes via the broader
  // refresh flow.
  const [pnl, setPnl] = useState<{ data: PnlResult | null; loading: boolean }>({
    data: null, loading: false,
  });
  useEffect(() => {
    if (authState !== "admin") return;
    let cancelled = false;
    setPnl(prev => ({ ...prev, loading: true }));
    fetch("/api/admin/finance/pnl?months=6", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        setPnl({ data: d ?? null, loading: false });
      })
      .catch(() => {
        if (!cancelled) setPnl({ data: null, loading: false });
      });
    return () => { cancelled = true; };
  }, [authState]);

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
          // d.viewAs present → this is an admin viewing-as-foreman, not a real
          // foreman login. Drives the persistent yellow banner.
          setViewAs(d.viewAs ?? null);
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
          // Location enforcement — read every setting independently so
          // one missing key doesn't shadow the others. Same numeric-parse
          // discipline as the far-threshold above.
          const rawEnforce = d?.settings?.["attendance_gps_enforce"];
          if (typeof rawEnforce === "string") setGpsEnforce(rawEnforce === "on");
          const rawRadius = d?.settings?.["attendance_gps_enforce_radius_m"];
          const nRadius = parseInt(rawRadius, 10);
          if (!isNaN(nRadius) && nRadius > 0) {
            setGpsEnforceRadius(nRadius);
            setGpsEnforceRadiusInput(String(nRadius));
          }
          const rawCap = d?.settings?.["attendance_remote_exit_monthly_cap"];
          const nCap = parseInt(rawCap, 10);
          if (!isNaN(nCap) && nCap > 0) {
            setRemoteExitCap(nCap);
            setRemoteExitCapInput(String(nCap));
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
    if (authState === "admin") { loadPending(); loadCorrectionRequests(); loadJoinRequests(); loadCollections(); loadStaleOpens(); loadFailures(); loadIncomplete(); loadLastProjects(); }
  }, [authState, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh attendance every 60 s ────────────────────────────────────
  useEffect(() => {
    if (authState !== "admin" && authState !== "foreman") return;
    const iv = setInterval(async () => {
      if (document.hidden) return; // skip while backgrounded; the next tick after refocus refetches (≤60s)
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
        await Promise.all([loadData("admin"), loadPending(), loadCorrectionRequests(), loadStaleOpens(), loadFailures(), loadIncomplete(), loadLastProjects()]);
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

  // Orphan-open sweep for the AttentionPanel. Silent failure — the panel
  // just doesn't show the row rather than surfacing a red error, matching
  // how the other "hygiene" signals here behave.
  async function loadStaleOpens() {
    try {
      const res = await fetch("/api/admin/attendance/stale-opens");
      if (!res.ok) return;
      const d = await res.json();
      setStaleOpens(d.items ?? []);
    } catch {
      // Non-critical
    }
  }

  // "Worker got stuck" log — surfaces silent failures the count-based
  // dashboards can't see (a worker who was blocked by GPS / B3 / an
  // account_inactive flag never leaves a trail in `attendance`, so
  // absence-from-the-log is the only evidence). Errors surface inline
  // in the panel; this loader keeps them non-fatal like loadStaleOpens.
  async function loadFailures() {
    setFailuresLoading(true); setFailuresErr(null);
    try {
      const res = await fetch("/api/admin/attendance/failures");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFailuresErr(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      const d = await res.json();
      setFailures(d.failures ?? []);
    } catch (e) {
      setFailuresErr(String(e));
    } finally {
      setFailuresLoading(false);
    }
  }

  // Incompleteness engine — default 3-month window. Non-fatal like the others.
  async function loadIncomplete() {
    setIncompleteLoading(true); setIncompleteErr(null);
    try {
      const res = await fetch("/api/admin/attendance/incomplete");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setIncompleteErr(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      const d = await res.json();
      setIncomplete({ items: d.items ?? [], summary: d.summary ?? { day_count: 0, by_issue: {} } });
    } catch (e) {
      setIncompleteErr(String(e));
    } finally {
      setIncompleteLoading(false);
    }
  }

  // Last-project-per-worker for the absent-today panel. Secondary/absence-safe:
  // any failure just leaves the map empty (no 📍), never blocks the dashboard.
  async function loadLastProjects() {
    try {
      const res = await fetch("/api/admin/attendance/last-projects");
      if (!res.ok) return;
      const d = await res.json();
      setLastProjects(d.last ?? {});
    } catch {
      /* non-fatal — panel simply shows no last-project chips */
    }
  }

  // no_project fix: stamp a project onto the flagged entry via the existing
  // PATCH /api/admin/attendance/[id]. On success the engine is reloaded so the
  // row drops off the list. Also refreshes attendance so per-project cost /
  // salary-split reflect the new assignment.
  async function assignProjectToRecord(attendanceId: string, projectId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) return false;
      await Promise.all([loadIncomplete(), loadData("admin")]);
      return true;
    } catch {
      return false;
    }
  }

  async function loadJoinRequests() {
    setJoinRequestsLoading(true); setJoinRequestsErr(null);
    try {
      const res = await fetch("/api/admin/join-requests?status=pending");
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json(); setJoinRequests(d.requests ?? []);
    } catch (e) { setJoinRequestsErr(String(e)); }
    finally { setJoinRequestsLoading(false); }
  }

  async function loadCollections() {
    setCollectionsLoading(true); setCollectionsErr(null);
    try {
      const res = await fetch("/api/admin/collections", { cache: "no-store" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json() as CollectionsData;
      setCollections(d);
    } catch (e) { setCollectionsErr(String(e)); }
    finally { setCollectionsLoading(false); }
  }

  /** Single-milestone payment from inside CollectionsTab. Hits the same
   *  endpoint the per-project ProjectMilestonesSection uses, then asks
   *  the collections list to reload so the just-paid row drops out
   *  (or moves to partial). */
  async function handleCollectionsPayment(id: string, paid_amount: number) {
    const res = await fetch(`/api/admin/payment-milestones/${id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid_amount }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(`שגיאה: ${b.error ?? res.status}`);
      return;
    }
    await loadCollections();
  }

  // Focused staff refresh — used after a join request is approved (which
  // creates a new staff row via POST /api/admin/staff). loadData() also
  // refreshes staff but reloads every other admin slice too; this one
  // touches only what changed.
  async function loadStaff() {
    const res = await fetch("/api/admin/staff");
    if (res.status === 401) { await expireSession(); return; }
    if (res.ok) { const d = await res.json(); setStaff(d.staff ?? []); }
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
        await Promise.all([loadData("admin"), loadPending(), loadCorrectionRequests(), loadStaleOpens(), loadFailures(), loadIncomplete(), loadLastProjects()]);
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
        await Promise.all([loadData("admin"), loadPending(), loadCorrectionRequests(), loadStaleOpens(), loadFailures(), loadIncomplete(), loadLastProjects()]);
      else if (tab === "join_requests" && authState === "admin")
        await loadJoinRequests();
      else if (tab === "collections" && authState === "admin")
        await loadCollections();
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

  // ── View-as-foreman (admin only, read-only) ────────────────────────────────
  // Starts a read-only view of the given foreman's portal, then reloads /admin
  // so whoami re-resolves identity to that foreman (with the yellow banner).
  async function handleViewAs(staffId: string) {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert("מעבר למצב צפייה נכשל: " + (d.error ?? res.status));
        return;
      }
      window.location.assign("/admin");
    } catch {
      alert("שגיאת רשת — נסה שוב");
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
  // Called from WorkersTab — jump to the history sub-tab pre-selected with
  // this worker, regardless of which tab the admin is currently on.
  function viewWorkerHistory(staffId: string) {
    setHistoryStaffId(staffId);
    setAttendanceSubTab("history");
    goToTab("attendance");
  }

  // Same as viewWorkerHistory, but zooms the range to a single day so the
  // WorkerHistoryPanel opens focused on the problematic day and the
  // existing "השלם יציאה" quick-action ([WorkerHistoryPanel.tsx:392], from
  // commit a21e41c) is one click away. Wired to the AttentionPanel's
  // stale-opens item and to per-row clicks inside the amber panel that
  // AttendanceTab now renders on the "live" sub-tab.
  function viewWorkerHistoryForDay(staffId: string, ymd: string) {
    setHistoryStaffId(staffId);
    setHistoryFrom(ymd);
    setHistoryTo(ymd);
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

  // Save the three location-enforcement settings in a single request
  // (radius, cap, enforce switch). Bundled so a flip-and-tune ends up
  // atomic from the admin's point of view — one confirmation, one
  // "נשמר" message.
  async function saveGpsEnforcement() {
    setGpsEnforceSaving(true); setGpsEnforceMsg("");
    try {
      const radius = parseInt(gpsEnforceRadiusInput, 10);
      const cap    = parseInt(remoteExitCapInput, 10);
      if (isNaN(radius) || radius <= 0) { setGpsEnforceMsg("רדיוס חייב להיות מספר חיובי במטרים"); return; }
      if (isNaN(cap)    || cap    <= 0) { setGpsEnforceMsg("תקרת יציאות מרחוק חייבת להיות מספר חיובי");   return; }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairs: [
            { key: "attendance_gps_enforce",              value: gpsEnforce ? "on" : "off" },
            { key: "attendance_gps_enforce_radius_m",     value: String(radius) },
            { key: "attendance_remote_exit_monthly_cap",  value: String(cap) },
          ],
        }),
      });
      if (res.ok) {
        setGpsEnforceRadius(radius);
        setRemoteExitCap(cap);
        setGpsEnforceMsg("✓ נשמר");
      } else {
        setGpsEnforceMsg("שגיאה בשמירה");
      }
    } catch (err) { setGpsEnforceMsg("שגיאת רשת: " + String(err)); }
    finally { setGpsEnforceSaving(false); }
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
      <>
        {viewAs && <ViewAsBanner viewedName={viewAs.viewedName} />}
        <ForemanPortal
          staffId={foremanStaffId ?? ""}
          foremanName={foremanName ?? "ממונה"}
          onLogout={handleLogout}
        />
      </>
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
    { key: "join_requests", label: "בקשות",  icon: <UserPlus size={13} />,       adminOnly: true },
    { key: "projects",   label: "פרויקטים",  icon: <Building2 size={13} />,      adminOnly: true },
    { key: "board",      label: "שיבוץ",     icon: <Users size={13} />,           adminOnly: true },
    { key: "expenses",   label: "הוצאות",    icon: <Package size={13} /> },
    { key: "planning",   label: "תכנון",         icon: <Target    size={13} /> },
    { key: "matrix",     label: "מטריצה שבועית", icon: <Grid3x3   size={13} />, adminOnly: true },
    { key: "income",     label: "הכנסות",        icon: <DollarSign size={13} />, adminOnly: true },
    { key: "collections", label: "גבייה",        icon: <Coins     size={13} />,  adminOnly: true },
    { key: "reports",    label: "דוחות",      icon: <BarChart2 size={13} />,      adminOnly: true },
    { key: "payroll",    label: "שכר",         icon: <DollarSign size={13} />,    adminOnly: true },
    { key: "quotes",     label: "הצעות מחיר",  icon: <FileText  size={13} />,      adminOnly: true },
    { key: "gallery",    label: "גלריה",       icon: <Images    size={13} />,      adminOnly: true },
    { key: "documents",  label: "אסמכתאות",   icon: <Inbox     size={13} />,      adminOnly: true },
    { key: "account",    label: "חשבון",      icon: <UserCog   size={13} />,      adminOnly: true },
  ].filter(t => !t.adminOnly || isAdmin) as TabDef[];

  const activeProjects = projects.filter(p => p.status === "active");

  // ── Tab navigation helper ──────────────────────────────────────────────────
  // Used by both the tab bar and the AttentionPanel; keeps the URL hash in
  // sync so the active tab is shareable and the back button works.
  //
  // pushState (not replaceState) so the browser back button cycles through
  // visited tabs instead of leaving /admin straight away. hashchange
  // already fires for our listener on pushState that changes the hash
  // portion, so the hash → tab sync continues to work unchanged.
  function goToTab(key: AdminTab) {
    setTab(key);
    if (typeof window !== "undefined") {
      const base = window.location.pathname + window.location.search;
      const next = key === "dashboard" ? base : `${base}#${key}`;
      // Skip the history entry when we're already on that URL — clicking
      // the active tab repeatedly shouldn't pollute the back stack.
      const current = window.location.pathname + window.location.search + window.location.hash;
      if (current !== next) history.pushState(null, "", next);
    }
  }

  /** Anchor href for a tab key — dashboard is the bare path (no hash) so
   *  the canonical landing URL stays clean; every other tab carries its
   *  hash so Ctrl+Click / middle-click open that tab fresh in a new
   *  browser tab. */
  function tabHref(key: AdminTab): string {
    return key === "dashboard" ? "/admin" : `/admin#${key}`;
  }

  /** Click guard for tab anchors: lets the browser handle every
   *  modifier-click (Ctrl/Cmd/Shift/Alt + middle-button) so the user's
   *  open-in-new-tab muscle memory works exactly like on any other link.
   *  Plain left-clicks are intercepted and routed through the SPA. */
  function onTabClick(e: React.MouseEvent<HTMLAnchorElement>, key: AdminTab) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    goToTab(key);
  }

  // Same three badge counts the tab row shows, from already-loaded state.
  const tabBadge = (key: AdminTab): number =>
    key === "attendance"    ? pendingRecords.length :
    key === "join_requests" ? joinRequests.length :
    key === "collections"   ? (collections?.totals.count ?? 0) : 0;

  // Build the grouped sidebar from the SAME (permission-filtered) TABS + badges,
  // so it stays 1:1 with the tab row and respects adminOnly. Empty groups drop
  // out. Items are real anchors driven by the existing tabHref/onTabClick.
  const tabByKey = new Map(TABS.map((t) => [t.key, t]));
  const sidebarGroups: SidebarGroup[] = SIDEBAR_GROUP_DEFS
    .map((g) => ({
      label: g.label,
      footer: g.footer,
      items: g.keys
        .map((k) => tabByKey.get(k))
        .filter((t): t is TabDef => !!t)
        .map((t) => ({ key: t.key, label: t.label, icon: t.icon, badge: tabBadge(t.key), href: tabHref(t.key) })),
    }))
    .filter((g) => g.items.length > 0);

  // ── AttentionPanel inputs ──────────────────────────────────────────────────
  // All counts are derived from state already loaded by the dashboard; no
  // new endpoint required. The "not clocked in" item runs all day (no hour
  // gate) — an admin asking "מי לא הגיע היום" wants the answer at any hour,
  // and the item auto-clears once everyone expected has clocked in.
  const delayedCount = tasks.filter(t => t.status === "delayed").length;
  const noGpsCount   = projects.filter(p => p.status === "active" && (p.lat == null || p.lng == null)).length;
  // Workers who should be on site today and haven't clocked IN yet. "Present"
  // means an actual entry (isEntry — Hebrew "כניסה" / English "in"), matching
  // the foreman portal: a worker with only an orphan EXIT hasn't arrived, so
  // they still show as absent. Excludes attendance_exempt staff (e.g. managers
  // on global salary who aren't expected to clock) from count and list.
  let notClockedInCount = 0;
  let absentTodayList: AbsentWorker[] = [];
  if (isAdmin) {
    const clockedInIds = new Set(
      todayLogs
        .filter(r => r.staff?.id && (r.action === "כניסה" || r.action === "in"))
        .map(r => r.staff!.id)
    );
    const absent = staff.filter(
      s => s.active
        && (s.role === "עובד" || s.role === "ממונה")
        && !s.attendance_exempt
        && !clockedInIds.has(s.id)
    );
    notClockedInCount = absent.length;
    absentTodayList = absent.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      language: s.language ?? null,
      lastProject: lastProjects[s.id] ?? null,
    }));
  }
  // Hybrid incompleteness signal: the URGENT stuck-failures stay their own
  // high-severity row (a worker blocked right now); everything else folds into
  // one medium "N ימים לא שלמים" batch — distinct (staff × day) among the
  // non-stuck issues (no_exit/no_entry/no_project/pending_*). This subsumes the
  // old stale-opens row (stale ≡ no_exit) and the old pending row, so they're
  // removed below — no double-counting.
  const incompleteBatchCount = incomplete
    ? new Set(
        incomplete.items
          .filter((it) => it.issue !== "stuck_failure")
          .map((it) => `${it.staff_id}|${it.date}`),
      ).size
    : 0;

  const attentionItems: AttentionItem[] = [
    {
      // Silent-failure log first — a stuck worker is the most time-
      // sensitive signal on the dashboard (they can't clock out, their
      // hours are wrong, they might already have left the site angry).
      key: "attendance-failures",
      icon: <XCircle size={14} strokeWidth={1.5} />,
      label: "כשלי החתמה ב-24 השעות האחרונות",
      count: failures.length,
      severity: "high",
      onClick: () => { setAttendanceSubTab("failures"); goToTab("attendance"); },
    },
    {
      // Batch — the full "what's missing" cleanup list, → the dedicated screen.
      key: "incomplete-batch",
      icon: <AlertTriangle size={14} strokeWidth={1.5} />,
      label: "ימים לא שלמים (חוסרים + ממתינים לאישור)",
      count: incompleteBatchCount,
      severity: "medium",
      onClick: () => { setAttendanceSubTab("incomplete"); goToTab("attendance"); },
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
    {/* Sidebar (admin, flag on). Fixed rail on the RTL START (right); the outer
        ps- (padding-inline-start = right in RTL) below makes room on the SAME
        side as the rail, without changing the content's max-width — full layout
        integration is stage 3. When the flag is off, the ternary yields "" so
        there is zero residual padding. */}
    {isAdmin && navMode === "sidebar" && (
      <AdminSidebar
        groups={sidebarGroups}
        activeKey={tab}
        onItemClick={(e, key) => onTabClick(e, key as AdminTab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
    )}
    <div dir="rtl" className={`min-h-screen bg-bone-dark px-4 py-8 font-body text-charcoal ${
      isAdmin && navMode === "sidebar" ? (sidebarCollapsed ? "md:ps-[84px]" : "md:ps-[264px]") : ""
    }`}>
      {/* Container width: the assignment tab (live board + weekly
          schedule) needs a wider canvas — its tables and 3-column
          site grid can't breathe in 640px. Every other tab keeps
          the narrow column the rest of the admin portal is tuned
          for (forms, dashboards, single-column lists). */}
      {/* Content width — differs by mode:
          - tabs (flag off): max-w-6xl (1152) + mx-auto — centered under the top
            tab row. UNCHANGED — 1152 is right when the full viewport is content.
          - sidebar: max-w-[1440px], start-aligned (no mx-auto) so it hugs the
            rail. The ceiling is RAISED from 1152 to 1440 here: the 240px rail
            eats into the row, so the old 1152 cap left ~500px empty on a wide
            screen. 1440 lets every main block below (header, stats, content)
            share ONE right/left edge instead of ending at four different points.
          The `space-y-5` gives uniform 20px gaps between those blocks. */}
      <div className={`space-y-5 ${isAdmin && navMode === "sidebar" ? "max-w-[1440px]" : "max-w-6xl mx-auto"}`}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/he" className="text-micro font-bold tracking-[0.2em] uppercase text-accent/60 hover:text-accent transition-colors duration-200">
              בניין איתן
            </Link>
            <h1 className="font-heading text-2xl font-bold text-charcoal">
              {isAdmin ? "ממשק מנהל" : foremanName ? `ברוך הבא, ${foremanName}` : "ממשק מנהל עבודה"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile hamburger — only in sidebar mode, opens the drawer. */}
            {isAdmin && navMode === "sidebar" && (
              <button onClick={() => setMobileNavOpen(true)} aria-label="פתח תפריט ניווט"
                className="md:hidden flex items-center border border-charcoal/15 p-1.5 text-charcoal/70 hover:border-accent hover:text-accent transition-colors duration-200">
                <Menu size={16} strokeWidth={1.5} />
              </button>
            )}
            {/* Nav-mode toggle — flips between the classic tab row and the new
                sidebar. Persisted; Hanan can switch back instantly, no deploy. */}
            {isAdmin && (
              <button onClick={toggleNavMode}
                title={navMode === "sidebar" ? "חזרה לשורת הלשוניות" : "מעבר לתפריט צד (ניסיוני)"}
                className="flex items-center gap-1.5 border border-charcoal/15 px-3 py-1.5 text-micro text-charcoal/70 hover:border-accent hover:text-accent transition-colors duration-200">
                <PanelRight size={12} strokeWidth={1.5} />
                {navMode === "sidebar" ? "שורת לשוניות" : "תפריט צד"}
              </button>
            )}
            {isAdmin && (
              <Link href="/admin/health"
                className="flex items-center gap-1.5 border border-charcoal/15 px-3 py-1.5 text-micro text-charcoal/70 hover:border-accent hover:text-accent transition-colors duration-200">
                <Activity size={12} strokeWidth={1.5} />
                סטטוס מערכת
              </Link>
            )}
            <button onClick={handleLogout}
              className="border border-charcoal/20 px-3 py-1.5 text-micro text-charcoal/65 hover:border-accent hover:text-accent transition-colors duration-200">
              יציאה
            </button>
          </div>
        </div>

        {/* Stats strip.
            - sidebar (admin): NO max-width — the 4-col grid spans the full
              content width so its left/right edge lines up with the header and
              the content cards below. The old max-w-2xl (672px) was added in an
              earlier round when there was no rail; against the raised 1440
              container it ended mid-screen and read as a stray fourth edge.
            - tabs / foreman: keep max-w-2xl so the tiles stay compact and
              grouped at the start (flag-off layout unchanged). */}
        <div className={`grid gap-2 ${isAdmin && navMode === "sidebar" ? "" : "max-w-2xl"} ${isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
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

        {/* Tab bar
            - gap-y-2: with ~12 tabs at 15px text on a phone the row wraps;
              without an explicit row-gap the second row pressed right up
              against the first one and the bar read as a wall.
            - text-content (15px): bumps the labels off the cramped 12px
              tier they were on (everything else on screen sits at 15px,
              the tabs were the odd one out and hardest to read).
            - The border-b-2 inside each tab now sits over a thicker hairline
              under the bar (border-charcoal/15), so the active-tab accent
              line still wins visually. */}
        {navMode === "tabs" && (
        <div className="flex flex-wrap gap-y-2 border-b border-charcoal/15">
          {TABS.map(t => {
            // Tab badges — each surfaces its own "waiting for you" count.
            const badgeCount =
              t.key === "attendance"     ? pendingRecords.length :
              t.key === "join_requests"  ? joinRequests.length   :
              t.key === "collections"    ? (collections?.totals.count ?? 0) : 0;
            return (
              <a
                key={t.key}
                href={tabHref(t.key)}
                onClick={(e) => onTabClick(e, t.key)}
                // no-underline kills the default anchor styling so the
                // tab bar reads visually identical to the button version
                // it replaces.
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-content font-semibold tracking-wide whitespace-nowrap border-b-2 no-underline transition-colors duration-150 ${tab === t.key ? "border-accent text-accent" : "border-transparent text-charcoal/70 hover:text-charcoal/70"}`}
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
              </a>
            );
          })}
        </div>
        )}

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <DashboardTab
            isAdmin={isAdmin} isForeman={isForeman}
            onSite={onSite} laborEstimate={laborEstimate}
            todayExpensesTotal={todayExpensesTotal}
            monthlySalaryForecast={salaryForecast.total}
            monthlySalaryForecastCount={salaryForecast.count}
            monthlySalaryForecastLoading={salaryForecast.loading}
            monthlySalaryForecastLines={salaryForecast.lines}
            monthlySalaryForecastMonth={salaryForecast.month}
            pnl={pnl.data} pnlLoading={pnl.loading}
            todayTasks={todayTasks} roleMap={roleMap}
            activeProjects={activeProjects}
            staff={staff} todayLogs={todayLogs}
            projects={projects} tasks={tasks}
            budget={budget} incomeTotals={incomeTotals}
            collections={collections}
            onGoToCollections={() => goToTab("collections")}
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
            onViewHistory={viewWorkerHistory}
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
            failures={failures}
            failuresLoading={failuresLoading}
            failuresErr={failuresErr}
            onLoadFailures={loadFailures}
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
            absentTodayList={absentTodayList}
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
            staleOpens={staleOpens}
            onOpenStaleDay={viewWorkerHistoryForDay}
            incompleteItems={incomplete?.items ?? []}
            incompleteSummary={incomplete?.summary ?? null}
            incompleteLoading={incompleteLoading}
            incompleteErr={incompleteErr}
            onLoadIncomplete={loadIncomplete}
            onAssignProject={assignProjectToRecord}
            activeProjects={activeProjects}
            onGoToApprovals={() => { setAttendanceSubTab("live"); }}
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
            newOfficeOnly={newOfficeOnly}           setNewOfficeOnly={setNewOfficeOnly}
            newLabel={newLabel}                     setNewLabel={setNewLabel}
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
            onViewAs={handleViewAs}
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
            editOfficeOnly={editOfficeOnly}         setEditOfficeOnly={setEditOfficeOnly}
            editLabel={editLabel}                   setEditLabel={setEditLabel}
            editAttendanceExempt={editAttendanceExempt} setEditAttendanceExempt={setEditAttendanceExempt}
            editStartDate={editStartDate}           setEditStartDate={setEditStartDate}
            editEmploymentEndDate={editEmploymentEndDate} setEditEmploymentEndDate={setEditEmploymentEndDate}
            editNotes={editNotes}                   setEditNotes={setEditNotes}
            editBankName={editBankName}                 setEditBankName={setEditBankName}
            editBankBranch={editBankBranch}             setEditBankBranch={setEditBankBranch}
            editBankAccount={editBankAccount}           setEditBankAccount={setEditBankAccount}
            editBankAccountOwner={editBankAccountOwner} setEditBankAccountOwner={setEditBankAccountOwner}
            editBankIban={editBankIban}                 setEditBankIban={setEditBankIban}
            editLanguage={editLanguage}                 setEditLanguage={setEditLanguage}
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

        {/* ── JOIN REQUESTS (admin only) ─────────────────────────────────────
            Queue of public submissions from /he/join. Loading + state live
            in this portal so the tab badge stays accurate from any other
            tab. Approve creates a staff row via the regular POST /api/
            admin/staff and links the request — see ApproveWorkerDialog. */}
        {tab === "join_requests" && isAdmin && (
          <JoinRequestsTab
            requests={joinRequests}
            loading={joinRequestsLoading}
            error={joinRequestsErr}
            onReload={loadJoinRequests}
            onApproved={async () => {
              await Promise.all([loadJoinRequests(), loadStaff()]);
            }}
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

        {/* ── BOARD — worker assignment (admin only) ─────────────────────────
            Sub-tabbed: "lo'ach chai" = the existing drag-and-drop board,
            "tichnun shvu'i" = the weekly forward-schedule view (PR 2/4
            adds read-only; PRs 3-4 add edit). BoardScreen owns the
            switch; both children manage their own data. */}
        {tab === "board" && isAdmin && (
          <BoardScreen />
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

        {/* ── COLLECTIONS — what to chase right now (admin only) ───────────── */}
        {tab === "collections" && isAdmin && (
          <CollectionsTab
            data={collections}
            loading={collectionsLoading}
            error={collectionsErr}
            onReload={loadCollections}
            onPayment={handleCollectionsPayment}
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
            payrollIncomplete={payrollIncomplete}
            payrollLoading={payrollLoading}
            payrollExporting={payrollExporting}
            onLoadPayroll={loadPayroll}
            onExportPayroll={exportPayroll}
            onGoToApprovals={() => { setAttendanceSubTab("live"); goToTab("attendance"); }}
            onViewWorkerHistoryForDay={viewWorkerHistoryForDay}
          />
        )}

        {/* ── QUOTES (admin only) ────────────────────────────────────────────── */}
        {tab === "quotes" && isAdmin && <QuotesTab />}
        {tab === "gallery" && isAdmin && <GalleryTab />}

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
            gpsEnforce={gpsEnforce}
            setGpsEnforce={setGpsEnforce}
            gpsEnforceRadius={gpsEnforceRadius}
            gpsEnforceRadiusInput={gpsEnforceRadiusInput}
            setGpsEnforceRadiusInput={setGpsEnforceRadiusInput}
            remoteExitCap={remoteExitCap}
            remoteExitCapInput={remoteExitCapInput}
            setRemoteExitCapInput={setRemoteExitCapInput}
            gpsEnforceSaving={gpsEnforceSaving}
            gpsEnforceMsg={gpsEnforceMsg}
            onSaveGpsEnforcement={saveGpsEnforcement}
            pwCurrent={pwCurrent} setPwCurrent={setPwCurrent}
            pwNew={pwNew}         setPwNew={setPwNew}
            pwConfirm={pwConfirm} setPwConfirm={setPwConfirm}
            pwSaving={pwSaving}
            pwMsg={pwMsg}
            onChangePassword={handleChangePassword}
          />
        )}

        <p className="text-center font-body text-micro tracking-widest uppercase text-charcoal/20 pt-2">
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
                  <p className="text-micro text-charcoal/70 uppercase tracking-widest">ימי חופשה</p>
                  <h3 className="font-heading text-base font-bold">{worker?.name ?? "—"}</h3>
                </div>
                <button onClick={() => setVacationFor(null)} className="text-charcoal/70 hover:text-charcoal transition-colors p-1">
                  <ChevronLeft size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <form onSubmit={handleAddVacation} className="space-y-3">
                  <Field label="תאריך">
                    <input type="date" value={vacationDate} onChange={e => setVacationDate(e.target.value)} required className={INPUT} dir="ltr" />
                  </Field>
                  <label className="flex items-center gap-2 text-caption cursor-pointer">
                    <input type="checkbox" checked={vacationHalf} onChange={e => setVacationHalf(e.target.checked)} className="accent-accent" />
                    <span className="text-charcoal/70">חצי יום</span>
                  </label>
                  <button type="submit" disabled={vacationLoading || !vacationDate} className="w-full bg-accent py-2.5 text-micro font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                    {vacationLoading ? <><Loader2 size={13} className="animate-spin" /> מוסיף…</> : <><Plus size={13} /> הוסף יום חופש</>}
                  </button>
                  {vacationMsg && <p className="text-caption text-red-500">{vacationMsg}</p>}
                </form>

                <div className="border-t border-warm-gray-light pt-4">
                  <p className="text-caption text-charcoal/65 mb-2">היסטוריה ({vacationRows.length})</p>
                  {vacationRows.length === 0 ? (
                    <p className="text-caption text-charcoal/70 text-center py-4">אין ימי חופשה רשומים</p>
                  ) : (
                    <div className="divide-y divide-charcoal/5">
                      {vacationRows.map(v => (
                        <div key={v.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-content font-semibold tabular-nums" dir="ltr">
                              {new Date(v.date).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </p>
                            {v.half_day && <p className="text-content text-amber-600">חצי יום</p>}
                            {v.notes && <p className="text-content text-charcoal/65">{v.notes}</p>}
                          </div>
                          <button onClick={() => handleDeleteVacation(v.id)} className="text-charcoal/70 hover:text-red-500 transition-colors text-micro border border-charcoal/15 px-2 py-1">מחק</button>
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


