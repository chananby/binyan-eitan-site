"use client";

/**
 * ScheduleByProjectTable — "by-site" (transposed) view of the weekly
 * schedule. Same payload as ScheduleTable, axes flipped.
 *
 *   Rows  = projects in two groups:
 *           (1) every active project (always shown — empty cells mean
 *               "no-one is planned here that week", which is itself a
 *               useful signal)
 *           (2) manual project names that appear at least once in
 *               this week's schedule (free-text sites the admin
 *               typed into a cell)
 *   Cols  = the 5 days of the Israeli construction week (Sun→Thu)
 *   Cells = list of workers planned at this project on this day —
 *           a stack of compact chips. "—" when empty.
 *
 * Read-only in this view: clicking a chip does nothing. Edits stay
 * in the by-worker view so there's one canonical mutation surface;
 * we may revisit this once admins have lived with it.
 *
 * Same overflow-x-auto + sticky-end pattern as ScheduleTable: the
 * site-name column stays pinned while the days scroll.
 */

import { Building2, UserRound } from "lucide-react";
import {
  type ScheduleAssignment,
  type WorkerKey,
  type ProjectRef,
  groupByProjectDate,
  cellWorkers,
  projectKeyString,
} from "../../../../lib/schedule-state";

interface WorkerRef        { id: string; name: string; role?: string | null }
interface ProjectRefLite   { id: string; name: string }
interface ManualProjectRef { id: string; name: string }

interface Props {
  workers: WorkerRef[];
  projects: ProjectRefLite[];
  manualProjects: ManualProjectRef[];
  schedule: ScheduleAssignment[];
  /** The 5 dates of the displayed week. */
  days: string[];
}

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"] as const;

