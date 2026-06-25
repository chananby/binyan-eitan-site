"use client";

/**
 * ScheduleTable — weekly schedule grid.
 *
 *   Rows  = workers in two sections:
 *           (1) registered staff (filtered like the live board)
 *           (2) "פועלים יומיים" — temp_name rows surfaced from
 *               the schedule itself (no separate registry table —
 *               a temp worker exists in the world by having at
 *               least one row in schedule_assignments, just like a
 *               worker_name on the live board).
 *   Cols  = 5 days of the Israeli construction week (Sun→Thu).
 *   Cells = the worker's planned site, "—" when nothing is
 *           planned, "🌴 חופש" when vacation_days covers it.
 *
 * Cells are <button>s when onCellTap is wired; vacation cells stay
 * inert. The temp section uses an amber accent (same palette as the
 * live board's "ידני" badge) so the type is visible at a glance.
 *
 * Refresh-survival of a "new" temp worker: the Add-temp form
 * commits at least one (date, site) to the database before the row
 * can appear here, so distinctTempWorkers picks it up on the next
 * reload and the temp survives a refresh by virtue of being in DB.
 * There is no client-only placeholder concept — that mirrors how a
 * worker_name on the live board only exists once it's attached to
 * a board_assignments row.
 */

import { Building2, UserRound } from "lucide-react";
import {
  type ScheduleAssignment,
  type ScheduleCell,
  type WorkerKey,
  groupBySchedule,
  cellAt,
  distinctTempWorkers,
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
  /** Tap on a non-vacation cell. Worker discriminated as staff/temp so
   *  the parent can branch the POST body. */
  onCellTap?: (cell: { worker: WorkerKey; date: string; current: ScheduleCell | null }) => void;
}

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"] as const;

