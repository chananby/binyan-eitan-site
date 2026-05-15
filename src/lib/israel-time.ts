/**
 * Convert "wall clock" time in Asia/Jerusalem to a UTC ISO string,
 * accounting for DST (winter UTC+2, summer UTC+3).
 *
 * Replaces the bug where attendance code hardcoded `+03:00` year-round.
 *
 * @param ymd "YYYY-MM-DD"
 * @param hm  "HH:MM" (24-hour)
 * @returns   ISO-8601 string in UTC
 */
export function israelWallClockToISO(ymd: string, hm: string, seconds = 0): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);

  // Start with naive UTC = wall clock numbers treated as UTC.
  const naive = Date.UTC(y, mo - 1, d, h, mi, seconds);

  // Format `naive` in Asia/Jerusalem and parse back to compute the offset
  // that applies at that wall-clock moment (handles DST automatically).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(naive));

  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const jerusalemMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = jerusalemMs - naive;

  // UTC corresponding to that Jerusalem wall-clock time.
  return new Date(naive - offsetMs).toISOString();
}

/** Start of day in Israel time → UTC ISO string */
export function israelDayStartISO(ymd: string): string {
  return israelWallClockToISO(ymd, "00:00", 0);
}

/** End of day in Israel time → UTC ISO string */
export function israelDayEndISO(ymd: string): string {
  return israelWallClockToISO(ymd, "23:59", 59);
}
