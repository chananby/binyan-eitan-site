/**
 * israel-week — date helpers for the Israeli construction work week.
 *
 * Sun–Thu (5 days). Fri/Sat are skipped from displayed week ranges:
 * a "week" here always starts on Sunday in local time. The same model
 * is shared by the existing WeeklyPlanner (matrix) and the upcoming
 * weekly worker-schedule UI — keeping the math in one place means a
 * day-naming bug fix lands once and both surfaces benefit.
 *
 * Pure JS. No DB, no I/O. All dates returned as YYYY-MM-DD strings in
 * local time (Israel TZ on Vercel by virtue of TZ=Asia/Jerusalem).
 * Internal Date math uses noon timestamps to dodge DST edge cases.
 */

/** Israeli construction work week length, in days, starting Sunday.
 *  Currently 5 (Sun, Mon, Tue, Wed, Thu); raise to 6 to include Friday
 *  if the policy changes. */
export const WEEK_DAYS = 5;

/** YYYY-MM-DD in local timezone. Avoids the TZ shift bug that
 *  `toISOString()` introduces when local time is on one side of midnight
 *  and UTC on the other (e.g. midnight Sun in IL = 22:00 Sat UTC →
 *  toISOString would say Saturday). */
export function localISODate(d: Date): string {
  return d.toLocaleDateString("sv-SE"); // "sv-SE" gives YYYY-MM-DD format
}

/** YYYY-MM-DD for "today" in Israel local time, regardless of where the
 *  server thinks it lives. Vercel functions run with TZ=UTC by default,
 *  so a naive `new Date().toLocaleDateString("sv-SE")` returns the UTC
 *  date — which is the *previous* day from ~22:00 IL onward (and lags
 *  by two hours every night during the DST gap). We pin the timezone to
 *  Asia/Jerusalem explicitly here so the unified board can ask "what is
 *  today on site?" without caring about the deployment environment.
 *
 *  Reference for the unified-board work: schedule_assignments rows are
 *  per-date, and the live board projects "WHERE date = todayLocal()". A
 *  half-day skew between server and site would silently break the
 *  "what's happening now" view, so this helper is the single, audited
 *  source of `today`. */
export function todayLocal(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
}

/** Sunday of the week containing `date` (Israeli week start, day 0).
 *  Returns a YYYY-MM-DD string in local time. */
export function getSundayLocal(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to nearest Sunday (incl. today)
  return localISODate(d);
}

/** Add (or subtract, with negative n) whole weeks to a Sunday-ISO date.
 *  Uses noon to avoid DST edge cases when the boundary shifts an hour. */
export function addWeeks(sundayISO: string, n: number): string {
  const d = new Date(sundayISO + "T12:00:00");
  d.setDate(d.getDate() + n * 7);
  return localISODate(d);
}

/** "DD.M – DD.M" range for the displayed work week
 *  (Sun + WEEK_DAYS-1 = Thu). */
export function weekLabel(sundayISO: string): string {
  const d = new Date(sundayISO + "T12:00:00");
  const end = new Date(sundayISO + "T12:00:00");
  end.setDate(end.getDate() + (WEEK_DAYS - 1));
  const fmt = (x: Date) => x.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  return `${fmt(d)} – ${fmt(end)}`;
}

/** Approximate week number for visual anchoring. NOT ISO-compliant —
 *  the number itself is unimportant; it's kept so adjacent rows read as
 *  "next/previous week" at a glance. */
export function weekNumber(sundayISO: string): number {
  const d = new Date(sundayISO + "T12:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}
