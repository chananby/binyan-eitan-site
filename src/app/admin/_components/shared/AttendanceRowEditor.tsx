"use client";

/**
 * AttendanceRowEditor — inline form rendered as an expanded <tr> beneath a
 * WorkerHistoryPanel day row. Drives three flows:
 *
 *   • edit:           adjust an existing day's entry+exit times (PATCHes both rows).
 *   • complete:       add the missing OUT for a day where the worker forgot to
 *                     clock out (POST /api/admin/attendance/clock-out with date+time).
 *   • complete-entry: add the missing IN for an orphan-exit day — an OUT with
 *                     no matching IN (POST /api/admin/attendance/manual,
 *                     type=regular, entry-only). The mirror of "complete".
 *                     The manual endpoint's own guard rejects a duplicate with
 *                     409 already_has_open_entry if an IN already exists.
 *   • add:            create both IN and OUT for a day with no attendance at all
 *                     (POST /api/admin/attendance/manual, type=regular).
 *
 * Always sends `edit_note` (when typed) so the audit trail on the server
 * records *why* the row was touched. The server enforces the retro window
 * independently; this component just disables the controls when the day
 * is outside the editable months so admins don't even see a submit button
 * they'd then be told to undo.
 */

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import type { WorkerHistoryDay } from "../../../../lib/worker-history-aggregate";

export type EditorMode = "edit" | "complete" | "complete-entry" | "add";

interface Props {
  mode: EditorMode;
  day: WorkerHistoryDay;
  staffId: string;
  colSpan: number;
  onCancel: () => void;
  onSuccess: () => void; // parent reloads + closes
}

// Convert YYYY-MM-DD → "DD.MM.YYYY" for the PATCH endpoint's timestamp_label
// format. The HH:MM is appended client-side and parsed back on the server.
function toDotDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${parseInt(d)}.${parseInt(m)}.${y}`;
}

export default function AttendanceRowEditor(p: Props) {
  const startInit = p.mode === "edit" ? (p.day.startTime ?? "") : "";
  const endInit   = p.mode === "edit" ? (p.day.endTime   ?? "") : "";

  const [startTime, setStartTime] = useState(startInit);
  const [endTime,   setEndTime]   = useState(endInit);
  const [note,      setNote]      = useState("");
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState<string | null>(null);

  // Per-mode hints — kept on one line so the form header doesn't shift the table.
  const title =
    p.mode === "edit"           ? `עריכת שעות — ${p.day.date}` :
    p.mode === "complete"       ? `השלמת יציאה — ${p.day.date}` :
    p.mode === "complete-entry" ? `השלמת כניסה — ${p.day.date}` :
                                  `הוספת יום עבודה — ${p.day.date}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (p.mode === "add") {
        // Exit is optional — entry-only creates an open record, closed later
        // via the "complete" (השלמת יציאה) flow.
        if (!startTime) { setErr("נא למלא שעת כניסה"); return; }
        const res = await fetch("/api/admin/attendance/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: p.staffId,
            date:     p.day.date,
            type:     "regular",
            entry_time: startTime,
            ...(endTime ? { exit_time: endTime } : {}),
          }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error ?? `שגיאה ${res.status}`);
        }
        // NOTE: the manual endpoint does not yet accept an edit_note. The
        // edit_note field is wired for the other two modes where it lands
        // on the existing row's audit trail.
      } else if (p.mode === "complete") {
        if (!endTime) { setErr("נא למלא שעת יציאה"); return; }
        const res = await fetch("/api/admin/attendance/clock-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: p.staffId,
            date:     p.day.date,
            time:     endTime,
          }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error ?? `שגיאה ${res.status}`);
        }
      } else if (p.mode === "complete-entry") {
        // Orphan-exit fix: add the missing IN only, leave the existing OUT
        // untouched. Reuses the manual endpoint entry-only — its hasOpenRecord
        // guard 409s (already_has_open_entry) if an IN already exists, so we
        // can't accidentally create a second entry.
        if (!startTime) { setErr("נא למלא שעת כניסה"); return; }
        const res = await fetch("/api/admin/attendance/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id:   p.staffId,
            date:       p.day.date,
            type:       "regular",
            entry_time: startTime,
            ...(note.trim() ? { notes: note.trim() } : {}),
          }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error ?? `שגיאה ${res.status}`);
        }
      } else { // edit
        // PATCH each side independently — only when the value actually changed,
        // so we don't burn an audit-trail entry on a no-op.
        const patches: Promise<Response>[] = [];
        if (startTime && startTime !== (p.day.startTime ?? "") && p.day.entryId) {
          patches.push(fetch(`/api/admin/attendance/${p.day.entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp_label: `${toDotDate(p.day.date)}, ${startTime}`,
              ...(note.trim() ? { edit_note: note.trim() } : {}),
            }),
          }));
        }
        if (endTime && endTime !== (p.day.endTime ?? "") && p.day.exitId) {
          patches.push(fetch(`/api/admin/attendance/${p.day.exitId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp_label: `${toDotDate(p.day.date)}, ${endTime}`,
              ...(note.trim() ? { edit_note: note.trim() } : {}),
            }),
          }));
        }
        if (patches.length === 0) { setErr("לא בוצע שינוי"); return; }
        const results = await Promise.all(patches);
        const failed  = results.find((r) => !r.ok);
        if (failed) {
          const b = await failed.json().catch(() => ({}));
          throw new Error(b.error ?? `שגיאה ${failed.status}`);
        }
      }
      p.onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Show fields based on mode. "complete" (exit) asks only for end time;
  // "complete-entry" asks only for start time; edit/add ask for both.
  const showStart = p.mode === "edit" || p.mode === "add" || p.mode === "complete-entry";
  const showEnd   = p.mode === "edit" || p.mode === "add" || p.mode === "complete";

  return (
    <tr className="bg-bone/60">
      <td colSpan={p.colSpan} className="border border-warm-gray-light p-3">
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[0.75rem] font-semibold text-charcoal">
            {title}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {showStart && (
              <label className="flex flex-col gap-1">
                <span className="text-caption text-charcoal/65">שעת כניסה</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-warm-gray-light bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                  dir="ltr"
                />
              </label>
            )}
            {showEnd && (
              <label className="flex flex-col gap-1">
                <span className="text-caption text-charcoal/65">{p.mode === "add" ? "שעת יציאה (אופציונלי)" : "שעת יציאה"}</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-warm-gray-light bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                  dir="ltr"
                />
              </label>
            )}
            {p.mode !== "add" && (
              <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <span className="text-caption text-charcoal/65">סיבת תיקון (אופציונלי)</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="למשל: שכח להחתים יציאה"
                  className="border border-warm-gray-light bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                />
              </label>
            )}
            <div className="flex gap-2 pb-px">
              <button
                type="submit"
                disabled={busy}
                className="bg-accent text-bone px-4 py-1.5 text-xs font-semibold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {busy ? <><Loader2 size={12} className="animate-spin" /> שומר…</> : "שמור"}
              </button>
              <button
                type="button"
                onClick={p.onCancel}
                disabled={busy}
                className="border border-charcoal/15 text-charcoal/70 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
          {err && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle size={12} /> {err}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}
