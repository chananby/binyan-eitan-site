"use client";

/**
 * ScheduleTab — read-only weekly worker-schedule view (PR 2/4).
 *
 * Container that owns:
 *   • the displayed week (state: `sunday` YYYY-MM-DD)
 *   • the GET /api/admin/schedule round-trip per week
 *   • loading / error / empty surfaces
 *
 * The actual rendering is split across WeekPicker (week navigation)
 * and ScheduleTable (the grid itself). PR 3 will add per-cell edit on
 * top of this same container; PR 4 will add "apply to whole week".
 *
 * Defaults to the current Israeli-week Sunday so admins land on
 * "this week" without picking. Reload is automatic on `sunday` change.
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { getSundayLocal } from "../../../../lib/israel-week";
import type { ScheduleAssignment } from "../../../../lib/schedule-state";
import WeekPicker from "../shared/WeekPicker";
import ScheduleTable from "../shared/ScheduleTable";

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

export default function ScheduleTab() {
  const [sunday,  setSunday]  = useState<string>(() => getSundayLocal(new Date()));
  const [data,    setData]    = useState<PayloadShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

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

  // Refetch on every week change. Cheap call (5 small queries in
  // parallel) so no debouncing needed.
  useEffect(() => {
    load(sunday);
  }, [sunday, load]);

  return (
    <div className="space-y-3">
      <WeekPicker sunday={sunday} onChange={setSunday} />

      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-xs text-charcoal/70 leading-snug">
          תכנון שיבוץ עובדים לשבוע — תצוגה בלבד בשלב זה. עריכה בעדכון הבא.
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
        />
      )}
    </div>
  );
}
