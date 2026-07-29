"use client";

// Headline P&L card on the admin dashboard. Two stories in one card:
//
//   • Top  — three big numbers for the CURRENT month: income (green),
//            expense (charcoal), net (green when positive, red when
//            negative). The number admins ask for first.
//   • Bot. — a 6-month trend strip: one bar per month, signed —
//            positive months grow up from a centre baseline, losses grow
//            down. CSS only, no chart dep. Renders consistently on a
//            360 px phone and a desktop card.
//
// Pure presentation. The parent (AdminPortal) owns the fetch + the
// StaleRefresh wrap, and passes both the loaded data and the loading
// flag in. Skipped entirely on the foreman portal (the parent gates).

import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./Card";
import type { PnlMonth, PnlResult } from "../../../../lib/finance-pnl";

const HE_MONTHS = [
  "ינו", "פבר", "מרץ", "אפר", "מאי", "יונ",
  "יול", "אוג", "ספט", "אוק", "נוב", "דצמ",
];

function fmtCurrency(n: number): string {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

function fmtSignedCurrency(n: number): string {
  if (n >= 0) return fmtCurrency(n);
  return "-" + fmtCurrency(Math.abs(n));
}

/** "YYYY-MM" → "יונ 2026" — short Hebrew month + year for the trend strip. */
function shortMonthLabel(yyyymm: string): string {
  const m = parseInt(yyyymm.slice(5, 7), 10) - 1;
  return Number.isFinite(m) && m >= 0 && m < 12 ? HE_MONTHS[m] : yyyymm.slice(5);
}

/** Full "יוני 2026" — for the current-month header. */
const HE_MONTHS_FULL = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
function fullMonthLabel(yyyymm: string): string {
  const m = parseInt(yyyymm.slice(5, 7), 10) - 1;
  const y = yyyymm.slice(0, 4);
  return Number.isFinite(m) && m >= 0 && m < 12 ? `${HE_MONTHS_FULL[m]} ${y}` : yyyymm;
}

export default function MonthlyPnlCard({
  data, loading,
}: {
  data: PnlResult | null;
  loading: boolean;
}) {
  return (
    <Card title="📊 מאזן חודשי">
      {data == null && loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-content">טוען…</span>
        </div>
      )}
      {data == null && !loading && (
        <p className="text-content text-muted text-center py-4">לא ניתן לטעון מאזן.</p>
      )}
      {data != null && <Content data={data} />}
    </Card>
  );
}

function Content({ data }: { data: PnlResult }) {
  const cur = data.current;
  // Symmetric scale so a tall income bar and a tall loss bar of the same
  // magnitude render the same height. Floor of 1 avoids a divide-by-zero
  // when every month is exactly 0.
  const maxAbsNet = Math.max(1, ...data.rows.map((r) => Math.abs(r.net)));

  return (
    <div className="space-y-4">
      {/* Current-month headline */}
      <div>
        <p className="text-caption text-muted mb-2">{fullMonthLabel(cur.month)}</p>
        {/* max-w so the 3 figures stay grouped, not spread across the wide card */}
        <div className="grid grid-cols-3 gap-3 max-w-2xl">
          <Stat label="הכנסה" value={cur.income} tone="income" />
          <Stat label="הוצאה" value={cur.expense} tone="expense" />
          <Stat label="יתרה"  value={cur.net}     tone="net" signed />
        </div>
        {/* Quiet disclaimer — without it a sharply negative יתרה reads as a
            real loss, while the bigger income picture (payment_milestones
            "צפי גבייה") is rendered on its own track. Spelling that out
            here keeps the card honest without raising alarm. */}
        <p className="text-caption text-muted text-center mt-2 leading-snug">
          הכנסות לפי מסמכים בלבד · גבייה צפויה מוצגת בנפרד
        </p>
      </div>

      {/* 6-month trend strip */}
      <div>
        <p className="text-caption text-muted mb-2 flex items-center gap-1.5">
          {cur.net >= 0
            ? <TrendingUp size={12} className="text-emerald-600" />
            : <TrendingDown size={12} className="text-red-600" />}
          מגמת {data.rows.length} חודשים (יתרה לחודש)
        </p>
        <TrendStrip rows={data.rows} maxAbs={maxAbsNet} />
      </div>
    </div>
  );
}

function Stat({
  label, value, tone, signed,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "net";
  signed?: boolean;
}) {
  // Income is the "good" green, expense is neutral charcoal (we don't want
  // the admin to read every expense as alarming), net flips green/red so
  // a glance tells you whether the month is in the black.
  const color =
    tone === "income"  ? "text-emerald-700" :
    tone === "expense" ? "text-charcoal" :
    value >= 0          ? "text-emerald-700" :
                          "text-red-600";
  return (
    <div className="text-center">
      <p className={`font-heading text-lg sm:text-xl font-bold tabular-nums ${color}`}>
        {signed ? fmtSignedCurrency(value) : fmtCurrency(value)}
      </p>
      <p className="text-caption text-muted mt-0.5">{label}</p>
    </div>
  );
}

function TrendStrip({ rows, maxAbs }: { rows: PnlMonth[]; maxAbs: number }) {
  // Container is split into two halves around a centre baseline. A positive
  // net pushes a bar up from the baseline; a negative net pushes one down.
  // Half-height in px is the visual ceiling: 28 px on phone, 36 px from sm
  // upward (chosen via Tailwind's responsive variants on the inner div).
  return (
    <div className="flex items-end justify-between gap-1.5 h-[72px] sm:h-[88px]">
      {rows.map((r) => {
        const pct = Math.min(100, (Math.abs(r.net) / maxAbs) * 100);
        const positive = r.net >= 0;
        // Use the colour of the net direction. A month with net=0 renders
        // as a tiny grey baseline so the column doesn't disappear.
        const barColor = r.net === 0
          ? "bg-charcoal/15"
          : positive ? "bg-emerald-500" : "bg-red-500";
        return (
          <div key={r.month} className="flex-1 min-w-0 flex flex-col items-center">
            {/* Top half — only positive months draw here */}
            <div className="w-full h-[28px] sm:h-[36px] flex items-end">
              {positive && r.net !== 0 && (
                <div
                  className={`w-full ${barColor} rounded-t-sm transition-all duration-300`}
                  style={{ height: `${pct}%` }}
                  title={`${fmtSignedCurrency(r.net)} ב-${r.month}`}
                />
              )}
            </div>
            {/* Baseline — thin charcoal line, always rendered */}
            <div className="w-full h-px bg-charcoal/30" />
            {/* Bottom half — only negative (or net=0 baseline) months draw here */}
            <div className="w-full h-[28px] sm:h-[36px] flex items-start">
              {!positive && (
                <div
                  className={`w-full ${barColor} rounded-b-sm transition-all duration-300`}
                  style={{ height: `${pct}%` }}
                  title={`${fmtSignedCurrency(r.net)} ב-${r.month}`}
                />
              )}
            </div>
            <p className="text-caption text-muted mt-1 tabular-nums">{shortMonthLabel(r.month)}</p>
          </div>
        );
      })}
    </div>
  );
}
