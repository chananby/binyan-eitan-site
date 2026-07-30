"use client";

/**
 * CollectionsTab — "what to collect right now" surface. Phase 1 of the
 * financial-management work; lives behind the new "גבייה" admin tab.
 *
 * Renders every payment_milestones row with status='due' and
 * paid_amount < amount, grouped by project. Designed to be the morning
 * screen the contractor opens to see which stages need a payment
 * request today.
 *
 * Data comes from /api/admin/collections (already in production):
 *   items[]: { milestone, project, remaining }
 *   totals:  { total_due, count, by_project }
 *
 * Fetch lives in AdminPortal (#3); this component is presentational
 * + owns only the inline payment round-trip (delegated upward via
 * onPayment so the parent can re-sync after a successful POST).
 *
 * Mobile-first: project sections collapse, cards stack vertically,
 * 14px content text, WCAG-compliant colour pairs (mirrors the rest of
 * the milestones surface).
 */

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, ChevronDown, ChevronUp, Coins, Building2 } from "lucide-react";
import CollectionItemCard, { type CollectionsMilestone } from "../shared/CollectionItemCard";
import { StaleRefresh } from "../shared/StaleRefresh";

export interface CollectionItem {
  milestone: CollectionsMilestone;
  project: { id: string; name: string; status: string | null } | null;
  remaining: number;
}

export interface CollectionsData {
  items: CollectionItem[];
  totals: {
    total_due: number;
    count: number;
    by_project: Record<string, number>;
  };
}

interface Props {
  data: CollectionsData | null;
  loading: boolean;
  error: string | null;
  onReload: () => void | Promise<void>;
  onPayment: (id: string, paidAmount: number) => Promise<void>;
}

