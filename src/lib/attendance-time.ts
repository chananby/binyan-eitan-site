/**
 * Attendance time helpers — small, dependency-free primitives shared by
 * the worker-history feature. The existing payroll-aggregate, report
 * endpoint, and self-history each have their own local copies of these
 * concepts; we intentionally do NOT touch them here (see commit history
 * and the per-file diffs for why each one diverged).
 *
 * Anything that mutates a money calculation must NOT be lifted here
 * without explicit review.
 */

export const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/** Authoritative work timestamp: prefer clock_at, fall back to created_at.
 *  Note: the self-history view in AttendanceForm also accepts a parsed
 *  timestamp_label as a middle fallback — that's a legacy compatibility
 *  layer not needed for new code, so we keep it out of here. */
export function workDate(rec: { clock_at?: string | null; created_at: string }): Date {
  return rec.clock_at ? new Date(rec.clock_at) : new Date(rec.created_at);
}

/** "YYYY-MM-DD" for a Date in Israel timezone (DST-aware via sv locale). */
export function israelYMD(d: Date): string {
  return d.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
}

/** "HH:MM" 24-hour clock in Israel timezone. */
export function israelTimeHHMM(d: Date): string {
  return d.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** True for the Hebrew "כניסה" or English "in" action labels. */
export function isEntry(action: string): boolean {
  return action === "in" || action === "כניסה";
}

/** True for the Hebrew "יציאה" or English "out" action labels. */
export function isExit(action: string): boolean {
  return action === "out" || action === "יציאה";
}

/** Day of week (0=Sun … 6=Sat) for a "YYYY-MM-DD" string.
 *  Uses UTC noon to dodge DST and locale ambiguity — the underlying
 *  calendar day is unambiguous at that anchor. */
export function dayOfWeekUTC(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

/** Hebrew day name for a "YYYY-MM-DD" string (ראשון … שבת). */
export function dayNameHE(ymd: string): string {
  return HE_DAYS[dayOfWeekUTC(ymd)];
}
