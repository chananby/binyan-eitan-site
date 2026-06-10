/**
 * Worker self-alert: count PAST days where the worker clocked in but never
 * clocked out — a forgotten clock-out they can still fix.
 *
 * This is a read-only derivation over the records the worker already gets
 * from /api/worker/history; it adds no server endpoint and changes no
 * attendance logic. It mirrors the "no-exit" rule from
 * src/lib/worker-history-aggregate.ts, narrowed to the entry-without-exit
 * case (the literal "forgot to clock out"), and scoped to the retro window
 * the correction endpoints enforce — older days can't be corrected, so
 * alerting on them would be noise.
 *
 *   - today with an open entry  → "in-progress", still on shift   → NOT counted
 *   - a past day, entry + exit  → complete                        → NOT counted
 *   - a past day, entry, no exit, inside retro window             → counted
 *   - a past day outside the current/previous Israel month        → NOT counted
 *
 * Pending (unconfirmed) manual entries are ignored — they're not yet real
 * attendance, matching how HistoryScreen builds its day rows.
 */

import { workDate, israelYMD, isEntry, isExit } from "./attendance-time";

interface MissingExitRecord {
  action: string;
  clock_at?: string | null;
  created_at: string;
  status?: string;
}

/** Current or previous Israel-calendar month, by "YYYY-MM" prefix. Mirrors
 *  isWithinRetroWindow in /api/worker/corrections — keep the two in sync. */
function isRetroMonth(ymd: string, nowYM: string): boolean {
  const recordYM = ymd.slice(0, 7);
  const [y, m] = nowYM.split("-").map(Number);
  const prevYM = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return recordYM === nowYM || recordYM === prevYM;
}

export function countMissingExitDays(records: MissingExitRecord[]): number {
  const todayYmd = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const nowYM = todayYmd.slice(0, 7);

  // Group confirmed records by Israel-local day, tracking whether the day
  // has any entry / any exit.
  const byDay = new Map<string, { hasEntry: boolean; hasExit: boolean }>();
  for (const r of records) {
    if (r.status === "pending") continue;
    const ymd = israelYMD(workDate(r));
    if (ymd === todayYmd) continue;          // today's open shift is fine
    if (!isRetroMonth(ymd, nowYM)) continue; // too old to correct
    const day = byDay.get(ymd) ?? { hasEntry: false, hasExit: false };
    if (isEntry(r.action)) day.hasEntry = true;
    else if (isExit(r.action)) day.hasExit = true;
    byDay.set(ymd, day);
  }

  let count = 0;
  for (const day of byDay.values()) {
    if (day.hasEntry && !day.hasExit) count++;
  }
  return count;
}
