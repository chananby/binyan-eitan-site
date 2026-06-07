"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UserPlus, RefreshCw, ChevronDown, ChevronUp, Trash2, AlertTriangle, History, Download, Loader2 } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT } from "../shared/constants";
import { AutoGrowTextarea } from "../../../components/AutoGrowTextarea";

type EmploymentType = "hourly" | "daily" | "global";

const INACTIVE_OPEN_KEY = "binyan-eitan-workers-tab-inactive-open";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  national_id?: string | null;
  hourly_rate?: number | null;
  daily_rate?: number | null;
  employment_type?: EmploymentType;
  monthly_global_salary?: number | null;
  travel_allowance?: boolean;
  pension_status?: string | null;
  holiday_eligible?: boolean;
  is_freelancer?: boolean;
  start_date?: string | null;
  notes?: string | null;
  has_pin?: boolean;
}

type Props = {
  staff: StaffMember[];

  // New-worker form state
  newName: string;            setNewName:            (v: string) => void;
  newPhone: string;           setNewPhone:           (v: string) => void;
  newRole: string;            setNewRole:            (v: string) => void;
  newNationalId: string;      setNewNationalId:      (v: string) => void;
  newEmploymentType: EmploymentType; setNewEmploymentType: (v: EmploymentType) => void;
  newHourlyRate: string;      setNewHourlyRate:      (v: string) => void;
  newDailyRate: string;       setNewDailyRate:       (v: string) => void;
  newGlobalSalary: string;    setNewGlobalSalary:    (v: string) => void;
  newTravelAllowance: boolean; setNewTravelAllowance: (v: boolean) => void;
  newHolidayEligible: boolean; setNewHolidayEligible: (v: boolean) => void;
  newPensionStatus: string;   setNewPensionStatus:   (v: string) => void;
  newIsFreelancer: boolean;   setNewIsFreelancer:    (v: boolean) => void;
  newStartDate: string;       setNewStartDate:       (v: string) => void;
  newNotes: string;           setNewNotes:           (v: string) => void;
  newPin: string;             setNewPin:             (v: string) => void;
  addLoading: boolean;
  addMsg: string;
  onAddWorker: (e: React.FormEvent) => void | Promise<void>;

  // Edit-worker form state
  editingId: string | null;   setEditingId: (v: string | null) => void;
  editName: string;           setEditName:            (v: string) => void;
  editPhone: string;          setEditPhone:           (v: string) => void;
  editRole: string;           setEditRole:            (v: string) => void;
  editNationalId: string;     setEditNationalId:      (v: string) => void;
  editEmploymentType: EmploymentType; setEditEmploymentType: (v: EmploymentType) => void;
  editHourlyRate: string;     setEditHourlyRate:      (v: string) => void;
  editDailyRate: string;      setEditDailyRate:       (v: string) => void;
  editGlobalSalary: string;   setEditGlobalSalary:    (v: string) => void;
  editTravelAllowance: boolean; setEditTravelAllowance: (v: boolean) => void;
  editHolidayEligible: boolean; setEditHolidayEligible: (v: boolean) => void;
  editPensionStatus: string;  setEditPensionStatus:   (v: string) => void;
  editIsFreelancer: boolean;  setEditIsFreelancer:    (v: boolean) => void;
  editStartDate: string;      setEditStartDate:       (v: string) => void;
  editNotes: string;          setEditNotes:           (v: string) => void;
  editPin: string;            setEditPin:             (v: string) => void;
  editLoading: boolean;
  editMsg: string;
  onEditWorker: (e: React.FormEvent) => void | Promise<void>;
  onStartEdit:  (s: StaffMember) => void;
  onToggleActive: (id: string, active: boolean) => void | Promise<void>;
  onDeleteWorker: (id: string) => void | Promise<void>;
  onViewHistory:  (id: string) => void;
  onOpenVacation: (staffId: string) => void | Promise<void>;
  onReload: () => void | Promise<void>;

  // TabRefreshBar
  lastRefreshed: Date | null;
  refreshing: boolean;
  dataLoading: boolean;
  onTabRefresh: () => void;
};

