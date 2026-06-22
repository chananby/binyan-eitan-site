"use client";

// BoardTab — worker-assignment board (PR 2/2).
//
// Layout: a horizontal scroll strip of columns — one per active project
// + one per manual project that exists in the assignments + a sticky
// "Unassigned" pool on the right (RTL, so visually-rightmost = first).
//
// Drag mechanics (dnd-kit):
//   • cards are useDraggable; columns are useDroppable.
//   • onDragEnd reads the dragged card's data + the dropped-on column id
//     and issues a PUT to /api/admin/board-assignments. Optimistic state
//     update first; on server failure we re-fetch to reconcile.
//
// "Real" workers vs "manual" workers:
//   • Real = staff row, FK on board_assignments.worker_id. One per
//     project (DB UNIQUE on worker_id). Unassigning a real worker just
//     removes the row.
//   • Manual = free-text label, worker_name. Each manual card is its
//     own assignment row identified by id. Unassigning deletes by row id.
//
// Manual entries: two small forms below the board — one for an ad-hoc
// worker label tagged to a chosen column, one for a brand-new manual
// column. Both POST and refresh.

import { useEffect, useMemo, useState } from "react";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import BoardColumn from "../shared/BoardColumn";
import { type BoardCardData } from "../shared/BoardCard";
import BoardManualEntry from "../shared/BoardManualEntry";
import {
  type BoardAssignment, type WorkerRef, type ProjectRef,
  groupByProject, unassignedWorkers, applyMoveOptimistic, UNASSIGNED_TARGET,
} from "../../../../lib/board-state";

const UNASSIGNED_ID = UNASSIGNED_TARGET;

// Stable encoding of card/column ids so onDragEnd can decode origin +
// target without a side table. Worker cards in the pool use
// "worker:<staffId>"; cards already on a column reuse the same form
// (the assignment row id only matters for manual unassignment).
const cardIdForRealWorker     = (workerId: string)    => `worker:${workerId}`;
const cardIdForManual         = (assignmentId: string) => `manual_card:${assignmentId}`;
const columnIdForRealProject  = (projectId: string)   => `project:${projectId}`;

interface BoardData {
  assignments: BoardAssignment[];
  workers: WorkerRef[];
  projects: ProjectRef[];
}

