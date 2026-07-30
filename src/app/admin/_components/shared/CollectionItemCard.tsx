"use client";

/**
 * CollectionItemCard — one ripened milestone inside the global
 * "what to collect right now" screen. Same payment-input UX as
 * MilestoneCard (cumulative paid_amount, pre-filled, live delta
 * hint), but stripped of edit/reorder/delete since this surface
 * is a chase-list, not a milestone editor — those actions belong
 * to the per-project card under ProjectsTab.
 *
 * Colour story matches MilestoneCard:
 *   due, unpaid    — red-50 + red-300, signals "chase this".
 *   due, partial   — amber-50 + amber-300, signals "money in motion".
 *
 * Pure presentation; the parent (CollectionsTab) owns the fetch + the
 * payment round-trip (#3).
 */

import { useState } from "react";
import { Loader2, Check, Calendar, Clock } from "lucide-react";

export interface CollectionsMilestone {
  id: string;
  project_id: string;
  title: string;
  amount: number | string;
  paid_amount: number | string;
  status: "future" | "due" | "paid";
  expected_date: string | null;
  marked_due_at: string | null;
  remaining: number;
}

interface Props {
  milestone: CollectionsMilestone;
  busy: boolean;
  onPayment: (id: string, paidAmount: number) => Promise<void>;
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
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** "מוכן מאז" line: prefer a relative phrase ("היום", "אתמול",
 *  "לפני N ימים") for the recent past; fall back to the absolute
 *  date once it gets old enough that days-ago stops carrying weight. */
function ripenedAgo(iso: string | null): string {
  if (!iso) return "מוכן";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "מוכן";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "מוכן מאז: היום";
  if (days === 1) return "מוכן מאז: אתמול";
  if (days <= 30) return `מוכן מאז: לפני ${days} ימים`;
  return `מוכן מאז: ${fmtDate(iso.slice(0, 10))}`;
}

export default function CollectionItemCard(p: Props) {
  const amount = num(p.milestone.amount);
  const paid = num(p.milestone.paid_amount);
  const remaining = num(p.milestone.remaining);
  const isPartial = paid > 0;

  // Card tone matches MilestoneCard so the contractor scans the same
  // colour language across both screens.
  const tone = isPartial
    ? "bg-amber-50 border-amber-300"
    : "bg-red-50 border-red-300";
  const badgeTone = isPartial
    ? "bg-amber-100 text-amber-900 border-amber-400"
    : "bg-red-100 text-red-800 border-red-300";
  const badgeText = isPartial ? "שולם חלקית" : "מוכן לגבייה";

  const [payOpen, setPayOpen] = useState(false);
  const [payValue, setPayValue] = useState(String(paid));
  const [payErr, setPayErr] = useState<string | null>(null);

  function openPay() {
    setPayValue(String(paid));
    setPayErr(null);
    setPayOpen(true);
  }

  async function submitPay() {
    const newPaid = Number(payValue.replace(/,/g, ""));
    if (!Number.isFinite(newPaid) || newPaid < 0) { setPayErr("סכום לא תקין"); return; }
    try {
      await p.onPayment(p.milestone.id, newPaid);
      setPayOpen(false);
    } catch (e) {
      setPayErr(String(e));
    }
  }

  const payTyped = Number(payValue.replace(/,/g, ""));
  const payDelta = Number.isFinite(payTyped) ? payTyped - paid : 0;

  return (
    <div className={`border rounded-md p-3 space-y-2 ${tone}`}>
      {/* Headline: remaining amount (the figure the contractor chases),
          title, ripeness clock, expected date if any. */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-charcoal tabular-nums leading-tight">
            {fmt(remaining)}
            {isPartial && (
              <span className="ms-1.5 text-content font-semibold text-amber-900">
                מתוך {fmt(amount)}
              </span>
            )}
          </p>
          <p className="text-content font-semibold text-charcoal leading-snug">{p.milestone.title}</p>
          <p className="text-content text-charcoal/75 mt-0.5 flex items-center gap-1">
            <Clock size={11} strokeWidth={2} /> {ripenedAgo(p.milestone.marked_due_at)}
          </p>
          {p.milestone.expected_date && (
            <p className="text-content text-charcoal/70 flex items-center gap-1">
              <Calendar size={11} strokeWidth={2} /> צפי: {fmtDate(p.milestone.expected_date)}
            </p>
          )}
        </div>
        <span className={`text-micro font-bold px-2 py-1 rounded-md border whitespace-nowrap ${badgeTone}`}>
          {badgeText}
        </span>
      </div>

      {/* Inline payment input — same UX as MilestoneCard so muscle
          memory carries between the two screens. */}
      {payOpen ? (
        <div className="bg-white/80 border border-charcoal/25 rounded p-2 space-y-2">
          <label className="block text-caption font-semibold text-charcoal/85">
            סכום ששולם עד כה (מצטבר)
          </label>
          <input
            value={payValue} onChange={e => setPayValue(e.target.value)}
            placeholder="0"
            dir="ltr" inputMode="decimal" autoFocus
            className="w-full text-base font-semibold tabular-nums border border-charcoal/25 px-2 py-2 bg-white focus:border-accent focus:outline-none"
          />
          {Number.isFinite(payTyped) && payDelta !== 0 && (
            <p className="text-content text-charcoal/80">
              תוספת: <span className="font-bold tabular-nums">{payDelta > 0 ? "+" : ""}{fmt(payDelta)}</span>
              {payTyped >= amount && <span className="text-green-700"> · שולם במלואו</span>}
            </p>
          )}
          {payErr && <p className="text-caption text-red-700 font-semibold">{payErr}</p>}
          <div className="flex gap-2">
            <button onClick={submitPay} disabled={p.busy}
              className="flex-1 text-sm font-semibold bg-accent text-bone px-3 py-1.5 rounded hover:bg-accent-dark disabled:opacity-40 flex items-center justify-center gap-1">
              {p.busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} שמור
            </button>
            <button onClick={() => setPayOpen(false)}
              className="text-sm border border-charcoal/25 text-charcoal/75 px-3 py-1.5 rounded hover:border-accent">
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button onClick={openPay} disabled={p.busy}
          className="w-full text-sm font-semibold bg-accent text-bone px-3 py-2 rounded hover:bg-accent-dark disabled:opacity-40">
          {isPartial ? "עדכן סכום שהתקבל" : "קיבלתי תשלום"}
        </button>
      )}
    </div>
  );
}
