"use client";

/**
 * ScheduleTab — weekly worker-schedule view (PR 3/4: per-cell edit).
 *
 * Container that owns:
 *   • the displayed week (state: `sunday` YYYY-MM-DD)
 *   • the GET /api/admin/schedule round-trip per week
 *   • the AssignCellDialog state (which cell is being edited)
 *   • optimistic-update of the schedule array
 *
 * Edit flow:
 *   1. Tap a non-vacation cell → onCellTap fires → dialog opens with
 *      that cell's current value pre-highlighted.
 *   2. Pick a project / manual / "ללא שיבוץ" → optimistic update
 *      patches `data.schedule` immediately → POST or DELETE fires.
 *   3. On server error → roll back to the pre-pick snapshot + alert.
 *
 * PR 4 will add "apply this site to the whole week" on top of this.
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { getSundayLocal } from "../../../../lib/israel-week";
import type { ScheduleAssignment, ScheduleCell } from "../../../../lib/schedule-state";
import WeekPicker from "../shared/WeekPicker";
import ScheduleTable from "../shared/ScheduleTable";
import AssignCellDialog, { type CellPick } from "../shared/AssignCellDialog";

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

interface DialogState {
  staffId: string;
  date: string;
  current: ScheduleCell | null;
}

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"] as const;

function dayLabelFromDate(date: string, days: string[]): string {
  const idx = days.indexOf(date);
  const heDay = idx >= 0 ? HE_DAYS[idx] : "";
  const [, m, d] = date.split("-");
  return heDay ? `יום ${heDay} ${parseInt(d)}.${parseInt(m)}` : date;
}

export default function ScheduleTab() {
  const [sunday,  setSunday]  = useState<string>(() => getSundayLocal(new Date()));
  const [data,    setData]    = useState<PayloadShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [dialog,  setDialog]  = useState<DialogState | null>(null);

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
  // Optimistic update: mutate data.schedule in place (returning a new array)
  // BEFORE the network round-trip. Roll back on error so the UI doesn't
  // sit on a lie when the server rejects.
  const applyPick = useCallback(async (pick: CellPick) => {
    if (!data || !dialog) return;
    const { staffId, date } = dialog;
    const before = data.schedule;
    const others = before.filter((r) => !(r.staff_id === staffId && r.date === date));
    setDialog(null);

    if (pick.kind === "clear") {
      // Optimistic delete: drop the cell row immediately.
      setData({ ...data, schedule: others });
      try {
        const res = await fetch("/api/admin/schedule", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staff_id: staffId, date }),
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

    // Real or manual — replace any existing row for (staffId, date) with
    // an optimistic placeholder that has an "optimistic-…" id so React's
    // key tracking stays stable. Server response replaces it on success.
    const optimisticRow: ScheduleAssignment = {
      id:           "optimistic-" + staffId + "-" + date,
      staff_id:     staffId,
      date,
      project_id:   pick.kind === "real"   ? pick.id   : null,
      project_name: pick.kind === "manual" ? pick.name : null,
    };
    setData({ ...data, schedule: [...others, optimisticRow] });

    const body =
      pick.kind === "real"
        ? { staff_id: staffId, date, project_id:   pick.id }
        : { staff_id: staffId, date, project_name: pick.name };

    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שמירת השיבוץ נכשלה: ${b.error ?? res.status}`);
        setData({ ...data, schedule: before });
        return;
      }
      const { assignment } = (await res.json()) as { assignment: ScheduleAssignment };
      // Swap the optimistic row for the real one from the server.
      setData((prev) =>
        prev
          ? { ...prev, schedule: [...others, assignment] }
          : prev,
      );
    } catch {
      alert("שגיאת רשת — נסה שוב.");
      setData({ ...data, schedule: before });
    }
  }, [data, dialog]);

  return (
    <div className="space-y-3">
      <WeekPicker sunday={sunday} onChange={setSunday} />

      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-xs text-charcoal/70 leading-snug">
          לחץ על תא כדי לשבץ עובד לאתר באותו יום. ימי חופש נעולים.
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

      {!loading && !error && data && (
        <ScheduleTable
          workers={data.workers}
          projects={data.projects}
          manualProjects={data.manual_projects}
          schedule={data.schedule}
          vacations={data.vacations}
          days={data.days}
          onCellTap={({ staffId, date, current }) => setDialog({ staffId, date, current })}
        />
      )}

      {dialog && data && (
        <AssignCellDialog
          open={!!dialog}
          workerName={data.workers.find((w) => w.id === dialog.staffId)?.name ?? "—"}
          dayLabel={dayLabelFromDate(dialog.date, data.days)}
          projects={data.projects}
          manualProjects={data.manual_projects}
          currentProjectId={dialog.current?.projectId}
          currentProjectName={dialog.current?.projectName}
          onPick={applyPick}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