export default function BoardTab() {
  const [data, setData]       = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Manual-entry posting state — the form itself owns its inputs.
  const [posting, setPosting] = useState(false);

  // Sensors: PointerSensor covers mouse/touch on modern browsers;
  // TouchSensor is the iOS Safari belt for older quirks. Activation
  // distance 5px so a tap-to-click on a card doesn't accidentally drag.
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
        assignments: Array.isArray(d.assignments) ? d.assignments : [],
        workers:     Array.isArray(d.workers)     ? d.workers     : [],
        projects:    Array.isArray(d.projects)    ? d.projects    : [],
      });
    } catch {
      setError("שגיאת רשת — נסה שוב.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  // ── Derived: columns + cards ─────────────────────────────────────────
  // Real projects always show in order, even if empty. Manual projects
  // appear only when at least one assignment uses them. Unassigned pool
  // is computed from the staff list minus already-assigned workers.
  const grouped       = useMemo<Map<string, BoardAssignment[]>>(
    () => data ? groupByProject(data.assignments) : new Map(),
    [data],
  );
  const unassigned    = useMemo(() => data ? unassignedWorkers(data.workers, data.assignments) : [], [data]);
  const workersById   = useMemo(() => new Map((data?.workers ?? []).map((w) => [w.id, w])), [data]);
  const realProjectIds = useMemo(() => new Set((data?.projects ?? []).map((p) => p.id)), [data]);

  // Manual project keys are everything in the grouped map that isn't a
  // real project id. Sorted alphabetically (by the human-readable name
  // we strip out of the "manual:<name>" prefix) for stable display.
  const manualProjectKeys = useMemo(() => {
    if (!data) return [];
    const keys: string[] = [];
    for (const k of grouped.keys()) {
      if (k.startsWith("manual:")) keys.push(k);
    }
    return keys.sort();
  }, [grouped, data]);

  function cardsForKey(key: string): BoardCardData[] {
    const rows = grouped.get(key) ?? [];
    return rows.map((a) => {
      if (a.worker_id) {
        const w = workersById.get(a.worker_id);
        return {
          id: cardIdForRealWorker(a.worker_id),
          label: w?.name ?? a.worker_name ?? "—",
          role: w?.role ?? null,
          isManual: false,
          assignmentId: a.id,
        };
      }
      return {
        id: cardIdForManual(a.id),
        label: a.worker_name ?? "—",
        role: null,
        isManual: true,
        assignmentId: a.id,
      };
    });
  }
  const unassignedCards: BoardCardData[] = unassigned.map((w) => ({
    id: cardIdForRealWorker(w.id),
    label: w.name,
    role: w.role ?? null,
    isManual: false,
  }));

  // For the "+ עובד ידני" form's target dropdown — every real project +
  // every existing manual project (you can also add to an existing
  // manual column).
  const targetOptions = useMemo(() => {
    if (!data) return [];
    const opts: Array<{ value: string; label: string }> = [];
    for (const p of data.projects) opts.push({ value: columnIdForRealProject(p.id), label: p.name });
    for (const k of manualProjectKeys) opts.push({ value: k, label: k.slice(7) }); // strip "manual:"
    return opts;
  }, [data, manualProjectKeys]);

  // ── PUT helpers ──────────────────────────────────────────────────────
  async function put(body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/board-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        // Reload to reconcile any optimistic state.
        await reload();
        return false;
      }
      return true;
    } catch {
      alert("שגיאת רשת — נסה שוב.");
      await reload();
      return false;
    }
  }

  // ── Drag end: dispatch by source/target ──────────────────────────────
  async function onDragEnd(e: DragEndEvent) {
    if (!data) return;
    const card  = e.active.data.current as BoardCardData | undefined;
    const overId = e.over?.id as string | undefined;
    if (!card || !overId) return;

    // No-op drops are fine — just bail.
    // (We can't easily compute "same column" without tracking origin here;
    // server upsert handles same-spot drops as a benign re-write.)

    // Optimistic: apply the change locally first, then PUT. The pure
    // helper lives in board-state so it stays unit-testable.
    const nextAssignments = applyMoveOptimistic(data.assignments, card, overId);
    if (nextAssignments) setData({ ...data, assignments: nextAssignments });

    if (overId === UNASSIGNED_ID) {
      if (card.isManual && card.assignmentId) {
        await put({ action: "unassign_row", id: card.assignmentId });
      } else {
        const workerId = card.id.startsWith("worker:") ? card.id.slice(7) : "";
        if (!workerId) return;
        await put({ action: "unassign", worker_id: workerId });
      }
      return;
    }

    // Target is a project column — either real ("project:<id>") or
    // manual ("manual:<name>").
    if (overId.startsWith("project:")) {
      const projectId = overId.slice(8);
      if (card.isManual && card.assignmentId) {
        // Moving a manual card between columns = delete + re-insert.
        await put({ action: "unassign_row", id: card.assignmentId });
        await put({ action: "assign_manual_worker", worker_name: card.label, project_id: projectId });
        await reload();
      } else {
        const workerId = card.id.startsWith("worker:") ? card.id.slice(7) : "";
        if (!workerId) return;
        await put({ action: "assign", worker_id: workerId, project_id: projectId });
      }
      return;
    }
    if (overId.startsWith("manual:")) {
      const projectName = overId.slice(7);
      if (card.isManual && card.assignmentId) {
        await put({ action: "unassign_row", id: card.assignmentId });
        await put({ action: "assign_manual_worker", worker_name: card.label, project_name: projectName });
        await reload();
      } else {
        const workerId = card.id.startsWith("worker:") ? card.id.slice(7) : "";
        if (!workerId) return;
        await put({ action: "assign", worker_id: workerId, project_name: projectName });
      }
      return;
    }
  }

  // ── Manual-entry handlers (delegated from BoardManualEntry) ──────────
  async function addManualWorker(workerName: string, targetId: string) {
    setPosting(true);
    const body: Record<string, unknown> = {
      action: "assign_manual_worker",
      worker_name: workerName,
    };
    if      (targetId.startsWith("project:")) body.project_id   = targetId.slice(8);
    else if (targetId.startsWith("manual:"))  body.project_name = targetId.slice(7);
    const ok = await put(body);
    if (ok) await reload();
    setPosting(false);
  }

  async function removeCard(c: BoardCardData) {
    if (!c.isManual || !c.assignmentId) return;
    if (!confirm(`להסיר את "${c.label}" מהלוח?`)) return;
    await put({ action: "unassign_row", id: c.assignmentId });
    await reload();
  }

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-charcoal/50">
        <Loader2 size={18} className="animate-spin" /> טוען לוח שיבוץ…
      </div>
    );
  }
  if (error || !data) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-charcoal/55 leading-snug">
          גרור עובד מ"לא משובצים" לאתר. עובד אחד = אתר אחד. מאגר עובדים: {data.workers.length}, אתרים פעילים: {data.projects.length}.
        </p>
        <button onClick={reload}
          className="flex items-center gap-1 text-xs text-charcoal/50 hover:text-accent">
          <RefreshCw size={12} /> רענן
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-3 overflow-x-auto pb-2">
          {/* Unassigned pool — leftmost in RTL grid-flow */}
          <BoardColumn
            id={UNASSIGNED_ID}
            title="לא משובצים"
            cards={unassignedCards}
            variant="unassigned"
          />
          {/* Real projects */}
          {data.projects.map((p) => (
            <BoardColumn
              key={p.id}
              id={columnIdForRealProject(p.id)}
              title={p.name}
              cards={cardsForKey(p.id)}
              variant="project"
              onRemoveCard={removeCard}
            />
          ))}
          {/* Manual project columns (exist only if at least one assignment uses them) */}
          {manualProjectKeys
            .filter((k) => {
              // Hide a manual key if it accidentally matches a real one.
              const name = k.slice(7);
              return !data.projects.some((p) => p.name === name);
            })
            .map((k) => (
              <BoardColumn
                key={k}
                id={k}
                title={k.slice(7) + " (ידני)"}
                cards={cardsForKey(k)}
                variant="manual_project"
                onRemoveCard={removeCard}
              />
            ))}
        </div>
      </DndContext>

      <BoardManualEntry
        targetOptions={targetOptions}
        onAddWorker={addManualWorker}
        onStageManualProject={() => { /* form owns the staging — nothing to do server-side */ }}
        posting={posting}
      />
    </div>
  );
}

