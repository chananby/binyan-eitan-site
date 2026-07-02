/**
 * Attendance location-enforcement settings — read once per POST /api/attendance
 * request. Cheap: three key/value rows out of the settings table.
 *
 * Two-tier threshold model:
 *   • attendance_far_threshold_m  (existing, default 500)  — VISUAL only.
 *     Drives the DistanceFlag red chip in the admin/foreman views so a
 *     borderline clock lights up for review.
 *   • attendance_gps_enforce_radius_m (new, default 100)  — ENFORCEMENT.
 *     Above this, a clock-in is rejected outright and a clock-out is
 *     counted against the monthly remote-exit cap.
 * The two are deliberately independent — the visual threshold can stay
 * tighter (50m today) than the enforcement radius (100m) so admins see
 * borderline cases without workers getting blocked at the same distance.
 *
 * The `attendance_gps_enforce` switch is the emergency valve: flip it to
 * "off" via the admin Settings screen and the whole enforcement block
 * short-circuits before the SELECT ever runs. Distance is still measured
 * and recorded on the row — the switch only controls the guard, not the
 * observability.
 *
 * Absence handling: any missing key falls back to its default. The
 * settings query runs against RLS-protected `settings` — service_role
 * bypasses, so this must be called from a server route only.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface AttendanceEnforcementSettings {
  enforce: boolean;
  /** Above this many metres, in becomes 403 and out counts against the cap. */
  radiusMeters: number;
  /** Max "remote" (out-of-radius) clock-outs allowed per worker per calendar month. */
  monthlyRemoteExitCap: number;
}

const DEFAULTS: AttendanceEnforcementSettings = {
  enforce: false,       // default off — feature must be turned on explicitly
  radiusMeters: 100,
  monthlyRemoteExitCap: 3,
};

export async function loadAttendanceEnforcementSettings(
  supabase: SupabaseLike,
): Promise<AttendanceEnforcementSettings> {
  try {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "attendance_gps_enforce",
        "attendance_gps_enforce_radius_m",
        "attendance_remote_exit_monthly_cap",
      ]);
    const map = new Map<string, string>();
    for (const r of (data ?? []) as { key: string; value: string }[]) {
      map.set(r.key, r.value);
    }
    const rawEnforce = map.get("attendance_gps_enforce");
    const rawRadius  = map.get("attendance_gps_enforce_radius_m");
    const rawCap     = map.get("attendance_remote_exit_monthly_cap");
    const radiusN    = rawRadius != null ? parseInt(rawRadius, 10) : NaN;
    const capN       = rawCap    != null ? parseInt(rawCap, 10)    : NaN;
    return {
      enforce: rawEnforce === "on",
      radiusMeters:         Number.isFinite(radiusN) && radiusN > 0 ? radiusN : DEFAULTS.radiusMeters,
      monthlyRemoteExitCap: Number.isFinite(capN)    && capN    > 0 ? capN    : DEFAULTS.monthlyRemoteExitCap,
    };
  } catch {
    // Settings read failed — treat as enforcement OFF. Better to let a
    // legit clock through than to strand every worker on a settings
    // outage. The distance is still recorded on the row.
    return { ...DEFAULTS };
  }
}

/** Start of the current Israel-local calendar month, as an ISO string
 *  suitable for `.gte("clock_at", …)`. Anchored at noon UTC to skip DST
 *  seams. */
export function israelMonthStartISO(now: Date = new Date()): string {
  // "YYYY-MM" prefix in Israel's timezone → first-of-month at 00:00 IL.
  const ymd = now.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const firstOfMonth = `${ymd.slice(0, 7)}-01`;
  // 00:00 Israel-local = UTC minus offset (varies with DST). Anchor via
  // noon UTC of the same day and shift back 12h; matches the pattern the
  // israel-time helpers use elsewhere.
  const noon = new Date(`${firstOfMonth}T12:00:00Z`);
  return new Date(noon.getTime() - 12 * 3600 * 1000).toISOString();
}
