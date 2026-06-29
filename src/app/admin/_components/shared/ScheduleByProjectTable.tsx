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
      <div className="bg-white border border-charcoal/30 rounded-md p-6 text-center">
        <p className="text-sm text-charcoal/70">אין אתרים להצגה.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-charcoal/30 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        {/* table-fixed + colgroup: column widths are committed up
            front so a long site name (or a stack of chips in one cell)
            can't grow its column past its share. Cells overflow-hidden
            so long site names truncate with an ellipsis instead of
            spilling. min-w-[680px] sits a touch wider than the
            by-worker table because each cell here can hold a wrap of
            worker chips. */}
        {/* Table defaults aligned with ScheduleTable — text-sm content
            tier (14px) inherits to every cell. Site column 260 → 280px
            to absorb the wider site-name glyphs at 14px. min-w bumped
            so the wrap of chips per day cell still has breathing room. */}
        <table className="w-full text-sm border-collapse table-fixed min-w-[940px]">
          {/* Site column FIRST in HTML order → renders at the RTL right
              edge (where the eye starts). sticky start-0 pins it there. */}
          <colgroup>
            <col className="w-[280px]" />
            {days.map((d) => <col key={d} />)}
          </colgroup>
          <thead className="bg-bone">
            <tr>
              <th className="sticky start-0 bg-bone font-semibold px-3 py-2 border border-charcoal/30 text-charcoal/80 text-start">
                אתר
              </th>
              {days.map((d, i) => (
                <th
                  key={d}
                  className="font-semibold px-2 py-2 border border-charcoal/30 text-charcoal/80 whitespace-nowrap text-center"
                >
                  <div className="leading-tight">
                    <div>{HE_DAYS[i]}</div>
                    {/* Auxiliary date tier — text-xs (12px) +
                        charcoal/75 keeps the contrast above AA. */}
                    <div className="text-xs text-charcoal/75 tabular-nums" dir="ltr">{dayHeader(d)}</div>
                  </div>
                </th>
              ))}
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
                  <td className="sticky start-0 bg-amber-50/60 border border-charcoal/30 px-3 py-1.5 text-xs font-semibold text-amber-800 uppercase tracking-wide text-start">
                    אתרים ידניים ({manualNamesInWeek.length})
                  </td>
                  <td
                    colSpan={days.length}
                    className="bg-amber-50/60 border border-charcoal/30"
                  />
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
      <td
        className={`sticky start-0 px-3 py-2 border border-charcoal/30 text-start align-top ${
          p.isManual ? "bg-amber-50/50" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2
            size={14}
            strokeWidth={2}
            className={p.isManual ? "text-amber-600 shrink-0" : "text-accent-dark shrink-0"}
          />
          <span
            className="font-semibold text-charcoal truncate"
            title={p.displayName}
          >
            {p.displayName}
          </span>
          {p.isManual && (
            <span className="font-body text-xs text-amber-800 px-1.5 py-0.5 rounded bg-amber-100 shrink-0">
              ידני
            </span>
          )}
        </div>
      </td>
      {p.days.map((d) => {
        const list = cellWorkers(p.grouped, p.ref, d);
        return (
          <td
            key={d}
            className="border border-charcoal/30 text-center align-top p-2 overflow-hidden"
          >
            {list.length === 0 ? (
              // Em-dash is decorative; /35 keeps it visible without
              // competing with the content tier above it.
              <span className="text-charcoal/35" aria-label="ללא שיבוץ">—</span>
            ) : (
              // gap-2 at 14px content gives chips proper room to wrap
              // without merging into a single visual blob.
              <div className="flex flex-wrap gap-2 justify-center">
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
  // Three categories: temp (amber) → foreman (sky, ring) → regular
  // (white). Order is temp→foreman→regular so a temp can never
  // accidentally pick up the foreman variant even if the parent
  // passes both. Regular chips lean on border weight rather than
  // colour to stay readable — bumping them to a tint would compete
  // with foreman's sky pop and erase the categorical contrast.
  //
  // Contrast notes (all measured on the chip bg):
  //   regular  text-charcoal on white     ≈ 14:1  ✓ AA
  //   regular  border-charcoal/50         ≈ 2.8:1 (decorative chip edge)
  //   foreman  text-sky-900 on sky-100    ≈ 11:1  ✓ AA
  //   temp     text-amber-900 on amber-50 ≈  9:1  ✓ AA
  const variantClasses =
    isTemp
      ? "bg-amber-50 border-amber-500 text-amber-900"
      : isForeman
        ? "bg-sky-100 border-sky-500 text-sky-900 ring-1 ring-sky-300"
        : "bg-white border-charcoal/50 text-charcoal";
  const iconClass =
    isTemp ? "text-amber-700 shrink-0" :
    isForeman ? "text-sky-700 shrink-0" :
    "text-charcoal/75 shrink-0";
  // Content tier: text-sm (14px) per the WCAG-readable rule. Icon 12
  // tracks the line height. max-w 170 absorbs the wider 14px glyphs
  // so common Hebrew names still ride out without truncation. Padding
  // px-2.5 py-1.5 keeps glyphs 10px clear of the chip edge.
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-semibold max-w-[170px] ${variantClasses}`}
    >
      <UserRound size={12} strokeWidth={2} className={iconClass} />
      <span className="truncate">{label}</span>
    </span>
  );
}
