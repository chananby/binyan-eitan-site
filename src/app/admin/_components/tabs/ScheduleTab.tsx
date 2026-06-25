"use client";

/**
 * ScheduleTab — weekly worker-schedule view (cell edit + temp workers).
 *
 * Container that owns:
 *   • the displayed week (state: `sunday` YYYY-MM-DD)
 *   • the GET /api/admin/schedule round-trip per week
 *   • the AssignCellDialog state (which cell is being edited)
 *   • optimistic-update of the schedule array (handles both
 *     registered staff AND temp_name rows uniformly via WorkerKey)
 *
 * Temp-worker flow:
 *   1. Admin opens the "+ הוסף פועל יומי" form, fills name + day +
 *      site, submits → POST creates one schedule_assignments row.
 *   2. Server replies → we reload the week → ScheduleTable's temp
 *      section picks up the new name from distinctTempWorkers.
 *   3. The temp survives refresh because the row is in DB. There is
 *      no "empty temp worker" placeholder concept on the client.
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw, Users, Building2 } from "lucide-react";
import { getSundayLocal } from "../../../../lib/israel-week";
import type {
  ScheduleAssignment,
  ScheduleCell,
  WorkerKey,
} from "../../../../lib/schedule-state";
import { workerKeyString } from "../../../../lib/schedule-state";
import WeekPicker from "../shared/WeekPicker";
import ScheduleTable from "../shared/ScheduleTable";
import ScheduleByProjectTable from "../shared/ScheduleByProjectTable";
import AssignCellDialog, { type CellPick } from "../shared/AssignCellDialog";
import AddTempWorkerForm from "../shared/AddTempWorkerForm";

type View = "worker" | "site";

interface WorkerRef       { id: string; name: string; role?: string | null; label?: string | null }
interface ProjectRef      { id: string; name: string; status?: string | null }
interface ManualProjectRef { id: string; name: string }
interface VacationRow     { staff_id: string; date: string; half_day: boolean }

interface PayloadShape {
  week:            string;
  days:            string[];
  schedule:        ScheduleAssignment[];
  workers:         WorkerRef[];
  projects:        ProjectRef[];
  manual_projects: ManualProjectRef[];
  vacations:       VacationRow[];
}

/** The picker opens either for one cell (single day) or for an
 *  apply-week quick-fill. The cell shape carries the date being
 *  edited; the week shape skips dates entirely — the API computes
 *  them from week_start. */
type DialogState =
  | {
      mode: "cell";
      worker: WorkerKey;
      workerName: string;
      date: string;
      current: ScheduleCell | null;
    }
  | {
      mode: "week";
      worker: WorkerKey;
      workerName: string;
    };

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"] as const;

function dayLabelFromDate(date: string, days: string[]): string {
  const idx = days.indexOf(date);
  const heDay = idx >= 0 ? HE_DAYS[idx] : "";
  const [, m, d] = date.split("-");
  return heDay ? `יום ${heDay} ${parseInt(d)}.${parseInt(m)}` : date;
}

/** Drop any row matching the (worker, date) key — used by optimistic
 *  state mutations so both staff and temp rows are removed the same way. */
function removeCellRow(
  rows: ScheduleAssignment[],
  worker: WorkerKey,
  date: string,
): ScheduleAssignment[] {
  return rows.filter((r) => {
    if (r.date !== date) return true;
    if (worker.kind === "staff") return r.staff_id !== worker.id;
    return r.temp_name !== worker.name;
  });
}

