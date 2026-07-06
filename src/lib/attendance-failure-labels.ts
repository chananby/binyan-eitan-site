/**
 * Admin-facing Hebrew labels for attendance_failures.error_code.
 *
 * Not worker-facing — chnn + מוטי both read Hebrew, and the admin
 * panel is Hebrew-only, so no i18n indirection here (the worker-side
 * i18n system lives at src/app/components/attendance/i18n.ts for
 * completeness — that one covers 6 languages because workers can be
 * any of them).
 *
 * Kept as a pure data mapping so it can be unit-tested and imported
 * from any surface without pulling in React.
 */

export type FailureCode =
  | "gps_out_of_range"
  | "no_open_entry_to_close"
  | "location_required"
  | "monthly_remote_exit_cap_reached"
  | "account_inactive"
  | "server_error"
  | "already_clocked_in"
  | "session_expired"
  | "too_many_attempts"
  | "invalid_body"
  | "missing_action"
  | "invalid_action"
  | "access_denied";

export interface FailureLabel {
  /** Short Hebrew reason for the panel row. */
  short: string;
  /** Emphasis level — drives row color. `high` catches the eye for
   *  server_error (something is genuinely broken); `normal` for
   *  everyday worker-stuck cases (GPS, B3, etc.). */
  emphasis: "normal" | "high";
}

const LABELS: Record<FailureCode, FailureLabel> = {
  gps_out_of_range:                { short: "מחוץ לטווח האתר",              emphasis: "normal" },
  no_open_entry_to_close:          { short: "ניסה יציאה בלי כניסה פתוחה", emphasis: "normal" },
  location_required:               { short: "לא נשלח מיקום",                emphasis: "normal" },
  monthly_remote_exit_cap_reached: { short: "חרג ממכסת יציאות מרחוק",    emphasis: "normal" },
  account_inactive:                { short: "חשבון כבוי",                    emphasis: "normal" },
  server_error:                    { short: "שגיאה פנימית בשרת",             emphasis: "high"   },
  already_clocked_in:              { short: "ניסה כניסה שוב",              emphasis: "normal" },
  session_expired:                 { short: "פג תוקף התחברות",              emphasis: "normal" },
  too_many_attempts:               { short: "יותר מדי ניסיונות",           emphasis: "normal" },
  invalid_body:                    { short: "בקשה משובשת",                  emphasis: "normal" },
  missing_action:                  { short: "חסרה פעולה",                    emphasis: "normal" },
  invalid_action:                  { short: "פעולה לא תקינה",              emphasis: "normal" },
  access_denied:                   { short: "מקור לא מורשה",              emphasis: "high"   },
};

/** Look up a code. Falls back gracefully for unknown codes so a future
 *  route can add a code and the panel just shows the raw string until
 *  the mapping catches up. */
export function labelFor(code: string): FailureLabel {
  return LABELS[code as FailureCode] ?? { short: code, emphasis: "normal" };
}

/** Compose the panel row's line: label + optional distance detail. */
export function describeFailure(code: string, distanceM: number | null | undefined): string {
  const { short } = labelFor(code);
  if (code === "gps_out_of_range" && typeof distanceM === "number") {
    return `${short} (${distanceM} מ')`;
  }
  return short;
}

/** "לפני X דק'" / "לפני X שע'". Rounds to the nearest whole unit so a
 *  row that just landed reads as "לפני 0 דק'" rather than "לפני 3 שנ'". */
export function formatRelative(attemptedAt: string, nowMs: number = Date.now()): string {
  const then = new Date(attemptedAt).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMin = Math.max(0, Math.round((nowMs - then) / 60000));
  if (diffMin < 60) return `לפני ${diffMin} דק'`;
  const diffH = Math.round(diffMin / 60);
  return `לפני ${diffH} שע'`;
}
