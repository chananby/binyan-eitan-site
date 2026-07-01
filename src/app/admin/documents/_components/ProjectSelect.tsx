"use client";

// Project <select> for document assignment/filtering. Unlike attendance (which
// only ever needs live sites), documents can be assigned to ANY project —
// including finished ones, for retroactive filing. Active/planning projects
// sit at the top; finished projects go under a "— פרויקטים שהסתיימו —" group so
// the common case stays handy without dropping the rest.
//
// Overhead projects (project_type='overhead' — the "תקורות" company-expense
// destination) get their own group at the bottom labelled "— הוצאות כלליות —"
// with a 💼 prefix on each option so they read as obviously different from a
// construction site. They only appear when the caller has fetched them
// (defaulting GETs to ?include=site keeps overhead out of every site picker).

export interface ProjectOption {
  id: string;
  name: string;
  status?: string | null;
  /** 'site' | 'overhead'. Anything else (or undefined) is treated as a
   *  site for the grouping logic. */
  project_type?: string | null;
}

// Post-unification only 'active' counts as active for grouping purposes.
// The legacy 'planning' bucket was folded into 'active' — see the
// unify-project-status PR + the DB CHECK on projects.status. Keeping the
// Set (rather than a literal comparison) so this scales if a third
// active-tier status ever comes back.
const ACTIVE_STATUSES = new Set(["active"]);

export default function ProjectSelect({ value, onChange, projects, emptyLabel, className }: {
  value: string;
  onChange: (v: string) => void;
  projects: ProjectOption[];
  emptyLabel: string;
  className?: string;
}) {
  // Split overhead out first so site grouping stays focused on the
  // status axis (the historical one). Unknown/blank status on a site
  // defaults to "active" (safe — shows at the top).
  const sites    = projects.filter(p => p.project_type !== "overhead");
  const overhead = projects.filter(p => p.project_type === "overhead");

  const active = sites.filter(p => ACTIVE_STATUSES.has(p.status ?? "active"));
  const ended  = sites.filter(p => !ACTIVE_STATUSES.has(p.status ?? "active"));

  // Backwards-compatible flat list when there's nothing but active
  // sites (no ended, no overhead) — preserves the look pre-overhead.
  const onlyActive = ended.length === 0 && overhead.length === 0;

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      <option value="">{emptyLabel}</option>
      {onlyActive ? (
        active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
      ) : (
        <>
          <optgroup label="פעילים">
            {active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
          {ended.length > 0 && (
            <optgroup label="— פרויקטים שהסתיימו —">
              {ended.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
          {overhead.length > 0 && (
            <optgroup label="— הוצאות כלליות —">
              {overhead.map(p => <option key={p.id} value={p.id}>💼 {p.name}</option>)}
            </optgroup>
          )}
        </>
      )}
    </select>
  );
}
