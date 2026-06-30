"use client";

/**
 * ProjectMilestonesSection — per-project payment-milestones block
 * inside a project card. Sits below ProjectBudgetSection in the same
 * accordion idiom: header line is always rendered, body opens on click.
 *
 * Owns the fetch + every mutating round-trip for this project's
 * milestones (#3 — the MilestoneCards below are pure presentation).
 * Data is loaded lazily — only when the accordion first opens — so a
 * page with 6 projects doesn't fire 6 milestone calls on mount.
 *
 * Optimistic-update is intentionally skipped here. The list is short
 * (3-10 rows), each API call < 100ms, and the room for state-drift
 * bugs around partial payments far outweighs the perceived snappiness.
 * Every action waits for the server response, then refetches.
 */

import { useState, useCallback } from "react";
import { Loader2, Plus, ChevronDown, ChevronUp, Wallet, Calendar } from "lucide-react";
import MilestoneCard, { type Milestone } from "./MilestoneCard";

interface MilestoneTotals {
  planned: number;
  collected: number;
  due: number;
  outstanding: number;
}

interface ApiPayload {
  milestones: Milestone[];
  totals: MilestoneTotals;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}
function fmt(n: number): string {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

export default function ProjectMilestonesSection({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Per-action busy flag — keeps double-clicks from racing the server.
  const [busy, setBusy] = useState(false);

  // Add-milestone inline form state (collapsed by default — same idiom
  // as the project-add form at the top of ProjectsTab).
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addErr, setAddErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // ── Header summary line ──────────────────────────────────────────
  // We need the "לגבייה: ₪X" hint even when collapsed. Fetch totals
  // once on first open; the header-only count comes from data.milestones
  // length so we don't ask for a separate count endpoint.
  const totalDue = data?.totals.due ?? 0;
  const count = data?.milestones.length ?? 0;
  const hasDue = totalDue > 0;

  // ── Fetch ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/payment-milestones?project_id=${projectId}`, { cache: "no-store" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setErr(b.error ?? `שגיאה ${res.status}`);
        return;
      }
      const d = (await res.json()) as ApiPayload;
      setData(d);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !data) void load();
  }

  // ── Mutating handlers — every one finishes with a fresh load() ────
  // so the totals + sort_order always reflect the server's view, never
  // an optimistic guess.
  async function withBusy<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    try { return await fn(); }
    catch (e) { setErr(String(e)); return null; }
    finally { setBusy(false); }
  }

  async function handleTransition(id: string, to: "future" | "due") {
    await withBusy(async () => {
      const res = await fetch(`/api/admin/payment-milestones/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        return;
      }
      await load();
    });
  }

  async function handlePayment(id: string, paid_amount: number) {
    await withBusy(async () => {
      const res = await fetch(`/api/admin/payment-milestones/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid_amount }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        return;
      }
      await load();
    });
  }

  async function handleEdit(id: string, patch: { title: string; amount: number; expected_date: string | null }) {
    await withBusy(async () => {
      const res = await fetch(`/api/admin/payment-milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        return;
      }
      await load();
    });
  }

  async function handleDelete(id: string) {
    await withBusy(async () => {
      const res = await fetch(`/api/admin/payment-milestones/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה: ${b.error ?? res.status}`);
        return;
      }
      await load();
    });
  }

  // Reorder: swap sort_order with neighbour. Two PATCHes in series.
  // Simple + predictable; no optimistic shuffle — wait for the server
  // and refetch so the new order is the canonical one.
  async function handleMove(id: string, direction: "up" | "down") {
    if (!data) return;
    const idx = data.milestones.findIndex(m => m.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= data.milestones.length) return;
    const a = data.milestones[idx];
    const b = data.milestones[swapIdx];
    await withBusy(async () => {
      // PATCH a.sort_order = b.sort_order; PATCH b.sort_order = a.sort_order.
      const r1 = await fetch(`/api/admin/payment-milestones/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      });
      if (!r1.ok) { alert("סידור נכשל"); return; }
      const r2 = await fetch(`/api/admin/payment-milestones/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      });
      if (!r2.ok) { alert("סידור נכשל"); return; }
      await load();
    });
  }

  // ── Add-milestone submit ──────────────────────────────────────────
  async function submitAdd() {
    const title = addTitle.trim();
    const amount = Number(addAmount.replace(/,/g, ""));
    const date = addDate.trim();
    if (!title) { setAddErr("חובה כותרת"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setAddErr("סכום חייב להיות חיובי"); return; }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setAddErr("תאריך לא תקין"); return; }
    setAdding(true); setAddErr(null);
    try {
      const res = await fetch(`/api/admin/payment-milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          title,
          amount,
          expected_date: date || null,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setAddErr(b.error ?? `שגיאה ${res.status}`);
        return;
      }
      // Reset form + collapse + refetch.
      setAddTitle(""); setAddAmount(""); setAddDate("");
      setAddOpen(false);
      await load();
    } catch (e) {
      setAddErr(String(e));
    } finally {
      setAdding(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="bg-bone/60 border border-charcoal/15 px-2.5 py-2 space-y-2">
      {/* Header — always rendered. Big tap target on mobile. */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between gap-2 text-start"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-charcoal/85 flex items-center gap-1.5">
          <Wallet size={13} strokeWidth={2} className="shrink-0" />
          אבני דרך לתשלום{count > 0 ? ` (${count})` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          {hasDue && (
            <span className="text-xs font-bold bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded">
              לגבייה: {fmt(totalDue)}
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-charcoal/70" /> : <ChevronDown size={14} className="text-charcoal/70" />}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="space-y-2 pt-1">
          {loading && (
            <p className="text-xs text-charcoal/70 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> טוען...
            </p>
          )}

          {err && (
            <p className="text-xs text-red-700 font-semibold">{err}</p>
          )}

          {!loading && data && data.milestones.length === 0 && (
            <p className="text-xs text-charcoal/70 text-center py-2">
              אין אבני דרך — הוסף את הראשונה למטה.
            </p>
          )}

          {data && data.milestones.length > 0 && (
            <div className="space-y-2">
              {data.milestones.map((m, i) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  index={i + 1}
                  isFirst={i === 0}
                  isLast={i === data.milestones.length - 1}
                  busy={busy}
                  onTransition={handleTransition}
                  onPayment={handlePayment}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMove={handleMove}
                />
              ))}
            </div>
          )}

          {/* Footer totals — only shown when there's something to total. */}
          {data && data.milestones.length > 0 && (
            <div className="border-t border-charcoal/20 pt-2 mt-1 text-xs space-y-0.5">
              <div className="flex justify-between tabular-nums">
                <span className="text-charcoal/75">סך הפרויקט</span>
                <span className="font-semibold text-charcoal">{fmt(num(data.totals.planned))}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-charcoal/75">נגבה עד כה</span>
                <span className="font-semibold text-green-800">{fmt(num(data.totals.collected))}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-charcoal/75">לגבייה עכשיו (מוכן)</span>
                <span className="font-bold text-red-700">{fmt(num(data.totals.due))}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-charcoal/75">סך פתוח (טרם הגיע + מוכן)</span>
                <span className="font-semibold text-charcoal/85">{fmt(num(data.totals.outstanding))}</span>
              </div>
            </div>
          )}

          {/* Add-milestone form — collapsed by default. */}
          <div className="pt-2">
            {!addOpen ? (
              <button onClick={() => setAddOpen(true)}
                className="w-full text-sm font-semibold border border-accent/50 text-accent px-3 py-2 rounded hover:bg-accent/10 flex items-center justify-center gap-1.5">
                <Plus size={14} /> הוסף אבן דרך
              </button>
            ) : (
              <div className="bg-white/80 border border-charcoal/25 rounded p-2 space-y-2">
                <input
                  value={addTitle} onChange={e => setAddTitle(e.target.value)}
                  placeholder="כותרת השלב (למשל: מקדמה, סיום הריסות)"
                  className="w-full text-sm border border-charcoal/25 px-2 py-1.5 bg-white focus:border-accent focus:outline-none"
                />
                <input
                  value={addAmount} onChange={e => setAddAmount(e.target.value)}
                  placeholder="סכום (כולל מע״מ)"
                  dir="ltr" inputMode="decimal"
                  className="w-full text-sm border border-charcoal/25 px-2 py-1.5 bg-white focus:border-accent focus:outline-none"
                />
                <div className="relative">
                  <input
                    value={addDate} onChange={e => setAddDate(e.target.value)}
                    placeholder="תאריך צפי (אופציונלי)"
                    type="date" dir="ltr"
                    className="w-full text-sm border border-charcoal/25 px-2 py-1.5 bg-white focus:border-accent focus:outline-none ps-7"
                  />
                  <Calendar size={12} className="absolute start-2 top-1/2 -translate-y-1/2 text-charcoal/55 pointer-events-none" />
                </div>
                {addErr && <p className="text-xs text-red-700 font-semibold">{addErr}</p>}
                <div className="flex gap-2">
                  <button onClick={submitAdd} disabled={adding}
                    className="flex-1 text-sm font-semibold bg-accent text-bone px-3 py-1.5 rounded hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-1">
                    {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} שמור
                  </button>
                  <button onClick={() => { setAddOpen(false); setAddErr(null); }}
                    className="text-sm border border-charcoal/25 text-charcoal/75 px-3 py-1.5 rounded hover:border-accent">
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