function fmt(n: number): string {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

interface GroupedProject {
  id: string;
  name: string;
  status: string | null;
  total: number;
  items: CollectionItem[];
}

/** Group items by project, sort items inside each group by ripeness
 *  (oldest marked_due_at first — "אחים שמחכים הכי הרבה"), and order the
 *  groups: active before inactive, then by name. Pure — no I/O. */
function groupAndSort(items: CollectionItem[]): GroupedProject[] {
  const byId = new Map<string, GroupedProject>();
  for (const item of items) {
    const pid = item.project?.id ?? item.milestone.project_id;
    const pname = item.project?.name ?? "(פרויקט לא ידוע)";
    const pstatus = item.project?.status ?? null;
    let g = byId.get(pid);
    if (!g) {
      g = { id: pid, name: pname, status: pstatus, total: 0, items: [] };
      byId.set(pid, g);
    }
    g.items.push(item);
    g.total += item.remaining;
  }

  for (const g of byId.values()) {
    g.items.sort((a, b) => {
      const ta = a.milestone.marked_due_at ? new Date(a.milestone.marked_due_at).getTime() : 0;
      const tb = b.milestone.marked_due_at ? new Date(b.milestone.marked_due_at).getTime() : 0;
      return ta - tb;  // oldest first
    });
  }

  const list = [...byId.values()];
  list.sort((a, b) => {
    const aActive = a.status === "active" ? 0 : 1;
    const bActive = b.status === "active" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return a.name.localeCompare(b.name, "he");
  });
  return list;
}

export default function CollectionsTab({ data, loading, error, onReload, onPayment }: Props) {
  // Per-project accordion state — defaults to all-open so the chase
  // list reads as a flat to-do list on first paint. Collapse comes
  // into play only when there are many projects and the admin wants
  // to focus.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  function toggle(pid: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }

  // Local busy state — disables every payment input across the screen
  // while a single POST is in flight. Keeps the UI from drifting if
  // the admin double-taps.
  const [paying, setPaying] = useState(false);
  async function handlePayment(id: string, paid: number) {
    setPaying(true);
    try {
      await onPayment(id, paid);
    } finally {
      setPaying(false);
    }
  }

  const groups = useMemo(() => data ? groupAndSort(data.items) : [], [data]);
  const totalDue = data?.totals.total_due ?? 0;
  const count = data?.totals.count ?? 0;
  const projectCount = groups.length;

  return (
    <div className="space-y-4">
      {/* Top bar — refresh button + status. */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-content text-charcoal/75 leading-snug">
          כל אבני הדרך המוכנות לגבייה. סמן תשלום כאן כדי לעדכן את הפרויקט.
        </p>
        <button
          type="button"
          onClick={() => onReload()}
          className="flex items-center gap-1 text-micro text-charcoal/70 hover:text-accent shrink-0"
        >
          <RefreshCw size={12} /> רענן
        </button>
      </div>

      {/* Error stays outside StaleRefresh — nothing sensible to keep
          on screen if the reload itself failed. */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-300 rounded-md p-4">
          <p className="text-sm text-red-800 font-semibold">{error}</p>
          <button onClick={() => onReload()}
            className="mt-2 text-sm border border-red-300 text-red-700 px-3 py-1.5 rounded hover:bg-red-100">
            נסה שוב
          </button>
        </div>
      )}

      {/* StaleRefresh keeps the collection list (hero + project cards)
          mounted during a manual refresh or a post-payment reload,
          instead of collapsing back to a spinner and jumping the page
          to the top. First load still shows the full "טוען..." spinner
          via the override. Same pattern BoardTab.tsx:319 uses. */}
      {!error && (
        <StaleRefresh
          loading={loading}
          hasContent={!!data}
          spinner={
            <div className="flex items-center justify-center gap-2 py-12 text-charcoal/65">
              <Loader2 size={18} className="animate-spin" /> טוען...
            </div>
          }
        >
          {data && data.items.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-8 text-center">
              <p className="text-base font-semibold text-green-800">אין מה לגבות כרגע</p>
              <p className="text-sm text-green-700 mt-1">הכל מעודכן ✓</p>
            </div>
          )}

          {/* Hero summary — only when there IS something to collect. */}
          {data && data.items.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-md p-4 space-y-1 mb-4">
              <p className="text-micro font-bold text-red-700 tracking-wide uppercase flex items-center gap-1">
                <Coins size={14} strokeWidth={2} /> לגבייה עכשיו
              </p>
              <p className="text-3xl font-bold text-red-800 tabular-nums leading-tight">
                {fmt(totalDue)}
              </p>
              <p className="text-sm text-charcoal/85">
                {count} {count === 1 ? "תשלום" : "תשלומים"} מ-{projectCount} {projectCount === 1 ? "פרויקט" : "פרויקטים"}
              </p>
            </div>
          )}

          {/* Project sections */}
          <div className="space-y-4">
          {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const isInactive = group.status !== "active";
        return (
          <div key={group.id} className="bg-white border border-charcoal/25 rounded-md overflow-hidden">
            {/* Project header — tap target opens/closes the section. */}
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 hover:bg-bone/40 transition-colors"
              aria-expanded={!isCollapsed}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 text-start">
                <Building2 size={14} strokeWidth={2} className="text-accent-dark shrink-0" />
                <p className="text-sm font-bold text-charcoal truncate">{group.name}</p>
                {isInactive && (
                  <span className="text-micro font-semibold bg-charcoal/[0.08] text-charcoal/80 border border-charcoal/25 px-1.5 py-0.5 rounded shrink-0">
                    לא פעיל
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-red-700 tabular-nums">{fmt(group.total)}</span>
                <span className="text-micro text-charcoal/70">
                  ({group.items.length})
                </span>
                {isCollapsed
                  ? <ChevronDown size={14} className="text-charcoal/70" />
                  : <ChevronUp size={14} className="text-charcoal/70" />}
              </div>
            </button>

            {/* Section body — milestones for this project. */}
            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-2 border-t border-charcoal/15">
                {group.items.map((item) => (
                  <CollectionItemCard
                    key={item.milestone.id}
                    milestone={item.milestone}
                    busy={paying}
                    onPayment={handlePayment}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
          </div>
        </StaleRefresh>
      )}
    </div>
  );
}
