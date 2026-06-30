"use client";

/**
 * DocumentProjectAssignBar — a one-line project picker rendered on
 * every DocumentCard in the inbox. Lets an admin assign (or change)
 * project_id without leaving the list view. Same shape, same PATCH
 * route, same "ללא פרויקט" sentinel as the per-document review form
 * — admins shouldn't have to learn two flows for the same field.
 *
 * Visual story:
 *   • doc has no project_id  → bar is tinted amber so the eye snags
 *     ("assign me"). amber-50/amber-300 matches the unlinked-receipts
 *     banner at the top of the inbox.
 *   • doc has a project       → bar is calm bone, just shows the name +
 *     a chevron to change it.
 *
 * Lives outside the parent <Link> wrapper so clicks on the <select>
 * never bubble into navigation — the card body remains a link to the
 * detail screen, but the project bar is its own surface.
 */

import { useState } from "react";
import { Building2, Loader2, Check, AlertCircle } from "lucide-react";
import ProjectSelect, { type ProjectOption } from "./ProjectSelect";

interface Props {
  /** The document row. We only need id + project_id; matching is by
   *  reference so a parent that swaps rows for a new fetch wipes
   *  pending edits cleanly. */
  docId: string;
  currentProjectId: string | null;
  projects: ProjectOption[];
  /** Optional refresh callback after a successful PATCH. The parent
   *  uses it to refresh totals / unlinked count. */
  onChanged?: () => void;
}

export default function DocumentProjectAssignBar({ docId, currentProjectId, projects, onChanged }: Props) {
  // Local optimistic value — flips back if the server rejects so the
  // UI never silently lies about persisted state.
  const [value, setValue] = useState<string>(currentProjectId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const hasProject = value !== "";

  async function save(next: string) {
    const prev = value;
    if (next === prev) return;
    setValue(next);
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: next || null }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setErr(b.error ?? `שגיאה ${res.status}`);
        setValue(prev);   // revert
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
      onChanged?.();
    } catch (e) {
      setErr(String(e));
      setValue(prev);
    } finally {
      setBusy(false);
    }
  }

  // Bar tone: amber when there's nothing assigned (nudge), bone when
  // assigned (just confirmation + ability to change).
  const tone = hasProject
    ? "bg-bone/40 border-charcoal/15"
    : "bg-amber-50 border-amber-300";

  return (
    <div
      className={`flex items-center gap-2 border-t px-3 py-2 ${tone}`}
      // Clicks on the select/button shouldn't bubble — the parent card
      // body is wrapped in a <Link>, and we don't want choosing a
      // project to also navigate to the detail screen.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {hasProject
        ? <Building2 size={13} strokeWidth={2} className="text-accent-dark shrink-0" />
        : <AlertCircle size={13} strokeWidth={2} className="text-amber-700 shrink-0" />}
      <span className="text-xs font-semibold text-charcoal/85 shrink-0">פרויקט:</span>
      <ProjectSelect
        value={value}
        onChange={save}
        projects={projects}
        emptyLabel="— ללא פרויקט —"
        className="flex-1 min-w-0 text-xs border border-charcoal/25 bg-white px-2 py-1 focus:border-accent focus:outline-none"
      />
      {busy && <Loader2 size={13} className="animate-spin text-charcoal/60 shrink-0" />}
      {savedFlash && !busy && <Check size={13} className="text-green-700 shrink-0" />}
      {err && <span className="text-xs text-red-700 font-semibold truncate" title={err}>{err}</span>}
    </div>
  );
}
