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

/** "DD/MM" calendar day in Israel timezone — for compact date display
 *  in multi-day list views (e.g. last-7-days log). en-GB locale is used
 *  rather than he-IL to get "/" separators that read cleanly LTR. */
export function israelDayMonth(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

/** "HH:MM" of the row's authoritative work time (clock_at, falling back
 *  to created_at). Replaces direct rendering of the legacy timestamp_label
 *  column, which mixes pure HH:MM (newer rows + phone-call rows) with
 *  full "DD.MM.YYYY, HH:MM" strings from older web check-ins. */
export function attendanceTimeHHMM(rec: { clock_at?: string | null; created_at?: string }): string {
  if (rec.clock_at) return israelTimeHHMM(new Date(rec.clock_at));
  if (rec.created_at) return israelTimeHHMM(new Date(rec.created_at));
  return "";
}

/** "DD/MM HH:MM" of the row's work time — for list views that span more
 *  than one calendar day so the reader can tell apart same-time rows from
 *  different days. */
export function attendanceDayTimeShort(rec: { clock_at?: string | null; created_at?: string }): string {
  const iso = rec.clock_at || rec.created_at;
  if (!iso) return "";
  const d = new Date(iso);
  return `${israelDayMonth(d)} ${israelTimeHHMM(d)}`;
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
