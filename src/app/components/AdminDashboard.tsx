"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Users, ClipboardList, Plus, RefreshCw, LogOut,
  ToggleLeft, ToggleRight, Trash2, ChevronDown, ChevronUp,
  Loader2, CheckCircle, AlertCircle, UserPlus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string | null;
  active: boolean;
}

interface AttendanceRecord {
  id: string;
  action: "in" | "out";
  timestamp_label?: string | null;
  recorded_at: string;
  staff: { id: string; name: string; phone: string } | null;
}

const ROLES = ["עובד", "ממונה", "מנהל"];

const ROLE_COLORS: Record<string, string> = {
  "מנהל":   "bg-accent/[0.1] text-accent border-accent/30",
  "ממונה":  "bg-sky-50 text-sky-700 border-sky-200",
  "עובד":   "bg-charcoal/[0.05] text-charcoal/60 border-charcoal/15",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string, label?: string | null): string {
  if (label) return label;
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function todayLabel(): string {
  return new Date().toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-warm-gray-light">
      <div className="p-1.5 bg-accent/[0.08]">
        <Icon size={16} strokeWidth={1.5} className="text-accent" />
      </div>
      <div>
        <h2 className="font-heading text-base font-bold text-charcoal leading-none">{title}</h2>
        {sub && <p className="font-body text-[0.62rem] text-charcoal/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const color = ROLE_COLORS[role ?? "עובד"] ?? ROLE_COLORS["עובד"];
  return (
    <span className={`inline-block rounded-sm border px-1.5 py-0.5 font-body text-[0.58rem] font-semibold tracking-[0.12em] uppercase ${color}`}>
      {role ?? "עובד"}
    </span>
  );
}

function ActionBadge({ action }: { action: "in" | "out" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-body text-[0.6rem] font-bold tracking-wide ${
      action === "in"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}>
      {action === "in" ? "כניסה" : "יציאה"}
    </span>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-3 rounded-sm">
      <AlertCircle size={14} className="shrink-0 text-red-400" />
      <p className="font-body text-xs text-red-700">{msg}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminDashboard({
  initialStaff,
  initialAttendance,
}: {
  initialStaff: StaffMember[];
  initialAttendance: AttendanceRecord[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── State ──
  const [staff, setStaff]               = useState<StaffMember[]>(initialStaff);
  const [attendance, setAttendance]     = useState<AttendanceRecord[]>(initialAttendance);
  const [staffError, setStaffError]     = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm]   = useState(false);
  const [addName, setAddName]           = useState("");
  const [addPhone, setAddPhone]         = useState("");
  const [addRole, setAddRole]           = useState("עובד");
  const [addError, setAddError]         = useState<string | null>(null);
  const [addSuccess, setAddSuccess]     = useState(false);
  const [addLoading, setAddLoading]     = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null); // staff id being acted on
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [loggingOut, setLoggingOut]     = useState(false);

  // ── Fetch helpers ──
  const refreshStaff = useCallback(async () => {
    const res = await fetch("/api/admin/staff");
    if (res.status === 401) { router.replace("/admin/login"); return; }
    const data = await res.json();
    if (data.error) { setStaffError(data.error); return; }
    setStaff(data.staff);
    setStaffError(null);
  }, [router]);

  const refreshAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    const res = await fetch("/api/admin/attendance/today");
    const data = await res.json();
    setAttendanceLoading(false);
    if (data.error) { setAttendanceError(data.error); return; }
    setAttendance(data.records);
    setAttendanceError(null);
  }, []);

  // ── Add worker ──
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);
    setAddLoading(true);

    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, phone: addPhone, role: addRole }),
    });
    const data = await res.json();
    setAddLoading(false);

    if (!res.ok || data.error) {
      setAddError(data.error ?? "שגיאה בהוספת עובד");
      return;
    }

    setAddSuccess(true);
    setAddName(""); setAddPhone(""); setAddRole("עובד");
    setTimeout(() => { setAddSuccess(false); setShowAddForm(false); }, 1500);
    await refreshStaff();
  };

  // ── Toggle active ──
  const handleToggleActive = async (member: StaffMember) => {
    setActionLoading(member.id);
    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    const data = await res.json();
    setActionLoading(null);
    if (data.error) { setStaffError(data.error); return; }
    setStaff((prev) => prev.map((s) => s.id === member.id ? data.staff : s));
  };

  // ── Delete ──
  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`מחק את ${member.name} לצמיתות? פעולה זו אינה הפיכה.`)) return;
    setActionLoading(member.id);
    const res = await fetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
    const data = await res.json();
    setActionLoading(null);
    if (data.error) { setStaffError(data.error); return; }
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
  };

  // ── Logout ──
  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/admin-auth", { method: "DELETE" });
    startTransition(() => router.replace("/admin/login"));
  };

  const activeCount   = staff.filter((s) => s.active).length;
  const inactiveCount = staff.filter((s) => !s.active).length;
  const checkInsToday = attendance.filter((r) => r.action === "in").length;

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bone" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16 space-y-10">

        {/* ── Top bar ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png" alt="Binyan Eitan" width={100} height={30}
              className="h-7 w-auto brightness-0 opacity-70"
            />
            <div>
              <p className="font-body text-[0.6rem] font-bold tracking-[0.22em] uppercase text-accent/80">
                ממשק ניהול
              </p>
              <h1 className="font-heading text-xl font-bold text-charcoal leading-tight">
                בנין איתן
              </h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 font-body text-xs text-charcoal/40 hover:text-red-500 transition-colors duration-200 mt-1"
          >
            {loggingOut
              ? <Loader2 size={13} className="animate-spin" />
              : <LogOut size={13} strokeWidth={1.5} />
            }
            <span>התנתק</span>
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "עובדים פעילים",   value: activeCount,    color: "text-green-600" },
            { label: "לא פעילים",        value: inactiveCount,  color: "text-charcoal/40" },
            { label: "כניסות היום",      value: checkInsToday,  color: "text-accent" },
          ].map((stat) => (
            <div key={stat.label} className="border border-charcoal/10 bg-white px-4 py-4 text-center">
              <p className={`font-heading text-2xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
              </p>
              <p className="font-body text-[0.6rem] text-charcoal/40 mt-0.5 tracking-wide">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Staff Management ── */}
        <section className="border border-charcoal/10 bg-white p-6 md:p-8">
          <SectionHeader
            icon={Users}
            title="ניהול צוות"
            sub={`${staff.length} עובדים בסך הכל`}
          />

          {staffError && <ErrorBanner msg={staffError} />}

          {/* Staff table */}
          <div className="overflow-x-auto -mx-2">
            <table className="w-full font-body text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-warm-gray-light text-[0.58rem] font-bold tracking-[0.2em] uppercase text-charcoal/35">
                  <th className="py-2.5 text-start pe-4 ps-2">שם</th>
                  <th className="py-2.5 text-start pe-4">טלפון</th>
                  <th className="py-2.5 text-start pe-4">תפקיד</th>
                  <th className="py-2.5 text-start pe-4">סטטוס</th>
                  <th className="py-2.5 text-end ps-2"></th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center font-body text-sm text-charcoal/30">
                      אין עובדים עדיין
                    </td>
                  </tr>
                )}
                {staff.map((member) => {
                  const busy = actionLoading === member.id;
                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-charcoal/[0.05] transition-colors ${
                        member.active ? "hover:bg-bone/60" : "opacity-45 hover:bg-bone/60"
                      }`}
                    >
                      <td className="py-3.5 pe-4 ps-2">
                        <span className={`font-semibold ${member.active ? "text-charcoal" : "text-charcoal/50 line-through"}`}>
                          {member.name}
                        </span>
                      </td>
                      <td className="py-3.5 pe-4 text-charcoal/50 tabular-nums text-xs" dir="ltr">
                        {member.phone}
                      </td>
                      <td className="py-3.5 pe-4">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="py-3.5 pe-4">
                        <span className={`font-body text-[0.6rem] font-bold tracking-wide uppercase ${
                          member.active ? "text-green-600" : "text-charcoal/35"
                        }`}>
                          {member.active ? "פעיל" : "מושבת"}
                        </span>
                      </td>
                      <td className="py-3.5 ps-2 text-end">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleActive(member)}
                            disabled={busy}
                            title={member.active ? "השבת עובד" : "הפעל עובד"}
                            className="text-charcoal/30 hover:text-accent transition-colors disabled:opacity-30"
                          >
                            {busy
                              ? <Loader2 size={17} className="animate-spin" />
                              : member.active
                                ? <ToggleRight size={20} strokeWidth={1.5} className="text-green-500" />
                                : <ToggleLeft size={20} strokeWidth={1.5} />
                            }
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={busy}
                            title="מחק עובד"
                            className="text-charcoal/20 hover:text-red-500 transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add worker toggle */}
          <div className="mt-5 pt-4 border-t border-warm-gray-light">
            <button
              onClick={() => { setShowAddForm((v) => !v); setAddError(null); setAddSuccess(false); }}
              className="flex items-center gap-2 font-body text-sm font-semibold text-accent hover:text-accent-dark transition-colors duration-200"
            >
              {showAddForm
                ? <><ChevronUp size={15} strokeWidth={1.5} /> סגור טופס</>
                : <><Plus size={15} strokeWidth={2} /> הוסף עובד</>
              }
            </button>

            {showAddForm && (
              <form onSubmit={handleAddWorker} className="mt-5 grid gap-4 sm:grid-cols-3">
                {/* Name */}
                <div className="relative">
                  <input
                    type="text" required value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder=" "
                    className="peer w-full border-b border-charcoal/20 bg-transparent py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors placeholder-transparent"
                  />
                  <label className="pointer-events-none absolute start-0 top-3 font-body text-xs text-charcoal/40 uppercase tracking-widest transition-all peer-focus:-top-3.5 peer-focus:text-[0.58rem] peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-[0.58rem]">
                    שם מלא *
                  </label>
                </div>

                {/* Phone */}
                <div className="relative">
                  <input
                    type="tel" inputMode="numeric" required value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder=" "
                    dir="ltr"
                    className="peer w-full border-b border-charcoal/20 bg-transparent py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors placeholder-transparent"
                  />
                  <label className="pointer-events-none absolute start-0 top-3 font-body text-xs text-charcoal/40 uppercase tracking-widest transition-all peer-focus:-top-3.5 peer-focus:text-[0.58rem] peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-[0.58rem]">
                    טלפון *
                  </label>
                </div>

                {/* Role */}
                <div className="relative">
                  <select
                    value={addRole} onChange={(e) => setAddRole(e.target.value)}
                    className="w-full appearance-none border-b border-charcoal/20 bg-transparent py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors cursor-pointer"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="pointer-events-none absolute end-1 top-3 text-charcoal/30 text-xs">▾</div>
                  <label className="pointer-events-none absolute start-0 -top-3.5 font-body text-[0.58rem] text-charcoal/40 uppercase tracking-widest">
                    תפקיד
                  </label>
                </div>

                {/* Messages + submit */}
                <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    type="submit" disabled={addLoading}
                    className="flex items-center gap-2 bg-accent px-6 py-3 font-body text-sm font-semibold tracking-[0.15em] uppercase text-bone hover:bg-accent-dark disabled:opacity-50 transition-colors duration-200"
                  >
                    {addLoading
                      ? <><Loader2 size={14} className="animate-spin" /> שומר...</>
                      : <><UserPlus size={14} strokeWidth={1.5} /> הוסף</>
                    }
                  </button>

                  {addSuccess && (
                    <span className="flex items-center gap-1.5 font-body text-xs text-green-600">
                      <CheckCircle size={14} />
                      עובד נוסף בהצלחה!
                    </span>
                  )}
                  {addError && (
                    <span className="flex items-center gap-1.5 font-body text-xs text-red-500">
                      <AlertCircle size={14} />
                      {addError}
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── Today's Attendance Feed ── */}
        <section className="border border-charcoal/10 bg-white p-6 md:p-8">
          <div className="flex items-start justify-between mb-5 pb-3 border-b border-warm-gray-light">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-accent/[0.08]">
                <ClipboardList size={16} strokeWidth={1.5} className="text-accent" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-charcoal leading-none">
                  נוכחות היום
                </h2>
                <p className="font-body text-[0.62rem] text-charcoal/40 mt-0.5">
                  {todayLabel()} • {attendance.length} רשומות
                </p>
              </div>
            </div>
            <button
              onClick={refreshAttendance}
              disabled={attendanceLoading}
              className="flex items-center gap-1.5 font-body text-xs text-charcoal/40 hover:text-accent transition-colors duration-200 mt-0.5"
            >
              <RefreshCw size={13} strokeWidth={1.5} className={attendanceLoading ? "animate-spin" : ""} />
              <span>{attendanceLoading ? "מרענן..." : "רענן"}</span>
            </button>
          </div>

          {attendanceError && <ErrorBanner msg={attendanceError} />}

          {attendance.length === 0 && !attendanceError ? (
            <p className="py-10 text-center font-body text-sm text-charcoal/30">
              אין דיווחי נוכחות להיום
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full font-body text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-warm-gray-light text-[0.58rem] font-bold tracking-[0.2em] uppercase text-charcoal/35">
                    <th className="py-2.5 text-start pe-4 ps-2">שם</th>
                    <th className="py-2.5 text-start pe-4">טלפון</th>
                    <th className="py-2.5 text-start pe-4">פעולה</th>
                    <th className="py-2.5 text-start">שעה</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((rec) => (
                    <tr key={rec.id} className="border-b border-charcoal/[0.05] hover:bg-bone/60 transition-colors">
                      <td className="py-3.5 pe-4 ps-2 font-semibold text-charcoal">
                        {rec.staff?.name ?? "—"}
                      </td>
                      <td className="py-3.5 pe-4 text-charcoal/50 tabular-nums text-xs" dir="ltr">
                        {rec.staff?.phone ?? "—"}
                      </td>
                      <td className="py-3.5 pe-4">
                        <ActionBadge action={rec.action} />
                      </td>
                      <td className="py-3.5 text-charcoal/50 tabular-nums text-xs" dir="ltr">
                        {formatTime(rec.recorded_at, rec.timestamp_label)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2 border-t border-charcoal/[0.07]">
          <p className="font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
            בניין איתן — ממשק ניהול פנימי
          </p>
          <a
            href="/he/internal"
            className="font-body text-[0.6rem] text-charcoal/30 hover:text-accent transition-colors"
          >
            פורטל צוות ←
          </a>
        </div>

      </div>
    </div>
  );
}