function dayHeader(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${parseInt(d)}.${parseInt(m)}`;
}

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
  const grouped      = groupBySchedule(schedule);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const vacationKeys = new Set(vacations.map((v) => v.staff_id + "|" + v.date));
  const tempNames    = distinctTempWorkers(schedule);

  if (workers.length === 0 && tempNames.length === 0) {
    return (
      <div className="bg-white border border-warm-gray-light rounded-md p-6 text-center">
        <p className="text-sm text-charcoal/70">אין עובדים פעילים להצגה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-warm-gray-light rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        {/* table-fixed + colgroup: column widths are decided up front
            instead of being grown by the longest site name in each
            column. The day columns share the leftover space equally;
            the site name in any cell now actually truncates with an
            ellipsis (its tooltip carries the full text). min-w-[600px]
            on the table preserves the previous mobile overflow-scroll
            ergonomics — on phones the table is wider than the screen
            and the sticky-end name column stays visible while the days
            scroll. */}
        <table className="w-full text-xs border-collapse table-fixed min-w-[600px]">
          <colgroup>
            {days.map((d) => <col key={d} />)}
            <col className="w-[120px]" />
          </colgroup>
          <thead className="bg-bone">
            <tr>
              {days.map((d, i) => (
                <th
                  key={d}
                  className="font-semibold px-2 py-2 border border-warm-gray-light text-charcoal/65 whitespace-nowrap text-center"
                >
                  <div className="leading-tight">
                    <div>{HE_DAYS[i]}</div>
                    <div className="text-[0.65rem] text-charcoal/50 tabular-nums" dir="ltr">{dayHeader(d)}</div>
                  </div>
                </th>
              ))}
              <th className="sticky end-0 bg-bone font-semibold px-3 py-2 border border-warm-gray-light text-charcoal/65 text-start">
                עובד
              </th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <WorkerRow
                key={"s-" + w.id}
                workerKey={{ kind: "staff", id: w.id }}
                displayName={w.name}
                tag={w.label ?? null}
                isTemp={false}
                days={days}
                grouped={grouped}
                projectsById={projectsById}
                vacationKeys={vacationKeys}
                vacationStaffId={w.id}
                onCellTap={onCellTap}
              />
            ))}

            {tempNames.length > 0 && (
              <>
                {/* Section header — spans full row width. The sticky cell
                    background is matched to bone so it doesn't break the
                    pinned-end column visually. */}
                <tr>
                  <td
                    colSpan={days.length}
                    className="bg-amber-50/60 border border-warm-gray-light px-3 py-1.5 text-[0.7rem] font-semibold text-amber-700 uppercase tracking-wide"
                  >
                    פועלים יומיים ({tempNames.length})
                  </td>
                  <td className="sticky end-0 bg-amber-50/60 border border-warm-gray-light" />
                </tr>
                {tempNames.map((name) => (
                  <WorkerRow
                    key={"t-" + name}
                    workerKey={{ kind: "temp", name }}
                    displayName={name}
                    tag={null}
                    isTemp={true}
                    days={days}
                    grouped={grouped}
                    projectsById={projectsById}
                    vacationKeys={vacationKeys}
                    vacationStaffId={null}
                    onCellTap={onCellTap}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── WorkerRow ────────────────────────────────────────────────────────────────
// One row of the grid. Lives at module scope so a re-render of the
// table doesn't recreate the component type and remount every cell.

interface RowProps {
  workerKey: WorkerKey;
  displayName: string;
  tag: string | null;
  isTemp: boolean;
  days: string[];
  grouped: ReadonlyMap<string, ReadonlyMap<string, ScheduleCell>>;
  projectsById: ReadonlyMap<string, ProjectRef>;
  vacationKeys: ReadonlySet<string>;
  /** Only meaningful for staff rows — temps don't appear in vacation_days. */
  vacationStaffId: string | null;
  onCellTap?: Props["onCellTap"];
}

function WorkerRow(p: RowProps) {
  return (
    <tr className="hover:bg-bone/40 transition-colors">
      {p.days.map((d) => {
        const cell = cellAt(p.grouped, p.workerKey, d);
        const onVacation =
          p.vacationStaffId !== null &&
          p.vacationKeys.has(p.vacationStaffId + "|" + d);
        const display = cellDisplay(cell, p.projectsById);
        return (
          <td
            key={d}
            className="border border-warm-gray-light text-center align-middle p-0 overflow-hidden"
          >
            {onVacation ? (
              <div className="px-2 py-2">
                <span className="text-[0.7rem] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  🌴 חופש
                </span>
              </div>
            ) : p.onCellTap ? (
              <button
                type="button"
                onClick={() => p.onCellTap!({ worker: p.workerKey, date: d, current: cell })}
                className="w-full h-full min-h-[36px] px-2 py-2 hover:bg-accent/[0.06] focus:outline-none focus:bg-accent/[0.08] transition-colors text-center"
                aria-label={`שיבוץ ${p.displayName} ליום ${d}`}
              >
                <CellContent display={display} cell={cell} />
              </button>
            ) : (
              <div className="px-2 py-2">
                <CellContent display={display} cell={cell} />
              </div>
            )}
          </td>
        );
      })}
      <td
        className={`sticky end-0 px-3 py-2 border border-warm-gray-light text-start ${
          p.isTemp ? "bg-amber-50/50" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <UserRound
            size={11}
            strokeWidth={1.5}
            className={p.isTemp ? "text-amber-500 shrink-0" : "text-charcoal/40 shrink-0"}
          />
          <span className="font-semibold text-charcoal truncate">{p.displayName}</span>
          {p.isTemp && (
            <span className="font-body text-[0.6rem] text-amber-700 px-1 py-0.5 rounded bg-amber-100 shrink-0">
              ידני
            </span>
          )}
          {p.tag && (
            <span className="font-body text-[0.6rem] text-charcoal/65 px-1 py-0.5 rounded bg-charcoal/[0.06] shrink-0 max-w-[70px] truncate">
              {p.tag}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function CellContent({ display, cell }: { display: string | null; cell: ScheduleCell | null }) {
  if (!display) {
    return <span className="text-charcoal/25" aria-label="ללא שיבוץ">—</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[0.7rem] text-charcoal font-semibold truncate max-w-full"
      title={display}
    >
      <Building2
        size={10}
        strokeWidth={1.5}
        className={cell?.projectName ? "text-amber-500 shrink-0" : "text-accent shrink-0"}
      />
      <span className="truncate">{display}</span>
    </span>
  );
}
