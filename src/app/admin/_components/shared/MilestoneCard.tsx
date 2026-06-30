"use client";

/**
 * MilestoneCard — one payment milestone row inside ProjectMilestonesSection.
 * Pure presentation + local edit/payment input toggles; every mutating
 * action goes back to the parent through a callback so the parent owns
 * the fetch + refresh loop (principle #3).
 *
 * Colour story (mobile-first; tested against a wall of cards at 360px):
 *   future            — neutral charcoal frame, calm.
 *   due, unpaid       — red-50/red-300, signals "chase this".
 *   due, partial paid — amber-50/amber-300, signals "in motion".
 *   paid              — green-50/green-200 + dimmed, signals "done".
 *
 * Payment UX is the only non-obvious bit: paid_amount is a CUMULATIVE
 * total, not a delta. The inline input pre-fills with the current
 * paid_amount so the contractor edits the running total. A live
 * "תוספת: ₪X" hint reads off the typed delta so they never have to
 * subtract in their head.
 */

import { useState } from "react";
import { Loader2, Pencil, X, ArrowUp, ArrowDown, Check, RotateCcw, Calendar } from "lucide-react";

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  amount: number | string;        // Supabase numeric → string
  paid_amount: number | string;
  status: "future" | "due" | "paid";
  sort_order: number;
  expected_date: string | null;   // YYYY-MM-DD
  note: string | null;
  marked_due_at: string | null;
  paid_at: string | null;
}

