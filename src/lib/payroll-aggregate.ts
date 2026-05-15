/**
 * Shared payroll aggregation logic used by both:
 *   - /api/admin/payroll          (JSON view)
 *   - /api/admin/payroll/export   (XLSX export for accountant)
 *
 * Keeps three things in one place so a fix doesn't have to be applied twice:
 *   - per-staff × per-day grouping with firstIn/lastOut hours
 *   - per-staff vacation-day accumulation (half-day = 0.5)
 *   - gross-salary computation by employment type
 */

export interface PayrollStaff {
  id: string;
  employment_type: string;
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
}

export interface AttendanceRec {
  staff_id: string;
  action: string;
  clock_at: string | null;
  created_at: string;
}

export interface VacationRec {
  staff_id: string;
  half_day: boolean;
}

export interface AttendanceStats {
  days: number;
  hours: number;
}

/** Authoritative work timestamp: prefer clock_at, fall back to created_at. */
function workDate(rec: AttendanceRec): Date {
  return rec.clock_at ? new Date(rec.clock_at) : new Date(rec.created_at);
}

function toIsraelYMD(d: Date): string {
  return d.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
}

/** Group attendance by staff × work-date, return {days, hours} per staff.
 *  Records outside `monthPrefix` (YYYY-MM) are skipped — handles the ±1-day
 *  query widening that callers use to catch TZ edges. */
export function aggregateAttendance(
  records: AttendanceRec[],
  monthPrefix: string,
): Map<string, AttendanceStats> {
  const byStaff = new Map<string, Map<string, { entries: Date[]; exits: Date[] }>>();

  for (const rec of records) {
    const d = workDate(rec);
    const ymd = toIsraelYMD(d);
    if (!ymd.startsWith(monthPrefix)) continue;

    if (!byStaff.has(rec.staff_id)) byStaff.set(rec.staff_id, new Map());
    const byDate = byStaff.get(rec.staff_id)!;
    if (!byDate.has(ymd)) byDate.set(ymd, { entries: [], exits: [] });
    const day = byDate.get(ymd)!;
    if (rec.action === "in" || rec.action === "כניסה") day.entries.push(d);
    else if (rec.action === "out" || rec.action === "יציאה") day.exits.push(d);
  }

  // Accumulate raw ms across days; round once at the end so per-day rounding
  // drift (~9 min/month) doesn't accumulate.
  const out = new Map<string, AttendanceStats>();
  for (const [staffId, byDate] of byStaff) {
    let days = 0;
    let totalMs = 0;
    for (const day of byDate.values()) {
      const firstIn = day.entries[0];
      const lastOut = day.exits[day.exits.length - 1];
      if (!firstIn) continue;
      days++;
      if (lastOut) {
        const ms = lastOut.getTime() - firstIn.getTime();
        if (ms > 0) totalMs += ms;
      }
    }
    out.set(staffId, { days, hours: Math.round(totalMs / 36_000) / 100 });
  }
  return out;
}

/** Sum vacation days per staff (half-day = 0.5). */
export function aggregateVacation(records: VacationRec[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of records) {
    const v = r.half_day ? 0.5 : 1;
    out.set(r.staff_id, (out.get(r.staff_id) ?? 0) + v);
  }
  return out;
}

/** Gross salary by employment type. */
export function computeGross(s: PayrollStaff, stats: AttendanceStats): number {
  if (s.employment_type === "global") return s.monthly_global_salary ?? 0;
  if (s.employment_type === "daily")  return (s.daily_rate ?? 0) * stats.days;
  // hourly (default)
  return Math.round((s.hourly_rate ?? 0) * stats.hours * 100) / 100;
}
