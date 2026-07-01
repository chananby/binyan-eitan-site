"use client";

// Triage flow — walk through every document that's still missing a project_id
// and assign one in a single keystroke each. The queue is loaded once on
// mount; every assignment advances optimistically (PATCH in the background)
// so the screen never stalls between docs. The list-view "row disappears,
// table shrinks" jump turns into a clean counter advance (3 / 80 → 4 / 80).
//
// Reuses what the inbox already has:
//   • GET /api/admin/documents?no_project=true&limit=500 — the queue.
//   • GET /api/admin/projects?include=site,overhead — the picker source.
//   • PATCH /api/admin/documents/{id}  { project_id } — the assignment.
//   • DocumentPreviewArea — the iframe/img body shared with the inbox dialog.
//   • ProjectSelect — site/ended/overhead groups, "תקורות" included.
//   • CATEGORY_LABELS / DIRECTION_LABELS / formatters — labels.ts.
//
// New here:
//   • State machine (queue, idx, lastAssignment, error).
//   • Quick-pick chips for the active projects + overhead.
//   • Bottom-toast undo with a 6s window (mirrors review-queue's UndoToast).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, Inbox, ChevronRight, SkipForward, RotateCcw,
  AlertCircle, ArrowRight, Building2, Briefcase, CheckCircle2,
} from "lucide-react";
import DocumentPreviewArea from "../_components/DocumentPreviewArea";
import ProjectSelect, { type ProjectOption } from "../_components/ProjectSelect";
import { displayVendor, fmtCurrency, fmtDate, type DocRow } from "../_components/labels";
import DocSummaryCard from "./DocSummaryCard";
// Reuse the toast from the review screen — same look, same 6 s timer, same
// keyed-remount-per-action lifecycle. The fixed position floats above the
// progress bar without colliding (z-60 + position:fixed take it out of flow).
import UndoToast from "../review/UndoToast";

type AuthState = "loading" | "unauthenticated" | "admin";

interface UndoEntry {
  /** The doc that was just assigned — so we can step back to it on undo. */
  doc: DocRow;
  /** Project that was set. null = "ללא פרויקט" (the skip path doesn't queue an undo). */
  projectId: string;
  /** What was on the doc BEFORE this assignment. Almost always null in
   *  triage (we only show no-project docs), but recorded so undo never
   *  overwrites an unrelated prior value. */
  previousProjectId: string | null;
  /** Reset key for the toast so a fast double-assign restarts the 6s timer. */
  seq: number;
}

