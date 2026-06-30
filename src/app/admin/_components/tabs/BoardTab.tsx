"use client";

// BoardTab — worker-assignment board, redesigned for two interaction
// modes that depend on the input device:
//
// Layout:
//   • Unassigned strip on top (chips wrap inside, full-width).
//   • A responsive CSS grid of SiteCards below: 1 column on phone,
//     2 on tablet, 3 on desktop. All sites visible at once — no
//     horizontal scroll.
//
// Interaction:
//   • Fine pointer (desktop/mouse): drag a chip onto a card. Same
//     dnd-kit DndContext as before.
//   • Coarse pointer (touch): chips are tap-only (drag listeners
//     disabled). A tap opens MoveToDialog with every site + the
//     unassigned pool; the user picks a target and we PUT.
//
// Server contracts are unchanged — same PUT actions on the existing
// /api/admin/board-assignments route.

import { useEffect, useMemo, useState } from "react";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { AlertTriangle, RefreshCw } from "lucide-react";
import UnassignedStrip from "../shared/UnassignedStrip";
import SiteCard from "../shared/SiteCard";
import { type WorkerChipData } from "../shared/WorkerChip";
import MoveToDialog, { type MoveTarget } from "../shared/MoveToDialog";
import BoardManualEntry from "../shared/BoardManualEntry";
import { StaleRefresh } from "../shared/StaleRefresh";
import { useCoarsePointer } from "../hooks/useCoarsePointer";
import {
  type BoardAssignment, type WorkerRef, type ProjectRef, type ManualProjectRef,
  groupByProject, unassignedWorkers, applyMoveOptimistic, UNASSIGNED_TARGET,
  mergeManualProjectNames,
} from "../../../../lib/board-state";

// Encoded ids — kept identical to the previous shape so the API stays
// untouched. PR notes: worker:<id>, manual_card:<id>, project:<uuid>,
// manual:<name>, __unassigned__.
const cardIdForRealWorker    = (workerId: string)     => `worker:${workerId}`;
const cardIdForManual        = (assignmentId: string) => `manual_card:${assignmentId}`;
const columnIdForRealProject = (projectId: string)    => `project:${projectId}`;

const UNASSIGNED_ID = UNASSIGNED_TARGET;

interface BoardData {
  assignments: BoardAssignment[];
  workers: WorkerRef[];
  projects: ProjectRef[];
  manual_projects: ManualProjectRef[];
}

