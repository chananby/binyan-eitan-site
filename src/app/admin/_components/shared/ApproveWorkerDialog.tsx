"use client";

/**
 * ApproveWorkerDialog — modal that turns a pending join_request into
 * a real staff row. Opened from JoinRequestsTab's "אשר" button.
 *
 * Flow:
 *   1. full_name + phone are pre-filled from the join request
 *      (editable — the admin may correct a typo).
 *   2. Admin picks role + employment_type + the matching rate (the
 *      minimal set the existing POST /api/admin/staff route requires).
 *   3. Submit → POST /api/admin/staff (the canonical worker-creation
 *      endpoint, which enforces rate-required-for-employment-type).
 *   4. On success → POST /api/admin/join-requests/[id] action="link"
 *      with the new staff_id. The request flips to approved.
 *   5. On any failure mid-flight, the join request stays pending so
 *      the admin can retry without losing the queue entry.
 *
 * We deliberately use the existing staff route (not a one-off worker
 * insert in this dialog) — that way the rate-enforcement,
 * phone-normalization, and the staff_rates seed all run unchanged.
 * Additional optional fields (label, bank, attendance_exempt, etc.)
 * are left for the admin to set later via WorkersTab.
 */

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

type EmploymentType = "hourly" | "daily" | "global";

interface PendingRequest {
  id: string;
  full_name: string;
  phone: string;
  description: string | null;
}

interface Props {
  open: boolean;
  request: PendingRequest | null;
  onClose: () => void;
  /** Called after both POSTs (staff + link) succeed. The parent
   *  refreshes the list and the badge count. */
  onApproved: () => void;
}

const ROLES = ["עובד", "ממונה", "מנהל"] as const;

export default function ApproveWorkerDialog(p: Props) {
  // ─ Form state ───────────────────────────────────────────────────────
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [role,       setRole]       = useState<typeof ROLES[number]>("עובד");
  const [empType,    setEmpType]    = useState<EmploymentType>("hourly");
  const [hourlyRate, setHourlyRate] = useState("");
  const [dailyRate,  setDailyRate]  = useState("");
  const [globalRate, setGlobalRate] = useState("");

  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever a new request is loaded into the dialog.
  useEffect(() => {
    if (!p.open || !p.request) return;
    setName(p.request.full_name);
    setPhone(p.request.phone);
    setRole("עובד");
    setEmpType("hourly");
    setHourlyRate("");
    setDailyRate("");
    setGlobalRate("");
    setBusy(false);
    setError(null);
  }, [p.open, p.request]);

  // ESC closes (only while open so other pages don't intercept).
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) p.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onClose, busy]);

  if (!p.open || !p.request) return null;

  const requestId = p.request.id;

  const requiredRate =
    empType === "hourly" ? hourlyRate :
    empType === "daily"  ? dailyRate  : globalRate;
  const ready = name.trim() && phone.trim() && Number(requiredRate) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);

    const num = (s: string) => {
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const body: Record<string, unknown> = {
      name:                  name.trim(),
      phone:                 phone.trim(),
      role,
      employment_type:       empType,
      hourly_rate:           num(hourlyRate),
      daily_rate:            num(dailyRate),
      monthly_global_salary: num(globalRate),
    };

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `שגיאה ${res.status}`);
        setBusy(false);
        return;
      }
      // POST /api/admin/staff returns { staff: { id, … } }.
      const newStaffId: string | undefined = data?.staff?.id;
      if (!newStaffId) {
        setError("לא התקבל מזהה עובד מהשרת");
        setBusy(false);
        return;
      }

      // 2nd leg: link the join request to the new staff_id. The staff
      // row already exists — if this link fails, we surface the error
      // but the worker is created. The admin can re-trigger the link
      // manually if needed (rare).
      const linkRes = await fetch(`/api/admin/join-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", staff_id: newStaffId }),
      });
      if (!linkRes.ok) {
        const lb = await linkRes.json().catch(() => ({}));
        setError(`העובד נוצר אך הקישור לבקשה נכשל: ${lb.error ?? linkRes.status}`);
        setBusy(false);
        return;
      }
      p.onApproved();
    } catch (err) {
      setError("שגיאת רשת: " + String(err));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-charcoal/55 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={() => { if (!busy) p.onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="אישור בקשת הצטרפות"
    >
      <div
        className="bg-bone rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/10">
          <div className="min-w-0">
            <p className="font-body text-xs text-charcoal/70 leading-none">אישור בקשת הצטרפות</p>
            <p className="font-heading text-base font-bold text-charcoal truncate">{p.request.full_name}</p>
          </div>
          <button
            onClick={p.onClose}
            disabled={busy}
            className="p-1 text-charcoal/65 hover:text-charcoal/80 transition-colors shrink-0 disabled:opacity-40"
            aria-label="סגור"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {p.request.description && (
            <div className="bg-white border border-charcoal/10 rounded-md px-3 py-2 text-[0.7rem] text-charcoal/70 leading-snug">
              <span className="font-semibold text-charcoal/65">תיאור הבקשה: </span>
              {p.request.description}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[0.65rem] text-charcoal/70 mb-1">שם מלא</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                required
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] text-charcoal/70 mb-1">טלפון</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
                required
                type="tel"
                dir="ltr"
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[0.65rem] text-charcoal/70 mb-1">תפקיד</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof ROLES[number])}
                disabled={busy}
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[0.65rem] text-charcoal/70 mb-1">סוג העסקה</label>
              <select
                value={empType}
                onChange={(e) => setEmpType(e.target.value as EmploymentType)}
                disabled={busy}
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="hourly">שעתי</option>
                <option value="daily">יומי</option>
                <option value="global">גלובלי</option>
              </select>
            </div>
          </div>

          {/* Required rate per employment_type — the staff route
              enforces this; we surface the matching input only. */}
          <div>
            <label className="block text-[0.65rem] text-charcoal/70 mb-1">
              {empType === "hourly" && "תעריף שעתי (₪)"}
              {empType === "daily"  && "תעריף יומי (₪)"}
              {empType === "global" && "שכר גלובלי חודשי (₪)"}
            </label>
            {empType === "hourly" && (
              <input
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                disabled={busy}
                type="number"
                min="0"
                step="any"
                placeholder="0"
                dir="ltr"
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            )}
            {empType === "daily" && (
              <input
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                disabled={busy}
                type="number"
                min="0"
                step="any"
                placeholder="0"
                dir="ltr"
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            )}
            {empType === "global" && (
              <input
                value={globalRate}
                onChange={(e) => setGlobalRate(e.target.value)}
                disabled={busy}
                type="number"
                min="0"
                step="any"
                placeholder="0"
                dir="ltr"
                className="w-full border border-charcoal/15 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
              />
            )}
            <p className="text-[0.65rem] text-charcoal/55 mt-1">
              שאר הפרטים (תעריפים נוספים, פרטי בנק, תווית) ניתנים להשלמה לאחר השמירה בטאב &quot;עובדים&quot;.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-xs flex items-start gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={p.onClose}
              disabled={busy}
              className="flex-1 border border-charcoal/15 text-charcoal/65 py-2 rounded text-sm font-semibold hover:border-accent transition-colors disabled:opacity-40"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!ready || busy}
              className="flex-1 bg-accent text-bone py-2 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              {busy ? <><Loader2 size={13} className="animate-spin" /> שומר…</> : "צור עובד ואשר"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