export default function TriageClient() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [queue, setQueue] = useState<DocRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const undoSeqRef = useRef(0);
  /** Docs the admin actually assigned (not skipped) — drives the end-state
   *  count. Skip just bumps idx without adding here. */
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  // ── Auth probe ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!cancelled) setAuth(d?.role === "admin" ? "admin" : "unauthenticated"); })
      .catch(() => { if (!cancelled) setAuth("unauthenticated"); });
    return () => { cancelled = true; };
  }, []);

  // ── Queue + projects (mount once after auth) ───────────────────────────────
  useEffect(() => {
    if (auth !== "admin") return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [docsRes, projsRes] = await Promise.all([
          fetch("/api/admin/documents?no_project=true&limit=500", { cache: "no-store" }).then(r => r.json()),
          fetch("/api/admin/projects?include=site,overhead", { cache: "no-store" }).then(r => r.json()),
        ]);
        if (cancelled) return;
        if (docsRes.error) { setError(docsRes.error); return; }
        setQueue(docsRes.documents ?? []);
        setProjects(projsRes.projects ?? []);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth]);

  // ── Quick-pick chips: active sites + overhead, capped to 5 sites + the
  // overhead destination. Cap keeps the row from wrapping on a phone; the
  // full ProjectSelect right below still exposes every project. Decision:
  // alphabetic order (the same useful default the inbox uses), not "recent
  // / most assigned" — recency is per-session and adds complexity without
  // a clear win until usage proves otherwise.
  const activeSites = projects
    .filter(p => p.project_type !== "overhead")
    // Post-unification the only "active-tier" status is 'active'; a null
    // still counts as active for safety (unknown/legacy rows shouldn't
    // silently disappear from the picker).
    .filter(p => p.status === "active" || p.status == null)
    .slice(0, 5);
  const overheadChip = projects.find(p => p.project_type === "overhead");

  // ── Assignment flow ────────────────────────────────────────────────────────
  // The PATCH fires in the background. The UI advances first so the next
  // doc paints immediately — Vercel + Supabase round-trips take 200-400 ms,
  // which is enough to feel like a stall on every assignment. If the PATCH
  // fails we step back to the doc and surface the error.
  const assign = useCallback(async (projectId: string) => {
    const cur = queue[idx];
    if (!cur || savingId) return;
    const previousProjectId = cur.project_id ?? null;
    setSavingId(cur.id);
    setError(null);
    setIdx(i => i + 1);                 // optimistic advance
    setAssignedIds(prev => new Set(prev).add(cur.id));
    undoSeqRef.current++;
    setUndoEntry({
      doc: cur, projectId, previousProjectId, seq: undoSeqRef.current,
    });
    try {
      const res = await fetch(`/api/admin/documents/${cur.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(`שיוך נכשל: ${b.error ?? res.status}`);
        // Rollback: drop the just-added id, step idx back, clear undo (we
        // never persisted, so undo would PATCH-null a row that's still null).
        setAssignedIds(prev => { const n = new Set(prev); n.delete(cur.id); return n; });
        setIdx(i => Math.max(0, i - 1));
        setUndoEntry(null);
      }
    } catch (e) {
      setError(`שיוך נכשל: ${String(e)}`);
      setAssignedIds(prev => { const n = new Set(prev); n.delete(cur.id); return n; });
      setIdx(i => Math.max(0, i - 1));
      setUndoEntry(null);
    } finally {
      setSavingId(null);
    }
  }, [queue, idx, savingId]);

  const skip = useCallback(() => {
    if (idx >= queue.length) return;
    setIdx(i => i + 1);
    setUndoEntry(null);                 // skip doesn't queue an undo
  }, [idx, queue.length]);

  const back = useCallback(() => {
    if (idx === 0) return;
    setIdx(i => i - 1);
    setUndoEntry(null);
  }, [idx]);

  // Undo: only handles the last-assigned doc. Steps idx back to that doc,
  // PATCHes its project_id back to whatever it was before (typically null),
  // and removes the id from the "assigned" tally so the end-state count
  // reflects truth.
  const handleUndo = useCallback(async () => {
    if (!undoEntry) return;
    const u = undoEntry;
    setUndoEntry(null);
    setIdx(i => Math.max(0, i - 1));
    setAssignedIds(prev => { const n = new Set(prev); n.delete(u.doc.id); return n; });
    try {
      await fetch(`/api/admin/documents/${u.doc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: u.previousProjectId }),
      });
    } catch { /* the local state already reflects the intent; a refresh recovers truth */ }
  }, [undoEntry]);

  // ── Gates ──────────────────────────────────────────────────────────────────
  if (auth === "loading" || (auth === "admin" && loading)) {
    return <div className="min-h-screen flex items-center justify-center bg-bone-dark"><Loader2 className="animate-spin text-accent" size={32} /></div>;
  }
  if (auth === "unauthenticated") {
    const here = typeof window !== "undefined" ? window.location.pathname : "/admin/documents/triage";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bone-dark p-8 text-center">
        <Inbox size={32} strokeWidth={1.5} className="text-accent mb-4" />
        <h1 className="text-charcoal text-xl font-semibold mb-2">נדרשת התחברות</h1>
        <Link href={`/admin?redirectTo=${encodeURIComponent(here)}`} className="text-accent underline text-content hover:no-underline">לעמוד ההתחברות ←</Link>
      </div>
    );
  }

  const total = queue.length;
  const cur = queue[idx];
  const done = !cur;
  const progressPct = total === 0 ? 0 : Math.round((idx / total) * 100);

  return (
    <div className="min-h-screen bg-bone-dark flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-charcoal/10 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-content min-w-0">
          <Link href="/admin/documents" className="text-accent flex items-center gap-1 hover:underline shrink-0">
            <ChevronRight size={14} />אסמכתאות
          </Link>
          <span className="text-charcoal/40">/</span>
          <span className="text-charcoal font-semibold truncate">טריאז' — שיוך פרויקט</span>
        </div>
        {!done && (
          <div className="text-content text-muted tabular-nums shrink-0">
            <span className="font-bold text-charcoal">{idx + 1}</span> / {total}
          </div>
        )}
      </header>

      {/* End state */}
      {done && (
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <CheckCircle2 size={64} strokeWidth={1.5} className="text-emerald-600 mb-6" />
          <h1 className="font-heading text-2xl font-bold text-charcoal mb-2">סיימת!</h1>
          <p className="text-body text-muted mb-2">
            {assignedIds.size === 0
              ? "אף מסמך לא שויך בסבב הזה."
              : <>שייכת <span className="font-bold text-charcoal">{assignedIds.size}</span> {assignedIds.size === 1 ? "מסמך" : "מסמכים"} מתוך {total}.</>}
          </p>
          {total - assignedIds.size > 0 && (
            <p className="text-caption text-muted mb-6">
              {total - assignedIds.size} {total - assignedIds.size === 1 ? "מסמך נשאר" : "מסמכים נשארו"} בלי שיוך — תוכל לחזור אליהם בסבב הבא.
            </p>
          )}
          <Link
            href="/admin/documents"
            className="inline-flex items-center gap-2 bg-accent text-bone px-5 py-2.5 rounded-md text-content font-semibold hover:bg-accent-dark transition-colors"
          >
            <ArrowRight size={16} /> חזרה לרשימת האסמכתאות
          </Link>
        </main>
      )}

      {/* Main work area */}
      {cur && (
        <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 max-w-7xl mx-auto w-full">
          {/* Preview column */}
          <section className="flex-1 min-w-0 bg-white border border-charcoal/10 rounded-md shadow-[0_1px_3px_rgba(45,41,38,0.06),0_1px_2px_rgba(45,41,38,0.04)] flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-charcoal/10 bg-bone flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-content font-bold text-charcoal truncate">{displayVendor(cur)}</p>
                <p className="text-caption text-muted">
                  {fmtCurrency(cur.total_amount, cur.currency ?? "ILS")} · {fmtDate(cur.doc_date)}
                </p>
              </div>
              <a
                href={`/api/admin/documents/${cur.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption font-semibold text-accent hover:text-accent-dark shrink-0"
              >
                פתח בכרטיסייה
              </a>
            </div>
            <DocumentPreviewArea
              doc={cur}
              className="flex-1 min-h-[40vh] overflow-auto bg-charcoal/5"
              pdfHeightClassName="h-[55vh] lg:h-[72vh]"
              imageMaxHeightClassName="max-h-[72vh]"
            />
          </section>

          {/* Side panel */}
          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
            <DocSummaryCard doc={cur} />

            {/* Project picker */}
            <div className="bg-white border border-charcoal/10 rounded-md shadow-[0_1px_3px_rgba(45,41,38,0.06),0_1px_2px_rgba(45,41,38,0.04)] p-4 space-y-3">
              <p className="text-caption text-muted">שייך לפרויקט</p>

              {/* Quick-pick chips */}
              {(activeSites.length > 0 || overheadChip) && (
                <div className="flex flex-wrap gap-1.5">
                  {activeSites.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => assign(p.id)}
                      disabled={!!savingId}
                      className="inline-flex items-center gap-1 text-caption font-semibold border border-accent/40 text-accent bg-white px-2.5 py-1 rounded hover:bg-accent/5 disabled:opacity-40 transition-colors"
                      title={`שייך ל-${p.name}`}
                    >
                      <Building2 size={11} strokeWidth={2} /> {p.name}
                    </button>
                  ))}
                  {overheadChip && (
                    <button
                      type="button"
                      onClick={() => assign(overheadChip.id)}
                      disabled={!!savingId}
                      className="inline-flex items-center gap-1 text-caption font-semibold border border-charcoal/30 text-charcoal bg-bone/40 px-2.5 py-1 rounded hover:bg-bone disabled:opacity-40 transition-colors"
                      title="שייך לתקורות (הוצאות כלליות)"
                    >
                      <Briefcase size={11} strokeWidth={2} /> תקורות
                    </button>
                  )}
                </div>
              )}

              {/* Full dropdown — for any project not in the quick chips */}
              <ProjectSelect
                value=""
                onChange={(v) => v && assign(v)}
                projects={projects}
                emptyLabel="— או בחר מתוך הרשימה המלאה —"
                className="w-full text-content border border-charcoal/25 bg-white px-3 py-2 rounded focus:border-accent focus:outline-none disabled:opacity-40"
              />

              {savingId && (
                <p className="flex items-center gap-1.5 text-caption text-muted">
                  <Loader2 size={11} className="animate-spin" /> שומר…
                </p>
              )}
              {error && (
                <p className="flex items-center gap-1.5 text-caption text-red-600 font-semibold">
                  <AlertCircle size={11} /> {error}
                </p>
              )}
            </div>

            {/* Action row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={back}
                disabled={idx === 0 || !!savingId}
                className="flex-1 inline-flex items-center justify-center gap-1.5 border border-charcoal/20 text-muted bg-white px-3 py-2.5 rounded text-content font-semibold hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
              >
                <RotateCcw size={14} /> חזור
              </button>
              <button
                type="button"
                onClick={skip}
                disabled={!!savingId}
                className="flex-1 inline-flex items-center justify-center gap-1.5 border border-charcoal/20 text-muted bg-white px-3 py-2.5 rounded text-content font-semibold hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
              >
                <SkipForward size={14} /> דלג
              </button>
            </div>
          </aside>
        </main>
      )}

      {/* Progress bar */}
      {!done && total > 0 && (
        <div className="bg-white border-t border-charcoal/10 px-4 py-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-charcoal/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-caption text-muted tabular-nums shrink-0">
            {assignedIds.size} שויכו, {total - idx} נותרו
          </span>
        </div>
      )}

      {/* Undo toast — keyed on seq so a fresh assignment restarts the 6s timer */}
      {undoEntry && (
        <UndoToast
          key={undoEntry.seq}
          message={`שויך — ${displayVendor(undoEntry.doc)}`}
          onUndo={handleUndo}
          onDismiss={() => setUndoEntry(null)}
        />
      )}
    </div>
  );
}
