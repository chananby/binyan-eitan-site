/**
 * Pure attendance decision logic — extracted from the clock-in/out route
 * handlers (/api/attendance, /api/twilio/voice/action) and the manual-entry
 * route so the rules can be unit-tested without a DB or a request.
 *
 * Two concerns live here:
 *   1. Open-record detection — drives the "block a second clock-in" guard.
 *   2. Manual work-row planning — entry-only vs entry+exit.
 *
 * Both action vocabularies coexist in the data: the live web/IVR flow stores
 * "in"/"out"; manual entry stores "כניסה"/"יציאה". isEntry/isExit normalise.
 */

import { isEntry, isExit } from "./attendance-time";

export interface AttEvent {
  action: string;
  clock_at: string | null;
}

/**
 * True when an unclosed entry exists within the caller's time window —
 * driven by the LAST chronological event in that window: an entry means
 * the shift is still open, an exit means it's closed.
 *
 * Why last-event, not ins-minus-outs: the count-based version was correct
 * for the B2 same-day guard (dayStartISO = today's Israel-local midnight,
 * so exits never survived past the shift they closed), but wrong for B3
 * (windowStartISO = now-24h, a rolling window). Under B3 a worker who did
 *
 *     yesterday 07:00 IN → 15:00 OUT → today 07:00 IN
 *
 * had ins=1, outs=1 in the 24h window at 14:00 today. The count came out
 * to zero, so the guard reported "no open entry" and blocked the OUT —
 * even though today's IN was manifestly unclosed. Fifteen active workers
 * hit this on 2026-07-06 before the fix landed.
 *
 * Last-event semantics collapse cleanly for the B2 case too — a worker
 * who ran (IN, OUT) today has last-event = OUT = closed, so a fresh IN
 * is allowed; a worker who ran (IN, OUT, IN) still open today has
 * last-event = IN, blocked. Same answers as the old count for every B2
 * shape, correct answers for B3.
 *
 * Filtering rules preserved from the count-based version:
 *   • rows with `clock_at < windowStartISO` are excluded (window scope)
 *   • rows with `clock_at == null` are excluded (absence markers carry
 *     no clock time)
 *   • both action vocabularies ("in"/"out" and "כניסה"/"יציאה") count
 *     via isEntry/isExit — the manual-entry flow uses Hebrew, the live
 *     flow uses English, and they mix on the same worker
 *   • ISO-8601 UTC strings sort chronologically as plain strings, so a
 *     lexical sort is correct
 */
export function hasOpenRecord(rows: AttEvent[], windowStartISO: string): boolean {
  let latestEntry: string | null = null;
  let latestExit:  string | null = null;
  for (const r of rows) {
    if (r.clock_at == null || r.clock_at < windowStartISO) continue;
    if (isEntry(r.action)) {
      if (latestEntry == null || r.clock_at > latestEntry) latestEntry = r.clock_at;
    } else if (isExit(r.action)) {
      if (latestExit == null  || r.clock_at > latestExit)  latestExit  = r.clock_at;
    }
  }
  if (latestEntry == null) return false;
  return latestExit == null || latestEntry > latestExit;
}

export type ManualRowPlan = { action: "כניסה" | "יציאה"; time: string };

/**
 * Rows a manual WORK entry produces: always an entry; an exit only when an
 * exit time was supplied. Entry-only yields a single open record (closed
 * later via clock-out / "השלמת יציאה") — the same shape the live flow makes.
 */
export function planManualWorkRows(entryTime: string, exitTime?: string | null): ManualRowPlan[] {
  const rows: ManualRowPlan[] = [{ action: "כניסה", time: entryTime }];
  if (exitTime) rows.push({ action: "יציאה", time: exitTime });
  return rows;
}
