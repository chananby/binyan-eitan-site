"use client";

// Groups attendance records into a card per site, laid out as a responsive
// grid (a wide "at a glance" overview rather than a tall list). Shared by two
// callers so the grouping/sorting/card-shell isn't duplicated:
//
//   • Attendance tab → today's full log, rows with edit/history buttons.
//   • Dashboard      → who's on site now, compact read-only rows.
//
// The variable part — the row itself — is injected via `renderRow`, the same
// "pass the contextual piece as a prop" pattern as shared/ImageViewer.tsx. That
// is what lets the dashboard use a trimmed row (no edit buttons) without a
// second component. This file owns NO data fetching and NO attendance logic; it
// only regroups the rows it's handed, so foreman-scope (applied upstream by
// whoever supplies the records) is preserved untouched.

import React from "react";
import { Building2, Users } from "lucide-react";

// Minimal shape needed to group + count. Deliberately loose so BOTH
// AttendanceRecord definitions (tabs/AttendanceTab.tsx and _components/types.ts)
// satisfy it structurally without this shared file depending on either.
interface BySiteRecord {
  id: string;
  project: { id: string; name: string } | null;
  staff: { id: string } | null;
}

interface SiteGroup<T> {
  key: string;
  name: string;
  rows: T[];
  workerCount: number;
  isNoSite: boolean;
}

// Pure regroup by site. Row order within a group is preserved as handed in
// (callers pass created_at-desc), so it stays consistent with the flat view.
// Cards: most workers first, then site name (א"ב); the "no site" bucket last.
function groupBySite<T extends BySiteRecord>(rows: T[]): SiteGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const key = r.project?.id ?? "__none__";
    const arr = map.get(key);
    if (arr) arr.push(r);
    else map.set(key, [r]);
  }
  const groups: SiteGroup<T>[] = [];
  for (const [key, groupRows] of map) {
    const isNoSite = key === "__none__";
    const workerCount = new Set(
      groupRows.map(r => r.staff?.id).filter((id): id is string => !!id),
    ).size;
    groups.push({
      key,
      name: isNoSite ? "ללא אתר" : (groupRows[0].project?.name ?? "אתר"),
      rows: groupRows,
      workerCount,
      isNoSite,
    });
  }
  groups.sort((a, b) => {
    if (a.isNoSite !== b.isNoSite) return a.isNoSite ? 1 : -1; // no-site always last
    if (b.workerCount !== a.workerCount) return b.workerCount - a.workerCount;
    return a.name.localeCompare(b.name, "he");
  });
  return groups;
}

export function AttendanceBySiteGrid<T extends BySiteRecord>({
  records,
  renderRow,
  // Default: 1 col mobile → 2 at md → 3 at xl. Callers with wider rows (the
  // attendance tab, whose rows carry edit/history buttons) can cap it lower.
  columnsClassName = "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
}: {
  records: T[];
  renderRow: (r: T) => React.ReactNode;
  columnsClassName?: string;
}) {
  if (records.length === 0) return null;
  const groups = groupBySite(records);
  return (
    // items-start so cards of unequal height align to the top instead of
    // stretching — a short site card next to a tall one stays tidy.
    <div className={`grid ${columnsClassName} gap-3 items-start`}>
      {groups.map(g => (
        <div key={g.key} className={`border rounded-md overflow-hidden ${g.isNoSite ? "border-amber-200" : "border-charcoal/15"}`}>
          {/* items-start so a site name that wraps to two lines keeps the
              worker-count aligned to the top. The name is NOT truncated — it
              shows in full (wrapping if needed) rather than being cut off. */}
          <div className="flex items-start justify-between gap-2 px-3 py-2 bg-bone/40 border-b border-charcoal/10">
            <div className="flex items-start gap-1.5 min-w-0">
              <Building2 size={13} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${g.isNoSite ? "text-amber-500" : "text-charcoal/60"}`} />
              <span className="font-heading text-sm font-bold leading-tight break-words">{g.name}</span>
            </div>
            <span className="flex items-center gap-1 text-caption text-charcoal/70 shrink-0 tabular-nums whitespace-nowrap">
              <Users size={12} strokeWidth={1.5} /> {g.workerCount} {g.workerCount === 1 ? "עובד" : "עובדים"}
            </span>
          </div>
          <div className="divide-y divide-charcoal/15 px-3">
            {g.rows.map(r => <React.Fragment key={r.id}>{renderRow(r)}</React.Fragment>)}
          </div>
        </div>
      ))}
    </div>
  );
}
