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

import { Building2, UserRound, CalendarRange } from "lucide-react";
import {
  type ScheduleAssignment,
  type ScheduleCell,
  type WorkerKey,
  groupBySchedule,
  cellAt,
  distinctTempWorkers,
  isUnassignedWorkday,
} from "../../../../lib/schedule-state";

interface WorkerRef { id: string; name: string; role?: string | null; label?: string | null }
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
  /** Quick-fill: open the same dialog in "whole week" mode for the
   *  given worker. The parent handles the apply-week round-trip and
   *  optimistic update. Without this prop, the row-level button is
   *  hidden — keeps the component usable in read-only contexts. */
  onApplyWeek?: (worker: WorkerKey) => void;
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
  workers, projects, schedule, vacations, days, onCellTap, onApplyWeek,
}: Props) {
  const grouped      = groupBySchedule(schedule);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const vacationKeys = new Set(vacations.map((v) => v.staff_id + "|" + v.date));
  const tempNames    = distinctTempWorkers(schedule);

  if (workers.length === 0 && tempNames.length === 0) {
    return (
      <div className="bg-white border border-charcoal/30 rounded-md p-6 text-center">
        <p className="text-content text-charcoal/70">אין עובדים פעילים להצגה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-charcoal/30 rounded-md overflow-hidden">
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
        {/* WCAG-readable defaults set here propagate to all content:
            • table-level text-sm = 14px floor for the readable-content
              tier; cells that hold auxiliary text re-tier to text-xs.
            • min-w bumped to 840 so 14px content doesn't crush the
              day columns into wrap-everything mode. */}
        <table className="w-full text-sm border-collapse table-fixed min-w-[840px]">
          {/* Worker name column is FIRST in HTML order so RTL renders it
              against the right edge — where a Hebrew reader's eye starts.
              sticky start-0 pins it there during horizontal scroll. */}
          <colgroup>
            <col className="w-[260px]" />
            {days.map((d) => <col key={d} />)}
          </colgroup>
          <thead className="bg-bone">
            <tr>
              <th className="sticky start-0 bg-bone font-semibold px-3 py-2 border border-charcoal/30 text-charcoal/80 text-start">
                עובד
              </th>
              {days.map((d, i) => (
                <th
                  key={d}
                  className="font-semibold px-2 py-2 border border-charcoal/30 text-charcoal/80 whitespace-nowrap text-center"
                >
                  <div className="leading-tight">
                    <div>{HE_DAYS[i]}</div>
                    {/* Date is auxiliary — tiered down to text-xs (12px)
                        with text-charcoal/75 to stay above AA on bone. */}
                    <div className="text-micro text-charcoal/75 tabular-nums" dir="ltr">{dayHeader(d)}</div>
                  </div>
                </th>
              ))}
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
                role={w.role ?? null}
                days={days}
                grouped={grouped}
                projectsById={projectsById}
                vacationKeys={vacationKeys}
                vacationStaffId={w.id}
                onCellTap={onCellTap}
                onApplyWeek={onApplyWeek}
              />
            ))}

            {tempNames.length > 0 && (
              <>
                {/* Section header — sticky name column on the right
                    carries the label (so it's visible during day-scroll),
                    days column is a spanned filler with matching tint. */}
                <tr>
                  {/* Section label is auxiliary — text-xs (12px) with
                      amber-800 on amber-50 keeps it above AA without
                      stealing the eye from the row content below. */}
                  <td className="sticky start-0 bg-amber-50/60 border border-charcoal/30 px-3 py-1.5 text-micro font-semibold text-amber-800 uppercase tracking-wide text-start">
                    פועלים יומיים ({tempNames.length})
                  </td>
                  <td
                    colSpan={days.length}
                    className="bg-amber-50/60 border border-charcoal/30"
                  />
                </tr>
                {tempNames.map((name) => (
                  <WorkerRow
                    key={"t-" + name}
                    workerKey={{ kind: "temp", name }}
                    displayName={name}
                    tag={null}
                    isTemp={true}
                    role={null}
                    days={days}
                    grouped={grouped}
                    projectsById={projectsById}
                    vacationKeys={vacationKeys}
                    vacationStaffId={null}
                    onCellTap={onCellTap}
                    onApplyWeek={onApplyWeek}
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
  /** staff.role — drives the foreman colour (role==='ממונה'). null for
   *  temp rows. The GET filter restricts to 'עובד'/'ממונה' so we treat
   *  any non-foreman value as a regular worker. */
  role: string | null;
  days: string[];
  grouped: ReadonlyMap<string, ReadonlyMap<string, ScheduleCell>>;
  projectsById: ReadonlyMap<string, ProjectRef>;
  vacationKeys: ReadonlySet<string>;
  /** Only meaningful for staff rows — temps don't appear in vacation_days. */
  vacationStaffId: string | null;
  onCellTap?: Props["onCellTap"];
  onApplyWeek?: Props["onApplyWeek"];
}

function WorkerRow(p: RowProps) {
  const isForeman = !p.isTemp && p.role === "ממונה";
  // Foremen carry a soft sky tint on the whole row (visible on day cells
  // via inherited tr bg) so they scan as a distinct band. The icon +
  // "מנהל" badge in the name cell remain as explicit markers.
  const rowToneClass = isForeman ? "bg-sky-50" : "";
  return (
    <tr className={`${rowToneClass} hover:bg-bone/40 transition-colors`}>
      <td
        className={`sticky start-0 px-3 py-2 border border-charcoal/30 text-start ${
          p.isTemp    ? "bg-amber-50/50"
          : isForeman ? "bg-sky-100"
          :             "bg-white"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Icons bumped 11 → 14 to track the new 14px label so they
              register as part of the line, not specks beside it. The
              foreman/temp icon colours stay at their semantic tone but
              tightened to /75+ where applicable (above 3:1). */}
          <UserRound
            size={14}
            strokeWidth={2}
            className={
              p.isTemp    ? "text-amber-600 shrink-0"
              : isForeman ? "text-sky-700 shrink-0"
              :             "text-charcoal/75 shrink-0"
            }
          />
          <span className="font-semibold text-charcoal truncate">{p.displayName}</span>
          {/* Badges promoted from 9.6px to text-xs (12px) — auxiliary
              tier minimum. The colour pairs (amber-100/amber-800,
              sky-200/sky-900, charcoal-06/charcoal-80) all clear AA. */}
          {p.isTemp && (
            <span className="font-body text-micro text-amber-800 px-1.5 py-0.5 rounded bg-amber-100 shrink-0">
              ידני
            </span>
          )}
          {isForeman && (
            <span className="font-body text-micro font-bold text-sky-900 px-1.5 py-0.5 rounded bg-sky-200 shrink-0">
              מנהל
            </span>
          )}
          {p.tag && (
            <span className="font-body text-micro text-charcoal/80 px-1.5 py-0.5 rounded bg-charcoal/[0.06] shrink-0 max-w-[80px] truncate">
              {p.tag}
            </span>
          )}
          {p.onApplyWeek && (
            <button
              type="button"
              onClick={() => p.onApplyWeek!(p.workerKey)}
              title={`החל על כל השבוע · ${p.displayName}`}
              aria-label={`החל על כל השבוע · ${p.displayName}`}
              className="ms-auto text-charcoal/65 hover:text-accent transition-colors shrink-0 p-0.5"
            >
              <CalendarRange size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </td>
      {p.days.map((d) => {
        const cell = cellAt(p.grouped, p.workerKey, d);
        const onVacation =
          p.vacationStaffId !== null &&
          p.vacationKeys.has(p.vacationStaffId + "|" + d);
        const display = cellDisplay(cell, p.projectsById);
        // "Unassigned workday" highlight — only meaningful for staff
        // rows of role='עובד'; the helper short-circuits anyone else.
        // We pass the synthesized {id, role} shape it expects.
        const isUnassigned = !onVacation && !p.isTemp && isUnassignedWorkday(
          { id: p.vacationStaffId ?? "", role: p.role },
          d,
          p.grouped,
          p.vacationKeys,
        );
        const cellBorderClass = isUnassigned
          ? "border border-red-300"
          : "border border-charcoal/30";
        const cellBgClass = isUnassigned ? "bg-red-50" : "";
        return (
          <td
            key={d}
            className={`${cellBorderClass} ${cellBgClass} text-center align-middle p-0 overflow-hidden`}
          >
            {onVacation ? (
              <div className="px-2 py-2">
                <span className="text-micro text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
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
    </tr>
  );
}

function CellContent({ display, cell }: { display: string | null; cell: ScheduleCell | null }) {
  if (!display) {
    // Em-dash is decorative — exempt from the 4.5:1 content rule.
    // /35 keeps it visible-enough without competing with assigned cells.
    return <span className="text-charcoal/35" aria-label="ללא שיבוץ">—</span>;
  }
  // Site name is content. text-sm (14px) + text-charcoal full = 14:1
  // contrast on white. Icon 14 + strokeWidth 2 reads as part of the
  // line. accent-dark (#7A6451) on white = ~4.7:1, amber-600 on white
  // = ~3.4:1 — both ≥3:1 for the icon tier.
  return (
    <span
      className="inline-flex items-center gap-1.5 text-content text-charcoal font-semibold truncate max-w-full"
      title={display}
    >
      <Building2
        size={14}
        strokeWidth={2}
        className={cell?.projectName ? "text-amber-600 shrink-0" : "text-accent-dark shrink-0"}
      />
      <span className="truncate">{display}</span>
    </span>
  );
}