export default function BoardTab() {
  const [data, setData]       = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Mobile/tap mode — flipped reactively if the device changes (e.g.
  // user docks an iPad with a mouse).
  const coarsePointer = useCoarsePointer();
  const tapMode = coarsePointer;

  // MoveToDialog state — opened by a tap on a chip in tap mode.
  const [moveDialog, setMoveDialog] = useState<{ worker: WorkerChipData; currentColumnId: string | null } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 120, tolerance: 5 } }),
  );

  // ── Bootstrap ─────────────────────────────────────────────────────────
  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/board-assignments", { cache: "no-store" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(`טעינת הלוח נכשלה: ${b.error ?? res.status}`);
        return;
      }
      const d = await res.json();
      setData({
        assignments:     Array.isArray(d.assignments)     ? d.assignments     : [],
        workers:         Array.isArray(d.workers)         ? d.workers         : [],
        projects:        Array.isArray(d.projects)        ? d.projects        : [],
        manual_projects: Array.isArray(d.manual_projects) ? d.manual_projects : [],
      });
    } catch { setError("שגיאת רשת — נסה שוב."); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  // ── Derived ──────────────────────────────────────────────────────────
  const grouped = useMemo<Map<string, BoardAssignment[]>>(
    () => data ? groupByProject(data.assignments) : new Map(),
    [data],
  );
  const unassigned  = useMemo(() => data ? unassignedWorkers(data.workers, data.assignments) : [], [data]);
  const workersById = useMemo(() => new Map((data?.workers ?? []).map((w) => [w.id, w])), [data]);

  // Manual project columns: union of three sources, encoded as
  // `manual:<name>` keys so the rest of the UI (dnd targets, dialog
  // options, render loop) stays untouched.
  //   1) rows in board_manual_projects (persistent — render even when empty)
  //   2) manual: keys in the grouped assignments (back-compat: an
  //      assignment named a site that was never inserted into the table)
  //   3) minus any name that collides with a real project (those should
  //      surface as the real project column, not a manual twin)
  const manualProjectKeys = useMemo(() => {
    if (!data) return [];
    return mergeManualProjectNames(
      data.manual_projects,
      grouped.keys(),
      data.projects,
    ).map((name) => `manual:${name}`);
  }, [grouped, data]);

  function cardsForKey(key: string): WorkerChipData[] {
    const rows = grouped.get(key) ?? [];
    return rows.map((a) => {
      if (a.worker_id) {
        const w = workersById.get(a.worker_id);
        return {
          id: cardIdForRealWorker(a.worker_id),
          label: w?.name ?? a.worker_name ?? "—",
          tag: w?.label ?? null,
          isManual: false,
          assignmentId: a.id,
        };
      }
      return {
        id: cardIdForManual(a.id),
        label: a.worker_name ?? "—",
        tag: null,
        isManual: true,
        assignmentId: a.id,
      };
    });
  }
  const unassignedCards: WorkerChipData[] = unassigned.map((w) => ({
    id: cardIdForRealWorker(w.id),
    label: w.name,
    tag: w.label ?? null,
    isManual: false,
  }));

  // Targets for both the manual-entry dropdown and the move-to dialog.
  const targetOptions = useMemo<MoveTarget[]>(() => {
    if (!data) return [];
    const opts: MoveTarget[] = [];
    for (const p of data.projects) opts.push({ id: columnIdForRealProject(p.id), label: p.name, variant: "project" });
    for (const k of manualProjectKeys)  opts.push({ id: k, label: k.slice(7), variant: "manual_project" });
    return opts;
  }, [data, manualProjectKeys]);

  /** Pre-bound move targets for the dialog: same site list plus
   *  "Unassigned" at the bottom. */
  const dialogTargets = useMemo<MoveTarget[]>(() =>
    [...targetOptions, { id: UNASSIGNED_ID, label: "לא משובצים", variant: "unassigned" }],
    [targetOptions],
  );

  // Map a worker chip → the column id it currently lives in, so the
  // dialog hides it from the target list (no-op moves).
  function findCurrentColumn(chip: WorkerChipData): string | null {
    if (!data) return null;
    const row = chip.isManual
      ? data.assignments.find((a) => a.id === chip.assignmentId)
      : data.assignments.find((a) => a.worker_id === chip.id.slice(7));
    if (!row) return UNASSIGNED_ID;
    if (row.project_id) return columnIdForRealProject(row.project_id);
    if (row.project_name) return `manual:${row.project_name}`;
    return UNASSIGNED_ID;
  }

  // ── PUT helpers ──────────────────────────────────────────────────────
  async function put(body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/board-assignments", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        await reload();
        return false;
      }
      return true;
    } catch { alert("שגיאת רשת — נסה שוב."); await reload(); return false; }
  }

  /** Apply a move to the given target — used by both the drag end
   *  handler and the tap-to-move dialog. Optimistic state first,
   *  then PUT to the server. */
  async function moveChipTo(card: WorkerChipData, targetId: string) {
    if (!data) return;
    const next = applyMoveOptimistic(data.assignments, card, targetId);
    if (next) setData({ ...data, assignments: next });

    if (targetId === UNASSIGNED_ID) {
      if (card.isManual && card.assignmentId) await put({ action: "unassign_row", id: card.assignmentId });
      else {
        const workerId = card.id.startsWith("worker:") ? card.id.slice(7) : "";
        if (workerId) await put({ action: "unassign", worker_id: workerId });
      }
      return;
    }
    if (targetId.startsWith("project:")) {
      const projectId = targetId.slice(8);
      if (card.isManual && card.assignmentId) {
        await put({ action: "unassign_row", id: card.assignmentId });
        await put({ action: "assign_manual_worker", worker_name: card.label, project_id: projectId });
        await reload();
      } else {
        const workerId = card.id.startsWith("worker:") ? card.id.slice(7) : "";
        if (workerId) await put({ action: "assign", worker_id: workerId, project_id: projectId });
      }
      return;
    }
    if (targetId.startsWith("manual:")) {
      const projectName = targetId.slice(7);
      if (card.isManual && card.assignmentId) {
        await put({ action: "unassign_row", id: card.assignmentId });
        await put({ action: "assign_manual_worker", worker_name: card.label, project_name: projectName });
        await reload();
      } else {
        const workerId = card.id.startsWith("worker:") ? card.id.slice(7) : "";
        if (workerId) await put({ action: "assign", worker_id: workerId, project_name: projectName });
      }
    }
  }

  // ── Drag end ─────────────────────────────────────────────────────────
  function onDragEnd(e: DragEndEvent) {
    const card = e.active.data.current as WorkerChipData | undefined;
    const overId = e.over?.id as string | undefined;
    if (!card || !overId) return;
    void moveChipTo(card, overId);
  }

  // ── Chip tap (mobile) — open dialog ──────────────────────────────────
  function onChipTap(chip: WorkerChipData) {
    if (!tapMode) return; // desktop: chip tap is a no-op
    setMoveDialog({ worker: chip, currentColumnId: findCurrentColumn(chip) });
  }

  // ── Manual entry handlers ────────────────────────────────────────────
  async function addManualWorker(workerName: string, targetId: string) {
    setPosting(true);
    const body: Record<string, unknown> = { action: "assign_manual_worker", worker_name: workerName };
    if      (targetId.startsWith("project:")) body.project_id   = targetId.slice(8);
    else if (targetId.startsWith("manual:"))  body.project_name = targetId.slice(7);
    const ok = await put(body);
    if (ok) await reload();
    setPosting(false);
  }

  /** Create a persistent manual site (or surface the existing one) and
   *  return the encoded column id ("manual:<name>") so the form can
   *  stage it as the worker's next target. Null on failure — the user
   *  has already been alerted. */
  async function addManualProject(projectName: string): Promise<string | null> {
    try {
      const res = await fetch("/api/admin/board-manual-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        return null;
      }
      const body = await res.json().catch(() => ({}));
      // Server normalised the name (trim + collapse whitespace); use
      // what came back, not the raw input, so the encoded id matches
      // what the merged column list will emit.
      const finalName = (body?.manual_project?.name ?? projectName).trim();
      await reload();
      return `manual:${finalName}`;
    } catch {
      alert("שגיאת רשת — נסה שוב.");
      return null;
    }
  }
  async function removeCard(c: WorkerChipData) {
    if (!c.isManual || !c.assignmentId) return;
    if (!confirm(`להסיר את "${c.label}" מהלוח?`)) return;
    await put({ action: "unassign_row", id: c.assignmentId });
    await reload();
  }

  // ── Render ───────────────────────────────────────────────────────────
  // Errors still get their own dead-end screen — there is nothing useful
  // to keep mounted underneath. But the load-vs-refresh split moves into
  // StaleRefresh so the board stays on screen during a post-drop reload:
  // first-time loads still render the centred spinner, subsequent
  // reloads dim the board for a beat instead of flashing.
  if (error || (!loading && !data)) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <AlertTriangle size={32} className="text-amber-500" />
        <p className="text-sm text-charcoal/70">{error ?? "אין נתונים."}</p>
        <button onClick={reload}
          className="flex items-center gap-1.5 border border-accent/40 text-accent rounded px-3 py-1.5 text-sm hover:bg-accent/10">
          <RefreshCw size={13} /> נסה שוב
        </button>
      </div>
    );
  }

  return (
    <StaleRefresh loading={loading} hasContent={!!data}>
      {data && <BoardView />}
    </StaleRefresh>
  );

  // Extracted into a closure so the JSX below stays inline with the data!=null
  // narrowing. Pulling it out keeps the StaleRefresh return-shape one-liner
  // tidy without splitting the whole tab into a new file. The guard re-asserts
  // for TypeScript what the call site already enforces ({data && ...}).
  function BoardView() {
    if (!data) return null;
    return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-xs text-charcoal/70 leading-snug">
          {tapMode
            ? "הקש על עובד לבחירת אתר. עובדים: " + data.workers.length + ", אתרים פעילים: " + data.projects.length + "."
            : "גרור עובד לאתר. עובד אחד = אתר אחד. עובדים: " + data.workers.length + ", אתרים פעילים: " + data.projects.length + "."}
        </p>
        <button onClick={reload}
          className="flex items-center gap-1 text-xs text-charcoal/65 hover:text-accent shrink-0">
          <RefreshCw size={12} /> רענן
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* Unassigned strip — top, full width. */}
        <UnassignedStrip
          id={UNASSIGNED_ID}
          cards={unassignedCards}
          tapMode={tapMode}
          onChipTap={onChipTap}
        />

        {/* Site grid — 1 / 2 / 3 cols. All sites visible at once. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {data.projects.map((p) => (
            <SiteCard
              key={p.id}
              id={columnIdForRealProject(p.id)}
              title={p.name}
              cards={cardsForKey(p.id)}
              variant="project"
              tapMode={tapMode}
              onChipTap={onChipTap}
              onChipRemove={removeCard}
            />
          ))}
          {manualProjectKeys.map((k) => (
            <SiteCard
              key={k}
              id={k}
              title={k.slice(7)}
              cards={cardsForKey(k)}
              variant="manual_project"
              tapMode={tapMode}
              onChipTap={onChipTap}
              onChipRemove={removeCard}
            />
          ))}
        </div>
      </DndContext>

      <BoardManualEntry
        targetOptions={targetOptions.map((t) => ({ value: t.id, label: t.label }))}
        onAddWorker={addManualWorker}
        onAddManualProject={addManualProject}
        posting={posting}
      />

      <MoveToDialog
        open={!!moveDialog}
        worker={moveDialog?.worker ?? null}
        targets={dialogTargets}
        currentColumnId={moveDialog?.currentColumnId ?? null}
        onPick={async (t) => {
          if (!moveDialog) return;
          const w = moveDialog.worker;
          setMoveDialog(null);
          await moveChipTo(w, t.id);
        }}
        onClose={() => setMoveDialog(null)}
      />
    </div>
    );
  }
}
