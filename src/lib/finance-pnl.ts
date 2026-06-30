// Monthly Profit & Loss rollup for the admin dashboard ("מאזן חודשי").
//
// Pure functions, no DB / no I/O — the server fetches the documents and calls
// computeMonthlyPnl() exactly like budget-actual works. Two consequences:
//   • the rollup is trivially unit-testable, and
//   • a single bad row (missing date, garbage amount, "none" direction)
//     cannot poison the dashboard — it's filtered out before the sum.
//
// Definitions (locked):
//   month     = doc_date truncated to the first of the month, as 'YYYY-MM'.
//   income    = SUM(amount_ils)  direction='income',  status='approved'
//   expense   = SUM(amount_ils)  direction='expense', status='approved'
//   net       = income − expense (the "headline" number; positive = profit)
//   pending / rejected / direction='none' (quotes, delivery notes) → DROPPED
//     before any aggregation. The card is "where the money actually moved";
//     pending stays in budget-actual's pendingExpense, not here.
//
// The window is `months` calendar months ending with the current Israel-local
// month. Missing months in the middle are zero-filled so the bar strip and
// 6-month trend render contiguously — gaps would otherwise look like data
// loss instead of "no docs that month".

export interface PnlDoc {
  doc_date: string | null;
  direction: string | null;
  amount_ils: number | null;
  status: string | null;
}

export interface PnlMonth {
  /** 'YYYY-MM' — sortable + display-stable. */
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface PnlResult {
  /** One row per calendar month in the window, oldest → newest. */
  rows: PnlMonth[];
  /** Convenience: the current month (last row). Zero when no docs landed. */
  current: PnlMonth;
}

export interface PnlOptions {
  /** How many months back (inclusive of the current one). Default 6. */
  months?: number;
  /** Reference "now" — accepts an epoch ms so tests pin a deterministic
   *  current month. Production always passes Date.now(). */
  now?: number;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimals to keep agorot accurate without floating-point drift
 *  showing up in the rendered ₪. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** First 7 chars of a YYYY-MM-DD string. Returns null if the date is not
 *  recognisably a date — the caller's DB stores TIMESTAMP / DATE so the
 *  first 7 are the month either way; only truly missing / malformed values
 *  hit the null path. */
function monthKey(s: string | null): string | null {
  if (!s) return null;
  // Permissive: accept "2026-06-30", "2026-06-30T07:20:11Z", "2026/06/30",
  // etc. We just need YYYY-MM at the start.
  const m = /^(\d{4})[-/](\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** All YYYY-MM in the window (oldest first), driven by `now`. Israel-local
 *  isn't strictly necessary for month boundaries — a doc dated 2026-07-01
 *  belongs to July regardless of TZ — but using UTC Date math keeps the
 *  rollover behaviour consistent with the rest of the codebase (see
 *  payroll-forecast.ts which works the same way). */
function windowMonths(months: number, now: number): string[] {
  const out: string[] = [];
  const ref = new Date(now);
  // Walk backwards from the current month.
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${yyyy}-${mm}`);
  }
  return out;
}

export function computeMonthlyPnl(
  docs: ReadonlyArray<PnlDoc>,
  opts: PnlOptions = {},
): PnlResult {
  const months = opts.months ?? 6;
  const now = opts.now ?? Date.now();
  const window = windowMonths(months, now);
  const inWindow = new Set(window);

  // Pre-seed every month in the window with zeros so an empty middle month
  // renders as 0 / 0 / 0 instead of disappearing.
  const acc = new Map<string, PnlMonth>();
  for (const m of window) acc.set(m, { month: m, income: 0, expense: 0, net: 0 });

  for (const d of docs) {
    if (d.status !== "approved") continue;
    if (d.direction !== "income" && d.direction !== "expense") continue;
    const key = monthKey(d.doc_date);
    if (!key) continue;
    if (!inWindow.has(key)) continue;
    const amount = num(d.amount_ils);
    if (amount <= 0) continue;     // skip negatives / zeros (reversed entries
                                   // need a separate, explicit flow)
    const bucket = acc.get(key)!;  // guaranteed by inWindow.has(key)
    if (d.direction === "income")  bucket.income  += amount;
    else                            bucket.expense += amount;
  }

  // Finalise: round each axis once, then compute net from the rounded
  // values so income − expense always matches what the card renders.
  const rows: PnlMonth[] = window.map((m) => {
    const b = acc.get(m)!;
    const income = round2(b.income);
    const expense = round2(b.expense);
    return { month: m, income, expense, net: round2(income - expense) };
  });

  return { rows, current: rows[rows.length - 1] };
}
