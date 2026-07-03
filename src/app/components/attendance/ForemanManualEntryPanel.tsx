"use client";

/**
 * ForemanManualEntryPanel — the foreman's "worker forgot to clock, I'll
 * enter it for them" form. Lives in the `site` tab of ForemanPortal.
 *
 * Hebrew UI only — the current foreman roster is 100% Hebrew-speaking
 * (verified against staff.language for role='ממונה'). If a non-Hebrew
 * foreman ever joins, this component becomes an i18n candidate; until
 * then keeping it out of the T dictionary avoids five extra rows of
 * translation work per feature change.
 *
 * The form POSTs to /api/admin/attendance/manual — the same endpoint the
 * admin's own manual entry uses. The backend distinguishes callers and
 * lands foreman entries as status='pending' + edited_by='foreman:<name>'
 * so the admin still reviews before payroll counts the hours.
 *
 * The project_id is fixed to the foreman's current site: passed in as a
 * prop, not user-editable. This mirrors the backend's project-ownership
 * check (foreman may only enter for their own projects) so a mismatched
 * client can't even try.
 */

import { useState } from "react";
import { Loader2, Plus, Check, X } from "lucide-react";

interface WorkerOption { id: string; name: string; attendance_exempt?: boolean }

interface Props {
  projectId: string;
  projectName: string;
  workers: WorkerOption[];      // active workers to offer in the picker
  onSubmitted?: () => void;     // parent may want to reload panels
}

export default function ForemanManualEntryPanel({ projectId, projectName, workers, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [date, setDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [entry, setEntry]   = useState("");
  const [exit, setExit]     = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const [msg, setMsg]       = useState<string | null>(null);

  // attendance-exempt workers (globals) aren't expected to clock — hide
  // them so the picker only shows relevant crew.
  const eligible = workers.filter((w) => !w.attendance_exempt);

  const canSubmit = staffId && date && entry && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id:   staffId,
          date,
          type:       "regular",
          entry_time: entry,
          ...(exit ? { exit_time: exit } : {}),
          project_id: projectId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error ?? `שגיאה ${res.status}`); return; }
      setMsg("ההחתמה נשלחה לאישור.");
      // Reset only the per-worker fields; keep date so the foreman can
      // enter another row for the same day quickly.
      setStaffId(""); setEntry(""); setExit("");
      onSubmitted?.();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {msg && (
          <p className="text-caption text-green-700 flex items-center gap-1.5 px-1">
            <Check size={12} /> {msg}
          </p>
        )}
        <button
          type="button"
          onClick={() => { setOpen(true); setErr(null); }}
          className="w-full inline-flex items-center justify-center gap-1.5 border border-accent/40 text-accent bg-white py-2.5 rounded text-content font-semibold hover:bg-accent/5"
        >
          <Plus size={14} /> הוסף החתמה לעובד
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-white border border-accent/40 p-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm font-bold text-charcoal">הוסף החתמה לעובד</p>
        <button
          type="button"
          onClick={() => { setOpen(false); setErr(null); setMsg(null); }}
          className="text-charcoal/60 hover:text-charcoal"
          aria-label="סגור"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-caption text-muted">
        פרויקט: <span className="font-semibold text-charcoal">{projectName}</span>
        {" · "}הרשומה תעבור לאישור האדמין לפני שתיספר.
      </p>

      <label className="block space-y-1">
        <span className="text-caption text-muted">עובד</span>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="w-full border border-charcoal/20 bg-white px-3 py-2 text-content focus:outline-none focus:border-accent"
          required
        >
          <option value="">— בחר —</option>
          {eligible.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-1 block space-y-1">
          <span className="text-caption text-muted">תאריך</span>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-2 py-2 text-content focus:outline-none focus:border-accent"
            dir="ltr"
            required
          />
        </label>
        <label className="col-span-1 block space-y-1">
          <span className="text-caption text-muted">כניסה</span>
          <input
            type="time"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-2 py-2 text-content focus:outline-none focus:border-accent"
            dir="ltr"
            required
          />
        </label>
        <label className="col-span-1 block space-y-1">
          <span className="text-caption text-muted">יציאה</span>
          <input
            type="time"
            value={exit}
            onChange={(e) => setExit(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-2 py-2 text-content focus:outline-none focus:border-accent"
            dir="ltr"
            placeholder="אופציונלי"
          />
        </label>
      </div>

      {err && <p className="text-caption text-red-600 flex items-center gap-1.5"><X size={11} /> {err}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-accent text-bone py-2.5 rounded text-content font-semibold hover:bg-accent-dark disabled:opacity-40"
      >
        {saving ? <><Loader2 size={13} className="animate-spin" /> שולח…</> : "שלח לאישור"}
      </button>
    </form>
  );
}
