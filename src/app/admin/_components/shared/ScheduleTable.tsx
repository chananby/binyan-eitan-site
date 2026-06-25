"use client";

/**
 * ScheduleTable — read-only weekly schedule grid (PR 2/4).
 *
 *   Rows    = workers (active staff who pass the live board filter).
 *   Columns = 5 days of the Israeli construction week (Sun→Thu).
 *   Cells   = the worker's planned site that day, "—" when nothing is
 *             planned, "🌴 חופש" when a vacation_days row covers it.
 *
 * Mobile pattern follows PayrollTab: horizontal scroll via
 * `overflow-x-auto`, and the worker-name column is `sticky end-0` so
 * it stays visible while the days scroll. RTL — sticky-right for
 * us — uses logical CSS so the layout reads the same in both modes.
 *
 * PR 3 will turn the cell <td>s into <button>s; for now they're
 * inert text so the layout, sticky column, and lookups can be
 * validated in isolation.
 */

import { Building2, UserRound } from "lucide-react";
import {
  type ScheduleAssignment,
  type ScheduleCell,
  groupBySchedule,
  cellAt,
} from "../../../../lib/schedule-state";

interface WorkerRef { id: string; name: string; label?: string | null }
interface ProjectRef { id: string; name: string }
interface ManualProjectRef { id: string; name: string }
interface VacationRow { staff_id: string; date: string; half_day: boolean }

interface Props {
  workers: WorkerRef[];
  projects: ProjectRef[];
  manualProjects: ManualProjectRef[];
  schedule: ScheduleAssignment[];
  vacations: VacationRow[];
  /** The 5 dates of the displayed week (YYYY-MM-DD, ascending). */
  days: string[];
  /** Tap on a non-vacation cell — opens the AssignCellDialog in the
   *  parent. PR 3 wiring; the cell payload tells the parent enough to
   *  pre-select the current value. */
  onCellTap?: (cell: { staffId: string; date: string; current: ScheduleCell | null }) => void;
}

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"] as const;

/** "DD.M" for the column header. */
function dayHeader(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${parseInt(d)}.${parseInt(m)}`;
}

/** Display label for a cell. NULL when the cell is empty so the caller
 *  can render an em-dash instead. Real projects resolve through
 *  projectsById; manual projects carry their name verbatim. */
function cellDisplay(
  cell: ScheduleCell | null,
  projectsById: ReadonlyMap<string, ProjectRef>,
): string | null {
  if (!cell) return null;
  if (cell.projectId) {
    return projectsById.get(cell.projectId)?.name ?? "(לא ידוע)";
  }
  if (cell.projectName) return cell.projectName;
  return null;
}

export default function ScheduleTable({
  workers, projects, schedule, vacations, days, onCellTap,
}: Props) {
  const grouped     = groupBySchedule(schedule);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  // Vacation lookup: Set of "staff_id|date" so cell rendering is O(1).
  const vacationKeys = new Set(vacations.map((v) => v.staff_id + "|" + v.date));

  if (workers.length === 0) {
    return (
      <div className="bg-white border border-warm-gray-light rounded-md p-6 text-center">
        <p className="text-sm text-charcoal/70">אין עובדים פעילים להצגה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-warm-gray-light rounded-md overflow-hidden">
      {/* overflow-x-auto on a wrapper so the sticky-end column anchors
          inside the scroll container, not the page. Same pattern as
          PayrollTab. */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-bone">
            <tr>
              {days.map((d, i) => (
                <th
                  key={d}
                  className="font-semibold px-2 py-2 border border-warm-gray-light text-charcoal/65 whitespace-nowrap min-w-[88px] text-center"
                >
                  <div className="leading-tight">
                    <div>{HE_DAYS[i]}</div>
                    <div className="text-[0.65rem] text-charcoal/50 tabular-nums" dir="ltr">{dayHeader(d)}</div>
                  </div>
                </th>
              ))}
              {/* Worker name pinned to the end of the row (right in RTL,
                  left in LTR). Background must be opaque so cells under
                  it don't bleed through during horizontal scroll. */}
              <th className="sticky end-0 bg-bone font-semibold px-3 py-2 border border-warm-gray-light text-charcoal/65 text-start min-w-[140px]">
                עובד
              </th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className="hover:bg-bone/40 transition-colors">
                {days.map((d) => {
                  const cell = cellAt(grouped, w.id, d);
                  const onVacation = vacationKeys.has(w.id + "|" + d);
                  const display = cellDisplay(cell, projectsById);
                  // Vacation cells stay inert (read-only by design — the
                  // worker isn't available). Everything else is a button
                  // when the parent wired an onCellTap, otherwise a span.
                  return (
                    <td
                      key={d}
                      className="border border-warm-gray-light text-center align-middle min-w-[88px] p-0"
                    >
                      {onVacation ? (
                        <div className="px-2 py-2">
                          <span className="text-[0.7rem] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            🌴 חופש
                          </span>
                        </div>
                      ) : onCellTap ? (
                        <button
                          type="button"
                          onClick={() => onCellTap({ staffId: w.id, date: d, current: cell })}
                          className="w-full h-full min-h-[36px] px-2 py-2 hover:bg-accent/[0.06] focus:outline-none focus:bg-accent/[0.08] transition-colors text-center"
                          aria-label={`שיבוץ ${w.name} ליום ${d}`}
                        >
                          {display ? (
                            <span
                              className="inline-flex items-center gap-1 text-[0.7rem] text-charcoal font-semibold truncate max-w-full"
                              title={display}
                            >
                              <Building2 size={10} strokeWidth={1.5} className={cell?.projectName ? "text-amber-500 shrink-0" : "text-accent shrink-0"} />
                              <span className="truncate">{display}</span>
                            </span>
                          ) : (
                            <span className="text-charcoal/25">—</span>
                          )}
                        </button>
                      ) : (
                        <div className="px-2 py-2">
                          {display ? (
                            <span className="inline-flex items-center gap-1 text-[0.7rem] text-charcoal font-semibold truncate max-w-full" title={display}>
                              <Building2 size={10} strokeWidth={1.5} className="text-accent shrink-0" />
                              <span className="truncate">{display}</span>
                            </span>
                          ) : (
                            <span className="text-charcoal/25" aria-label="ללא שיבוץ">—</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="sticky end-0 bg-white px-3 py-2 border border-warm-gray-light text-start">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserRound size={11} strokeWidth={1.5} className="text-charcoal/40 shrink-0" />
                    <span className="font-semibold text-charcoal truncate">{w.name}</span>
                    {w.label && (
                      <span className="font-body text-[0.6rem] text-charcoal/65 px-1 py-0.5 rounded bg-charcoal/[0.06] shrink-0 max-w-[70px] truncate">
                        {w.label}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