interface Props {
  milestone: Milestone;
  /** 1-based position in the project's milestone list. Drives the
   *  "שלב N" label so the contractor can refer to stages by number
   *  ("שלב 3 שולם"). Derived from list index in the parent — when
   *  sort_order changes via the move buttons, this updates after the
   *  refetch. NOT persisted in the DB. */
  index: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;                  // true while ANY action is in flight
  onTransition: (id: string, to: "future" | "due") => Promise<void>;
  onPayment: (id: string, paidAmount: number) => Promise<void>;
  onEdit: (id: string, patch: { title: string; amount: number; expected_date: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  // ISO YYYY-MM-DD → DD.MM.YYYY (Israeli short form).
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export default function MilestoneCard(p: Props) {
  const amount = num(p.milestone.amount);
  const paid = num(p.milestone.paid_amount);
  const remaining = Math.max(0, amount - paid);

  // Three semantic states — drives both colour and which buttons appear.
  const variant: "future" | "due-unpaid" | "due-partial" | "paid" =
    p.milestone.status === "paid"  ? "paid"
    : p.milestone.status === "future" ? "future"
    : paid > 0 ? "due-partial" : "due-unpaid";

  // Tailwind class bundles per variant — picked once at the top so the
  // JSX below stays readable instead of branching colour mid-element.
  const tone = {
    future: {
      card: "bg-bone/40 border-charcoal/20",
      badge: "bg-charcoal/[0.08] text-charcoal/80 border-charcoal/25",
      badgeText: "עתידי",
    },
    "due-unpaid": {
      card: "bg-red-50 border-red-300",
      badge: "bg-red-100 text-red-800 border-red-300",
      badgeText: "מוכן לגבייה",
    },
    "due-partial": {
      card: "bg-amber-50 border-amber-300",
      badge: "bg-amber-100 text-amber-900 border-amber-400",
      badgeText: "שולם חלקית",
    },
    paid: {
      card: "bg-green-50/70 border-green-200 opacity-80",
      badge: "bg-green-100 text-green-800 border-green-300",
      badgeText: "שולם",
    },
  }[variant];

  // ── Inline edit / payment local state (parent doesn't see until commit). ──
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(p.milestone.title);
  const [editAmount, setEditAmount] = useState(String(amount));
  const [editDate, setEditDate] = useState(p.milestone.expected_date ?? "");
  const [editErr, setEditErr] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payValue, setPayValue] = useState(String(paid));
  const [payErr, setPayErr] = useState<string | null>(null);

  function openEdit() {
    setEditTitle(p.milestone.title);
    setEditAmount(String(amount));
    setEditDate(p.milestone.expected_date ?? "");
    setEditErr(null);
    setEditing(true);
  }

  function openPay() {
    setPayValue(String(paid));
    setPayErr(null);
    setPayOpen(true);
  }

  async function submitEdit() {
    const titleTrim = editTitle.trim();
    const amt = Number(editAmount.replace(/,/g, ""));
    if (!titleTrim) { setEditErr("חובה כותרת"); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setEditErr("סכום חייב להיות חיובי"); return; }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const cleanDate = editDate.trim();
    if (cleanDate && !datePattern.test(cleanDate)) { setEditErr("תאריך לא תקין (YYYY-MM-DD)"); return; }
    try {
      await p.onEdit(p.milestone.id, {
        title: titleTrim,
        amount: amt,
        expected_date: cleanDate || null,
      });
      setEditing(false);
    } catch (e) {
      setEditErr(String(e));
    }
  }

  async function submitPayment() {
    const newPaid = Number(payValue.replace(/,/g, ""));
    if (!Number.isFinite(newPaid) || newPaid < 0) { setPayErr("סכום לא תקין"); return; }
    try {
      await p.onPayment(p.milestone.id, newPaid);
      setPayOpen(false);
    } catch (e) {
      setPayErr(String(e));
    }
  }

  async function confirmDelete() {
    if (!confirm(`למחוק את "${p.milestone.title}"?`)) return;
    await p.onDelete(p.milestone.id);
  }

  // Live delta hint for the payment input — reads off how much would
  // be added on top of what's already recorded. Negative = correction.
  const payTyped = Number(payValue.replace(/,/g, ""));
  const payDelta = Number.isFinite(payTyped) ? payTyped - paid : 0;

  return (
    <div className={`border rounded-md p-3 space-y-2 ${tone.card}`}>
      {/* ── Headline: step number + amount (loud) + title + expected date ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {/* Step number — small uppercase tag above the amount. Reads
              as a chip the contractor can quote back ("שלב 3 שולם"). */}
          <p className="text-xs font-bold text-charcoal/75 tracking-wide leading-none mb-1">
            שלב {p.index}
          </p>
          <p className="text-lg font-bold text-charcoal tabular-nums leading-tight">
            {fmt(amount)}
          </p>
          <p className="text-sm font-semibold text-charcoal leading-snug">{p.milestone.title}</p>
          {p.milestone.expected_date && (
            <p className="text-xs text-charcoal/70 mt-0.5 flex items-center gap-1">
              <Calendar size={11} strokeWidth={2} /> צפי: {fmtDate(p.milestone.expected_date)}
            </p>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-md border whitespace-nowrap ${tone.badge}`}>
          {tone.badgeText}
        </span>
      </div>

      {/* Partial-payment status line — only when relevant. */}
      {variant === "due-partial" && (
        <p className="text-xs text-amber-900 font-semibold">
          שולם {fmt(paid)} מתוך {fmt(amount)} · נשאר {fmt(remaining)}
        </p>
      )}
      {variant === "paid" && (
        <p className="text-xs text-green-800">
          שולם במלואו{p.milestone.paid_at && ` · ${fmtDate(p.milestone.paid_at.slice(0, 10))}`}
        </p>
      )}

      {/* ── Inline edit form ───────────────────────────────────────── */}
      {editing && (
        <div className="bg-white/80 border border-charcoal/20 rounded p-2 space-y-2">
          <input
            value={editTitle} onChange={e => setEditTitle(e.target.value)}
            placeholder="כותרת"
            className="w-full text-sm border border-charcoal/25 px-2 py-1.5 bg-white focus:border-accent focus:outline-none"
          />
          <input
            value={editAmount} onChange={e => setEditAmount(e.target.value)}
            placeholder="סכום"
            dir="ltr" inputMode="decimal"
            className="w-full text-sm border border-charcoal/25 px-2 py-1.5 bg-white focus:border-accent focus:outline-none"
          />
          <input
            value={editDate} onChange={e => setEditDate(e.target.value)}
            placeholder="תאריך צפי (YYYY-MM-DD, אופציונלי)"
            type="date"
            dir="ltr"
            className="w-full text-sm border border-charcoal/25 px-2 py-1.5 bg-white focus:border-accent focus:outline-none"
          />
          {editErr && <p className="text-xs text-red-700 font-semibold">{editErr}</p>}
          <div className="flex gap-2">
            <button onClick={submitEdit} disabled={p.busy}
              className="flex-1 text-sm font-semibold bg-accent text-bone px-3 py-1.5 rounded hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-1">
              {p.busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} שמור
            </button>
            <button onClick={() => setEditing(false)}
              className="text-sm border border-charcoal/25 text-charcoal/75 px-3 py-1.5 rounded hover:border-accent">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* ── Inline payment input ────────────────────────────────────── */}
      {payOpen && (
        <div className="bg-white/80 border border-charcoal/20 rounded p-2 space-y-2">
          <label className="block text-xs font-semibold text-charcoal/85">
            סכום ששולם עד כה (מצטבר)
          </label>
          <input
            value={payValue} onChange={e => setPayValue(e.target.value)}
            placeholder="0"
            dir="ltr" inputMode="decimal" autoFocus
            className="w-full text-base font-semibold tabular-nums border border-charcoal/25 px-2 py-2 bg-white focus:border-accent focus:outline-none"
          />
          {Number.isFinite(payTyped) && payDelta !== 0 && (
            <p className="text-xs text-charcoal/80">
              תוספת: <span className="font-bold tabular-nums">{payDelta > 0 ? "+" : ""}{fmt(payDelta)}</span>
              {payTyped >= amount && <span className="text-green-700"> · שולם במלואו</span>}
            </p>
          )}
          {payErr && <p className="text-xs text-red-700 font-semibold">{payErr}</p>}
          <div className="flex gap-2">
            <button onClick={submitPayment} disabled={p.busy}
              className="flex-1 text-sm font-semibold bg-accent text-bone px-3 py-1.5 rounded hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-1">
              {p.busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} שמור
            </button>
            <button onClick={() => setPayOpen(false)}
              className="text-sm border border-charcoal/25 text-charcoal/75 px-3 py-1.5 rounded hover:border-accent">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* ── Action row — varies by variant ──────────────────────────── */}
      {!editing && !payOpen && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {variant === "future" && (
            <button onClick={() => p.onTransition(p.milestone.id, "due")} disabled={p.busy}
              className="text-sm font-semibold bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-40">
              סמן כמוכן לגבייה
            </button>
          )}

          {(variant === "due-unpaid" || variant === "due-partial") && (
            <>
              <button onClick={openPay} disabled={p.busy}
                className="text-sm font-semibold bg-accent text-bone px-3 py-1.5 rounded hover:bg-accent-dark disabled:opacity-40">
                {variant === "due-partial" ? "עדכן תשלום" : "רשום תשלום"}
              </button>
              <button onClick={() => p.onTransition(p.milestone.id, "future")} disabled={p.busy}
                title="החזר לעתידי" aria-label="החזר לעתידי"
                className="text-sm border border-charcoal/30 text-charcoal/80 px-3 py-1.5 rounded hover:border-accent flex items-center gap-1">
                <RotateCcw size={12} /> החזר לעתידי
              </button>
            </>
          )}

          {variant === "paid" && (
            <button onClick={() => p.onPayment(p.milestone.id, 0)} disabled={p.busy}
              title="אפס תשלום (חוזר למוכן לגבייה)" aria-label="ביטול תשלום"
              className="text-sm border border-charcoal/30 text-charcoal/80 px-3 py-1.5 rounded hover:border-accent flex items-center gap-1">
              <RotateCcw size={12} /> ביטול תשלום
            </button>
          )}

          {/* Row utilities: sort, edit, delete — pushed end-of-row. */}
          <div className="ms-auto flex items-center gap-1">
            <button onClick={() => p.onMove(p.milestone.id, "up")} disabled={p.busy || p.isFirst}
              title="העבר למעלה" aria-label="העבר למעלה"
              className="p-1.5 text-charcoal/70 hover:text-accent disabled:opacity-25">
              <ArrowUp size={14} />
            </button>
            <button onClick={() => p.onMove(p.milestone.id, "down")} disabled={p.busy || p.isLast}
              title="העבר למטה" aria-label="העבר למטה"
              className="p-1.5 text-charcoal/70 hover:text-accent disabled:opacity-25">
              <ArrowDown size={14} />
            </button>
            <button onClick={openEdit} disabled={p.busy}
              title="ערוך" aria-label="ערוך"
              className="p-1.5 text-charcoal/70 hover:text-accent">
              <Pencil size={14} />
            </button>
            <button onClick={confirmDelete} disabled={p.busy}
              title="מחק" aria-label="מחק"
              className="p-1.5 text-red-600 hover:text-red-800">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
