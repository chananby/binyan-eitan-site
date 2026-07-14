/**
 * Safety net for `fix_time` correction approvals.
 *
 * Moving a clock-IN to the evening is almost always a mis-filed "I forgot to
 * clock OUT" — approving it overwrites the morning entry and the whole shift
 * vanishes from pay (0 hours). Even with the new structured request types, a
 * worker (or an older client) can still send a `fix_time` that does this, so
 * the admin panel flags it in red and demands an explicit confirm.
 *
 * Only ENTRY moves are dangerous: moving an EXIT is the normal, legitimate use
 * (worker left at 18:30, not 17:00). Two heuristics, either one trips the flag:
 *   1. an ENTRY moved to 12:00 or later (an afternoon/evening clock-in is odd)
 *   2. an ENTRY moved by more than 4 hours from its current time
 */

/** Minutes-since-midnight (Israel wall clock) of an ISO timestamp, or null. */
function israelMinutes(iso: string | null): number | null {
  if (!iso) return null;
  const hhmm = new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * @param action           the attendance row's action ("in"/"כניסה"/"out"/"יציאה")
 * @param currentClockAtIso the row's current clock_at (ISO), before the move
 * @param proposedHHMM      the worker's proposed "HH:MM"
 */
export function isSuspiciousTimeMove(
  action: string,
  currentClockAtIso: string | null,
  proposedHHMM: string | null,
): boolean {
  if (!proposedHHMM || !/^\d{2}:\d{2}$/.test(proposedHHMM)) return false;
  const isEntry = action === "in" || action === "כניסה";
  if (!isEntry) return false; // moving an exit is the normal fix — never flagged

  const [ph, pm] = proposedHHMM.split(":").map(Number);
  const proposedMin = ph * 60 + pm;

  // 1. Entry moved into the afternoon/evening.
  if (ph >= 12) return true;

  // 2. Entry moved more than 4 hours from where it is now.
  const curMin = israelMinutes(currentClockAtIso);
  if (curMin != null && Math.abs(proposedMin - curMin) > 4 * 60) return true;

  return false;
}