function dayHeader(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${parseInt(d)}.${parseInt(m)}`;
}

/** Resolve a WorkerKey to a display label. Real-staff names come from
 *  the workersById map; temps carry their own name. Returns "—" if a
 *  real-staff id can't be resolved (stale row from a deleted staff). */
function workerLabel(
  key: WorkerKey,
  workersById: ReadonlyMap<string, WorkerRef>,
): string {
  if (key.kind === "staff") return workersById.get(key.id)?.name ?? "—";
  return key.name;
}

export default function ScheduleByProjectTable({
  workers, projects, manualProjects, schedule, days,
}: Props) {
  const grouped     = groupByProjectDate(schedule);
  const workersById = new Map(workers.map((w) => [w.id, w]));

  // Manual project names that surface in this week's schedule. Derived
  // from the grouped keys, not from manualProjects: a manual site only
  // earns a row here when someone is actually planned there.
  const manualNamesInWeek = [...grouped.keys()]
    .filter((k) => k.startsWith("manual:"))
    .map((k) => k.slice("manual:".length))
    .sort();

  // Optional: surface manual_projects from the registry that have no
  // assignments yet — kept as a separate variable so callers can
  // toggle it later. For now, the user spec says "appearing this
  // week" → we use the derived list only.
  void manualProjects;

  if (projects.length === 0 && manualNamesInWeek.length === 0) {
    return (
      <div className="bg-white border border-warm-gray-light rounded-md p-6 text-center">
        <p className="text-sm text-charcoal/70">אין אתרים להצגה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-warm-gray-light rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        {/* table-fixed + colgroup: column widths are committed up
            front so a long site name (or a stack of chips in one cell)
            can't grow its column past its share. Cells overflow-hidden
            so long site names truncate with an ellipsis instead of
            spilling. min-w-[680px] sits a touch wider than the
            by-worker table because each cell here can hold a wrap of
            worker chips. */}
        <table className="w-full text-xs border-collapse table-fixed min-w-[760px]">
          <colgroup>
            {days.map((d) => <col key={d} />)}
            <col className="w-[200px]" />
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
                אתר
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const ref: ProjectRef = { kind: "real", id: p.id };
              return (
                <ProjectRow
                  key={"r-" + p.id}
                  ref={ref}
                  displayName={p.name}
                  isManual={false}
                  days={days}
                  grouped={grouped}
                  workersById={workersById}
                />
              );
            })}

            {manualNamesInWeek.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={days.length}
                    className="bg-amber-50/60 border border-warm-gray-light px-3 py-1.5 text-[0.7rem] font-semibold text-amber-700 uppercase tracking-wide"
                  >
                    אתרים ידניים ({manualNamesInWeek.length})
                  </td>
                  <td className="sticky end-0 bg-amber-50/60 border border-warm-gray-light" />
                </tr>
                {manualNamesInWeek.map((name) => {
                  const ref: ProjectRef = { kind: "manual", name };
                  return (
                    <ProjectRow
                      key={"m-" + name}
                      ref={ref}
                      displayName={name}
                      isManual={true}
                      days={days}
                      grouped={grouped}
                      workersById={workersById}
                    />
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ProjectRow ───────────────────────────────────────────────────────────────

interface RowProps {
  ref: ProjectRef;
  displayName: string;
  isManual: boolean;
  days: string[];
  grouped: ReadonlyMap<string, ReadonlyMap<string, ReadonlyArray<WorkerKey>>>;
  workersById: ReadonlyMap<string, WorkerRef>;
}

function ProjectRow(p: RowProps) {
  // Memo-light: project key recomputed per render is cheap (one
  // concat). Avoiding a useMemo here keeps this component as a
  // dumb presenter — no hooks, easy to read in trace output.
  void projectKeyString(p.ref);

  return (
    <tr className="hover:bg-bone/40 transition-colors">
      {p.days.map((d) => {
        const list = cellWorkers(p.grouped, p.ref, d);
        return (
          <td
            key={d}
            className="border border-warm-gray-light text-center align-top p-2 overflow-hidden"
          >
            {list.length === 0 ? (
              <span className="text-charcoal/25" aria-label="ללא שיבוץ">—</span>
            ) : (
              <div className="flex flex-wrap gap-1 justify-center">
                {list.map((wk) => {
                  // role lives on staff rows only — temps have no
                  // staff record and thus never carry the foreman flag.
                  const isForeman =
                    wk.kind === "staff" &&
                    p.workersById.get(wk.id)?.role === "ממונה";
                  return (
                    <WorkerChipMini
                      key={wk.kind === "staff" ? "s:" + wk.id : "t:" + wk.name}
                      workerKey={wk}
                      label={workerLabel(wk, p.workersById)}
                      isForeman={isForeman}
                    />
                  );
                })}
              </div>
            )}
          </td>
        );
      })}
      <td
        className={`sticky end-0 px-3 py-2 border border-warm-gray-light text-start ${
          p.isManual ? "bg-amber-50/50" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2
            size={11}
            strokeWidth={1.5}
            className={p.isManual ? "text-amber-500 shrink-0" : "text-accent shrink-0"}
          />
          <span className="font-semibold text-charcoal truncate">{p.displayName}</span>
          {p.isManual && (
            <span className="font-body text-[0.6rem] text-amber-700 px-1 py-0.5 rounded bg-amber-100 shrink-0">
              ידני
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function WorkerChipMini({
  workerKey, label, isForeman,
}: {
  workerKey: WorkerKey;
  label: string;
  /** Tints the chip sky-blue to signal staff.role==='ממונה'. Mutually
   *  exclusive with isTemp at the data level (a temp has no staff row). */
  isForeman: boolean;
}) {
  const isTemp = workerKey.kind === "temp";
  // Three categories: temp (amber, existing) → foreman (sky) → regular
  // (charcoal/white, default). Tested in that order so a temp can never
  // accidentally render as a foreman even if the parent passes both.
  const variantClasses =
    isTemp
      ? "bg-amber-50 border-amber-300/70 text-amber-800"
      : isForeman
        ? "bg-sky-50 border-sky-300/70 text-sky-800"
        : "bg-white border-charcoal/12 text-charcoal";
  const iconClass =
    isTemp ? "text-amber-500 shrink-0" :
    isForeman ? "text-sky-600 shrink-0" :
    "text-charcoal/60 shrink-0";
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold max-w-[110px] ${variantClasses}`}
    >
      <UserRound size={9} strokeWidth={1.75} className={iconClass} />
      <span className="truncate">{label}</span>
    </span>
  );
}
