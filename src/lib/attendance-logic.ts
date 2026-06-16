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
 * Net open entries for a single day: (#entries − #exits) among rows whose
 * clock_at is on/after `dayStartISO`.
 *
 * Day scoping is by clock_at (never created_at): a row entered *today* but
 * stamped for *yesterday* (clock_at < dayStart) is excluded, so it does not
 * count as open today. Rows with a null clock_at are excluded too (absence
 * markers carry no clock time). ISO-8601 UTC strings compare lexically in
 * chronological order, so a plain string `>=` is correct.
 */
export function openEntryCount(rows: AttEvent[], dayStartISO: string): number {
  const sameDay = rows.filter((r) => r.clock_at != null && r.clock_at >= dayStartISO);
  const ins  = sameDay.filter((r) => isEntry(r.action)).length;
  const outs = sameDay.filter((r) => isExit(r.action)).length;
  return ins - outs;
}

/**
 * True when an unclosed entry exists for the day — a new clock-in must be
 * blocked. This is the corrected guard: it fires only on an OPEN record, so
 * entry→exit→entry (already closed) is allowed while entry→entry (two open)
 * is rejected.
 */
export function hasOpenRecord(rows: AttEvent[], dayStartISO: string): boolean {
  return openEntryCount(rows, dayStartISO) > 0;
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