export default function WorkersTab(p: Props) {
  const activeStaff   = useMemo(() => p.staff.filter(s =>  s.active), [p.staff]);
  const inactiveStaff = useMemo(() => p.staff.filter(s => !s.active), [p.staff]);

  // Accordion state — persisted across sessions in localStorage. Defaults to
  // closed so the common case (managing active workers) stays uncluttered.
  const [inactiveOpen, setInactiveOpen] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(INACTIVE_OPEN_KEY);
      if (stored === "true") setInactiveOpen(true);
    } catch { /* localStorage blocked — keep default */ }
  }, []);
  function toggleInactive() {
    setInactiveOpen(v => {
      const next = !v;
      try { localStorage.setItem(INACTIVE_OPEN_KEY, String(next)); } catch {}
      return next;
    });
  }

  // Delete confirmation modal state — requires typing the worker's name.
  const [pendingDelete, setPendingDelete] = useState<StaffMember | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Export — single full-staff XLSX (profile + 3-month activity summary).
  // Same UX pattern as the payroll-tab exports: button spins while we wait
  // for the binary, then drives a hidden anchor click to trigger download.
  const [exporting, setExporting] = useState(false);
  async function exportStaffReport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/staff/export");
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה בייצוא: ${b.error ?? res.status}`);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
      a.href = url;
      a.download = `staff-report-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function askDelete(s: StaffMember) {
    setPendingDelete(s);
    setConfirmName("");
  }
  function cancelDelete() {
    setPendingDelete(null);
    setConfirmName("");
  }
  async function confirmDelete() {
    if (!pendingDelete || confirmName.trim() !== pendingDelete.name.trim()) return;
    setDeleteLoading(true);
    try {
      await p.onDeleteWorker(pendingDelete.id);
      cancelDelete();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <TabRefreshBar loading={p.refreshing || p.dataLoading} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />

      {/* Single XLSX export — profile + last 3 months' activity. Sits at the
          top of the tab so it's reachable without scrolling past the
          worker list. Matches the payroll-tab export button visually. */}
      <div className="flex justify-end">
        <button
          onClick={exportStaffReport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 border border-accent text-accent px-4 py-2 text-[0.7rem] font-semibold tracking-wider uppercase hover:bg-accent/[0.08] disabled:opacity-40 transition-colors"
          title='ייצוא דוח עובדים מלא ל-XLSX (פרופיל + 3 חודשי פעילות)'
        >
          {exporting
            ? <><Loader2 size={13} className="animate-spin" /> מייצא…</>
            : <><Download size={13} /> 📥 דוח עובדים</>}
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">הוספת עובד</h2>
        </div>
        <form onSubmit={p.onAddWorker} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם מלא"><AutoGrowTextarea value={p.newName} onChange={e => p.setNewName(e.target.value)} required placeholder="ישראל ישראלי" className={INPUT} /></Field>
            <Field label="טלפון"><input value={p.newPhone} onChange={e => p.setNewPhone(e.target.value)} required placeholder="05X-XXXXXXX" type="tel" dir="ltr" className={INPUT} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="תפקיד">
              <select value={p.newRole} onChange={e => p.setNewRole(e.target.value)} className={INPUT}>
                <option value="עובד">עובד</option><option value="ממונה">ממונה</option><option value="מנהל">מנהל</option>
              </select>
            </Field>
            <Field label='ת"ז (אופציונלי)'>
              <input value={p.newNationalId} onChange={e => p.setNewNationalId(e.target.value.replace(/\D/g, ""))} placeholder="123456789" inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="סטטוס העסקה">
              <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.newIsFreelancer}
                  onChange={e => {
                    const isFree = e.target.checked;
                    p.setNewIsFreelancer(isFree);
                    // Smart default in the add form only: freelancers don't get
                    // travel; switching back to employee re-enables it. The
                    // admin can still override either checkbox manually.
                    p.setNewTravelAllowance(!isFree);
                  }}
                  className="accent-accent"
                />
                <span className="text-charcoal/70">עצמאי (קבלן)</span>
              </label>
            </Field>
            <Field label="תאריך התחלת עבודה (אופציונלי)">
              <input type="date" value={p.newStartDate} onChange={e => p.setNewStartDate(e.target.value)} className={INPUT} dir="ltr" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג העסקה">
              <select value={p.newEmploymentType} onChange={e => p.setNewEmploymentType(e.target.value as EmploymentType)} className={INPUT}>
                <option value="hourly">שעתי</option>
                <option value="daily">יומי</option>
                <option value="global">גלובלי</option>
              </select>
            </Field>
            {p.newEmploymentType === "hourly" && (
              <Field label="שכר שעתי (₪)"><input value={p.newHourlyRate} onChange={e => p.setNewHourlyRate(e.target.value)} type="number" min="0" step="0.5" placeholder="45.00" dir="ltr" className={INPUT} /></Field>
            )}
            {p.newEmploymentType === "daily" && (
              <Field label="שכר יומי (₪)"><input value={p.newDailyRate}  onChange={e => p.setNewDailyRate(e.target.value)}  type="number" min="0" step="1" placeholder="350" dir="ltr" className={INPUT} /></Field>
            )}
            {p.newEmploymentType === "global" && (
              <Field label="שכר חודשי גלובלי (₪)"><input value={p.newGlobalSalary} onChange={e => p.setNewGlobalSalary(e.target.value)} type="number" min="0" step="1" placeholder="8000" dir="ltr" className={INPUT} /></Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="דמי נסיעות">
              <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                <input type="checkbox" checked={p.newTravelAllowance} onChange={e => p.setNewTravelAllowance(e.target.checked)} className="accent-accent" />
                <span className="text-charcoal/70">זכאי לנסיעות</span>
              </label>
            </Field>
            <Field label="זכאות לחגים">
              <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
                <input type="checkbox" checked={p.newHolidayEligible} onChange={e => p.setNewHolidayEligible(e.target.checked)} className="accent-accent" />
                <span className="text-charcoal/70">זכאי לתשלום על חגים</span>
              </label>
            </Field>
          </div>
          <Field label="סטטוס פנסיה (טקסט חופשי)">
            <AutoGrowTextarea value={p.newPensionStatus} onChange={e => p.setNewPensionStatus(e.target.value)} placeholder="פעיל / תקופת המתנה / לא הוסדר" className={INPUT} />
          </Field>
          <Field label="הערות (אופציונלי)">
            <AutoGrowTextarea value={p.newNotes} onChange={e => p.setNewNotes(e.target.value)} placeholder="הערות חופשיות על העובד..." className={INPUT} />
          </Field>
          {p.newRole === "ממונה" && (
            <Field label="PIN לכניסה לפורטל (4–8 ספרות)">
              <input value={p.newPin} onChange={e => p.setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" maxLength={8} placeholder="1234" dir="ltr" className={INPUT} />
            </Field>
          )}
          <Btn loading={p.addLoading}>הוסף עובד</Btn>
          {p.addMsg && <p className={`text-xs ${p.addMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{p.addMsg}</p>}
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-bold">עובדים פעילים ({activeStaff.length})</h2>
          <button onClick={p.onReload} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
            <RefreshCw size={12} strokeWidth={1.5} /> רענן
          </button>
        </div>
        {activeStaff.length === 0 && <p className="text-sm text-charcoal/30 text-center py-4">אין עובדים פעילים</p>}
        <div className="divide-y divide-charcoal/5">
          {activeStaff.map(s => renderStaffRow(p, s, false, askDelete))}
        </div>
      </Card>

      {inactiveStaff.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={toggleInactive}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            aria-expanded={inactiveOpen}
          >
            <h2 className="font-heading text-base font-bold text-charcoal/60">
              מושבתים ({inactiveStaff.length})
            </h2>
            {inactiveOpen
              ? <ChevronUp size={16} strokeWidth={1.5} className="text-charcoal/40" />
              : <ChevronDown size={16} strokeWidth={1.5} className="text-charcoal/40" />}
          </button>
          {inactiveOpen && (
            <div className="divide-y divide-charcoal/5 mt-3">
              {inactiveStaff.map(s => renderStaffRow(p, s, true, askDelete))}
            </div>
          )}
        </Card>
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          worker={pendingDelete}
          confirmName={confirmName}
          setConfirmName={setConfirmName}
          loading={deleteLoading}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ── Row rendering ────────────────────────────────────────────────────────────
// Shared between active and inactive lists. When `isInactive` is true, a red
// "מחק" button appears at the end (delete is only legal on inactive workers).
function renderStaffRow(
  p: Props,
  s: StaffMember,
  isInactive: boolean,
  askDelete: (s: StaffMember) => void,
) {
  if (p.editingId === s.id) {
    return (
      <form key={s.id} onSubmit={p.onEditWorker} className="py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="שם"><AutoGrowTextarea value={p.editName} onChange={e => p.setEditName(e.target.value)} required className={INPUT} /></Field>
          <Field label="טלפון"><input value={p.editPhone} onChange={e => p.setEditPhone(e.target.value)} required type="tel" dir="ltr" className={INPUT} /></Field>
          <Field label="תפקיד">
            <select value={p.editRole} onChange={e => p.setEditRole(e.target.value)} className={INPUT}>
              <option value="עובד">עובד</option><option value="ממונה">ממונה</option><option value="מנהל">מנהל</option>
            </select>
          </Field>
          <Field label='ת"ז'><input value={p.editNationalId} onChange={e => p.setEditNationalId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={9} dir="ltr" className={INPUT} /></Field>
          <Field label="סוג העסקה">
            <select value={p.editEmploymentType} onChange={e => p.setEditEmploymentType(e.target.value as EmploymentType)} className={INPUT}>
              <option value="hourly">שעתי</option>
              <option value="daily">יומי</option>
              <option value="global">גלובלי</option>
            </select>
          </Field>
          {p.editEmploymentType === "hourly" && (
            <Field label="שכר שעתי (₪)"><input value={p.editHourlyRate} onChange={e => p.setEditHourlyRate(e.target.value)} type="number" min="0" step="0.5" dir="ltr" className={INPUT} /></Field>
          )}
          {p.editEmploymentType === "daily" && (
            <Field label="שכר יומי (₪)"><input value={p.editDailyRate}  onChange={e => p.setEditDailyRate(e.target.value)}  type="number" min="0" step="1" dir="ltr" className={INPUT} /></Field>
          )}
          {p.editEmploymentType === "global" && (
            <Field label="שכר חודשי גלובלי (₪)"><input value={p.editGlobalSalary} onChange={e => p.setEditGlobalSalary(e.target.value)} type="number" min="0" step="1" dir="ltr" className={INPUT} /></Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="דמי נסיעות">
            <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
              <input type="checkbox" checked={p.editTravelAllowance} onChange={e => p.setEditTravelAllowance(e.target.checked)} className="accent-accent" />
              <span className="text-charcoal/70">זכאי</span>
            </label>
          </Field>
          <Field label="זכאות לחגים">
            <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
              <input type="checkbox" checked={p.editHolidayEligible} onChange={e => p.setEditHolidayEligible(e.target.checked)} className="accent-accent" />
              <span className="text-charcoal/70">זכאי</span>
            </label>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="סטטוס העסקה">
            <label className="flex items-center gap-2 text-sm py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={p.editIsFreelancer}
                onChange={e => p.setEditIsFreelancer(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-charcoal/70">עצמאי (קבלן)</span>
            </label>
          </Field>
          <Field label="תאריך התחלת עבודה">
            <input type="date" value={p.editStartDate} onChange={e => p.setEditStartDate(e.target.value)} className={INPUT} dir="ltr" />
          </Field>
        </div>
        <Field label="סטטוס פנסיה">
          <AutoGrowTextarea value={p.editPensionStatus} onChange={e => p.setEditPensionStatus(e.target.value)} placeholder="פעיל / תקופת המתנה / לא הוסדר" className={INPUT} />
        </Field>
        <Field label="הערות">
          <AutoGrowTextarea value={p.editNotes} onChange={e => p.setEditNotes(e.target.value)} placeholder="הערות חופשיות על העובד..." className={INPUT} />
        </Field>
        {p.editRole === "ממונה" && (
          <Field label="PIN חדש (השאר ריק לשמירת הנוכחי)">
            <input value={p.editPin} onChange={e => p.setEditPin(e.target.value.replace(/\D/g, "").slice(0, 8))} type="text" inputMode="numeric" maxLength={8} placeholder="4–8 ספרות" dir="ltr" className={INPUT} />
          </Field>
        )}
        {p.editMsg && <p className="text-xs text-red-500">{p.editMsg}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={p.editLoading} className="flex-1 bg-accent py-2 text-xs font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">{p.editLoading ? "שומר..." : "שמור"}</button>
          <button type="button" onClick={() => p.setEditingId(null)} className="flex-1 border border-charcoal/20 py-2 text-xs text-charcoal/50 hover:border-accent transition-colors">ביטול</button>
        </div>
      </form>
    );
  }

  return (
    <div key={s.id} className={`flex items-center justify-between py-3 gap-2 ${isInactive ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{s.name}</p>
        <p className="text-[0.7rem] text-charcoal/40 tabular-nums" dir="ltr">{s.phone}</p>
        {(s.hourly_rate || s.daily_rate) && (
          <p className="text-[0.75rem] text-accent/70">
            {s.hourly_rate ? `₪${s.hourly_rate}/ש׳` : ""}{s.hourly_rate && s.daily_rate ? " · " : ""}{s.daily_rate ? `₪${s.daily_rate}/יום` : ""}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[0.75rem] text-charcoal/40">{s.role}</span>
        {s.role === "ממונה" && (
          <span className={`text-[0.7rem] px-1.5 py-0.5 ${s.has_pin ? "bg-accent/10 text-accent" : "bg-red-50 text-red-400"}`}>
            {s.has_pin ? "PIN מוגדר" : "ללא PIN"}
          </span>
        )}
      </div>
      <span className={`text-[0.75rem] px-2 py-0.5 shrink-0 ${s.active ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>{s.active ? "פעיל" : "לא פעיל"}</span>
      <button onClick={() => p.onStartEdit(s)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">ערוך</button>
      {!isInactive && (
        <button
          onClick={() => p.onViewHistory(s.id)}
          className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0 flex items-center gap-1"
          aria-label={`היסטוריית ${s.name}`}
        >
          <History size={11} strokeWidth={1.5} /> היסטוריה
        </button>
      )}
      <button onClick={() => p.onOpenVacation(s.id)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">חופשה</button>
      <button onClick={() => p.onToggleActive(s.id, s.active)} className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">{s.active ? "השבת" : "הפעל"}</button>
      {isInactive && (
        <button
          onClick={() => askDelete(s)}
          className="text-[0.7rem] border border-red-200 text-red-500 px-2.5 py-1 hover:border-red-400 hover:bg-red-50 transition-colors shrink-0 flex items-center gap-1"
          aria-label={`מחק את ${s.name}`}
        >
          <Trash2 size={11} strokeWidth={1.5} /> מחק
        </button>
      )}
    </div>
  );
}

// ── Delete confirmation modal ────────────────────────────────────────────────
// Requires the admin to type the worker's name exactly, so a stray click can't
// destroy a payroll-history entry. Attendance rows are preserved server-side.
function DeleteConfirmModal({
  worker, confirmName, setConfirmName, loading, onCancel, onConfirm,
}: {
  worker: StaffMember;
  confirmName: string;
  setConfirmName: (v: string) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = confirmName.trim() === worker.name.trim() && !loading;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 px-4">
      <div className="bg-bone w-full max-w-md p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3 text-red-500">
          <AlertTriangle size={18} strokeWidth={1.5} />
          <h3 className="font-heading text-base font-bold">מחיקת עובד — פעולה בלתי הפיכה</h3>
        </div>
        <p className="text-sm text-charcoal/70 leading-relaxed mb-3">
          להקלדת שם העובד <span className="font-semibold text-charcoal">&quot;{worker.name}&quot;</span> באופן מדויק כדי לאשר.
        </p>
        <p className="text-[0.7rem] text-charcoal/50 leading-relaxed mb-3">
          העובד יוסר מרשימת הצוות. רשומות שעות העבודה שלו יישמרו לצורכי דוחות וארכיון.
        </p>
        <input
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          placeholder={worker.name}
          autoFocus
          className={INPUT}
        />
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-red-500 py-2 text-xs font-semibold text-bone hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "מוחק..." : "מחק עובד"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-charcoal/20 py-2 text-xs text-charcoal/60 hover:border-accent transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