export default function ScheduleTab() {
  const [sunday,  setSunday]  = useState<string>(() => getSundayLocal(new Date()));
  const [data,    setData]    = useState<PayloadShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [dialog,  setDialog]  = useState<DialogState | null>(null);
  // Axis toggle — worker (default) or site. Resets to "worker" on a
  // hard reload (no localStorage on purpose; the by-site view is for
  // glances, not the working mode).
  const [view,    setView]    = useState<View>("worker");

  const load = useCallback(async (week: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/schedule?week=${week}`, { cache: "no-store" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(`טעינת התכנון נכשלה: ${b.error ?? res.status}`);
        return;
      }
      const d = (await res.json()) as PayloadShape;
      setData(d);
    } catch {
      setError("שגיאת רשת — נסה שוב.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(sunday); }, [sunday, load]);

  // ── Edit handlers ────────────────────────────────────────────────────────
  const applyPick = useCallback(async (pick: CellPick) => {
    if (!data || !dialog) return;
    if (dialog.mode === "week") {
      await applyWeekPick(pick);
      return;
    }
    const { worker, date } = dialog;
    const before = data.schedule;
    const others = removeCellRow(before, worker, date);
    setDialog(null);

    // Body builder — the route accepts either {staff_id|temp_name} +
    // either {project_id|project_name}.
    const workerBody = worker.kind === "staff"
      ? { staff_id:  worker.id }
      : { temp_name: worker.name };

    if (pick.kind === "clear") {
      setData({ ...data, schedule: others });
      try {
        const res = await fetch("/api/admin/schedule", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...workerBody, date }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          alert(`ניקוי השיבוץ נכשל: ${b.error ?? res.status}`);
          setData({ ...data, schedule: before });
        }
      } catch {
        alert("שגיאת רשת — נסה שוב.");
        setData({ ...data, schedule: before });
      }
      return;
    }

    const optimisticRow: ScheduleAssignment = {
      id:           "optimistic-" + workerKeyString(worker) + "-" + date,
      staff_id:     worker.kind === "staff" ? worker.id   : null,
      temp_name:    worker.kind === "temp"  ? worker.name : null,
      date,
      project_id:   pick.kind === "real"   ? pick.id   : null,
      project_name: pick.kind === "manual" ? pick.name : null,
    };
    setData({ ...data, schedule: [...others, optimisticRow] });

    const projectBody = pick.kind === "real"
      ? { project_id:   pick.id }
      : { project_name: pick.name };

    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workerBody, date, ...projectBody }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שמירת השיבוץ נכשלה: ${b.error ?? res.status}`);
        setData({ ...data, schedule: before });
        return;
      }
      const { assignment } = (await res.json()) as { assignment: ScheduleAssignment };
      setData((prev) => prev ? { ...prev, schedule: [...others, assignment] } : prev);
    } catch {
      alert("שגיאת רשת — נסה שוב.");
      setData({ ...data, schedule: before });
    }
  }, [data, dialog]);

  // ── Apply-week handlers ───────────────────────────────────────────────────
  // Quick-fill the whole week (or clear it) for one worker. Optimistic
  // update first (drop the 5 cells, add 5 new — or just drop), POST/
  // DELETE to /api/admin/schedule/apply-week, swap optimistic rows for
  // the server's real rows on success. Vacation days are skipped on the
  // server too — the client mirrors that so the optimistic preview
  // matches what we'll eventually see.
  const applyWeekPick = useCallback(async (pick: CellPick) => {
    if (!data || !dialog || dialog.mode !== "week") return;
    const { worker } = dialog;
    setDialog(null);

    const before = data.schedule;
    // Drop every existing schedule row for this worker in the visible
    // week so the optimistic state starts from a clean slate.
    const inWeek = new Set(data.days);
    const others = before.filter((r) => {
      if (!inWeek.has(r.date)) return true;
      if (worker.kind === "staff") return r.staff_id  !== worker.id;
      return                              r.temp_name !== worker.name;
    });

    const workerBody = worker.kind === "staff"
      ? { staff_id:  worker.id }
      : { temp_name: worker.name };
    const body: Record<string, unknown> = { ...workerBody, week_start: sunday };

    if (pick.kind === "clear") {
      // No optimistic insert — just drop, then DELETE on the server.
      setData({ ...data, schedule: others });
      try {
        const res = await fetch("/api/admin/schedule/apply-week", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          alert(`ניקוי השבוע נכשל: ${b.error ?? res.status}`);
          setData({ ...data, schedule: before });
        }
      } catch {
        alert("שגיאת רשת — נסה שוב.");
        setData({ ...data, schedule: before });
      }
      return;
    }

    // Real or manual: build 5 optimistic rows, skipping vacation days
    // (only staff have vacations — temps have no payroll trail).
    const vacationDates = worker.kind === "staff"
      ? new Set(data.vacations.filter((v) => v.staff_id === worker.id).map((v) => v.date))
      : new Set<string>();
    const targetDates = data.days.filter((d) => !vacationDates.has(d));

    const optimisticRows: ScheduleAssignment[] = targetDates.map((date) => ({
      id:           "optimistic-week-" + workerKeyString(worker) + "-" + date,
      staff_id:     worker.kind === "staff" ? worker.id   : null,
      temp_name:    worker.kind === "temp"  ? worker.name : null,
      date,
      project_id:   pick.kind === "real"   ? pick.id   : null,
      project_name: pick.kind === "manual" ? pick.name : null,
    }));
    setData({ ...data, schedule: [...others, ...optimisticRows] });

    if (pick.kind === "real")   body.project_id   = pick.id;
    if (pick.kind === "manual") body.project_name = pick.name;

    try {
      const res = await fetch("/api/admin/schedule/apply-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`החלה על כל השבוע נכשלה: ${b.error ?? res.status}`);
        setData({ ...data, schedule: before });
        return;
      }
      const { assignments } = (await res.json()) as { assignments: ScheduleAssignment[] };
      // Swap our optimistic rows for the server-returned rows (real
      // ids + updated_at). `others` is identical — no overlap with
      // the new rows by construction.
      setData((prev) => prev ? { ...prev, schedule: [...others, ...assignments] } : prev);
    } catch {
      alert("שגיאת רשת — נסה שוב.");
      setData({ ...data, schedule: before });
    }
  }, [data, dialog, sunday]);

  // Add-temp form handler. Returns ok/error so the form can show a
  // status message. Real work: POST one row + reload the week.
  const handleAddTemp = useCallback(async (input: {
    name: string;
    date: string;
    project_id?: string;
    project_name?: string;
  }): Promise<{ ok: true } | { ok: false; error?: string }> => {
    const body: Record<string, string> = { temp_name: input.name, date: input.date };
    if (input.project_id)   body.project_id   = input.project_id;
    if (input.project_name) body.project_name = input.project_name;

    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        return { ok: false, error: b.error ?? String(res.status) };
      }
      await load(sunday); // refresh so distinctTempWorkers picks up the new name
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }, [load, sunday]);

  // Build "ראשון 12.7"-style labels for the add-temp form's day picker.
  const dayLabels = (data?.days ?? []).map((d, i) => {
    const [, m, dd] = d.split("-");
    return `${HE_DAYS[i] ?? ""} ${parseInt(dd)}.${parseInt(m)}`;
  });

  return (
    <div className="space-y-3">
      <WeekPicker sunday={sunday} onChange={setSunday} />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Segmented toggle: by-worker (default, editable) ↔ by-site
            (read-only, glance view). State is local — no localStorage. */}
        <div className="inline-flex border border-warm-gray-light rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setView("worker")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "worker"
                ? "bg-accent text-bone"
                : "bg-white text-charcoal/70 hover:bg-bone"
            }`}
            aria-pressed={view === "worker"}
          >
            <Users size={12} strokeWidth={1.5} /> לפי עובד
          </button>
          <button
            type="button"
            onClick={() => setView("site")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-s border-warm-gray-light ${
              view === "site"
                ? "bg-accent text-bone"
                : "bg-white text-charcoal/70 hover:bg-bone"
            }`}
            aria-pressed={view === "site"}
          >
            <Building2 size={12} strokeWidth={1.5} /> לפי אתר
          </button>
        </div>

        <p className="font-body text-xs text-charcoal/70 leading-snug flex-1 min-w-0">
          {view === "worker"
            ? "לחץ על תא כדי לשבץ עובד לאתר באותו יום. ימי חופש נעולים."
            : "תצוגה לפי אתר — צפייה בלבד. עריכה במבט 'לפי עובד'."}
        </p>

        <button
          type="button"
          onClick={() => load(sunday)}
          className="flex items-center gap-1 text-xs text-charcoal/65 hover:text-accent shrink-0"
        >
          <RefreshCw size={12} /> רענן
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-charcoal/65">
          <Loader2 size={18} className="animate-spin" /> טוען תכנון…
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertTriangle size={32} className="text-amber-500" />
          <p className="text-sm text-charcoal/70">{error}</p>
          <button
            type="button"
            onClick={() => load(sunday)}
            className="flex items-center gap-1.5 border border-accent/40 text-accent rounded px-3 py-1.5 text-sm hover:bg-accent/10"
          >
            <RefreshCw size={13} /> נסה שוב
          </button>
        </div>
      )}

      {!loading && !error && data && view === "worker" && (
        <>
          <ScheduleTable
            workers={data.workers}
            projects={data.projects}
            manualProjects={data.manual_projects}
            schedule={data.schedule}
            vacations={data.vacations}
            days={data.days}
            onCellTap={({ worker, date, current }) => {
              const workerName =
                worker.kind === "staff"
                  ? data.workers.find((w) => w.id === worker.id)?.name ?? "—"
                  : worker.name;
              setDialog({ mode: "cell", worker, workerName, date, current });
            }}
            onApplyWeek={(worker) => {
              const workerName =
                worker.kind === "staff"
                  ? data.workers.find((w) => w.id === worker.id)?.name ?? "—"
                  : worker.name;
              setDialog({ mode: "week", worker, workerName });
            }}
          />
          <AddTempWorkerForm
            days={data.days}
            dayLabels={dayLabels}
            projects={data.projects}
            manualProjects={data.manual_projects}
            onAdd={handleAddTemp}
          />
        </>
      )}

      {!loading && !error && data && view === "site" && (
        <ScheduleByProjectTable
          workers={data.workers}
          projects={data.projects}
          manualProjects={data.manual_projects}
          schedule={data.schedule}
          days={data.days}
        />
      )}

      {dialog && data && (
        <AssignCellDialog
          open={!!dialog}
          workerName={dialog.workerName}
          dayLabel={
            dialog.mode === "week"
              ? "כל השבוע"
              : dayLabelFromDate(dialog.date, data.days)
          }
          projects={data.projects}
          manualProjects={data.manual_projects}
          // No "current" highlight in week mode — cells across the
          // week may have different sites, so there's nothing single
          // to mark as נוכחי. Cell mode keeps the existing behaviour.
          currentProjectId={dialog.mode === "cell" ? dialog.current?.projectId : undefined}
          currentProjectName={dialog.mode === "cell" ? dialog.current?.projectName : undefined}
          onPick={applyPick}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
