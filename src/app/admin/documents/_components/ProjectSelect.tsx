"use client";

// Project <select> for document assignment/filtering. Unlike attendance (which
// only ever needs live sites), documents can be assigned to ANY project —
// including finished ones, for retroactive filing. Active/planning projects
// sit at the top; finished projects go under a "— פרויקטים שהסתיימו —" group so
// the common case stays handy without dropping the rest.

export interface ProjectOption {
  id: string;
  name: string;
  status?: string | null;
}

const ACTIVE_STATUSES = new Set(["active", "planning"]);

export default function ProjectSelect({ value, onChange, projects, emptyLabel, className }: {
  value: string;
  onChange: (v: string) => void;
  projects: ProjectOption[];
  emptyLabel: string;
  className?: string;
}) {
  // Unknown/blank status defaults to "active" (safe — shows at the top).
  const active = projects.filter(p => ACTIVE_STATUSES.has(p.status ?? "active"));
  const ended  = projects.filter(p => !ACTIVE_STATUSES.has(p.status ?? "active"));

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      <option value="">{emptyLabel}</option>
      {ended.length === 0 ? (
        active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
      ) : (
        <>
          <optgroup label="פעילים">
            {active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
          <optgroup label="— פרויקטים שהסתיימו —">
            {ended.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        </>
      )}
    </select>
  );
}
