/**
 * Pure aggregation for the monthly attendance report — one block per
 * worker, one row per calendar day in the month.
 *
 * Kept separate from payroll-aggregate.ts because the shape is different:
 *   • payroll-aggregate returns a single {days, hours} number per worker.
 *   • this returns a per-day timeline (present + absent + vacation rows,
 *     even for days the worker didn't clock at all), suitable for the
 *     printable / cuttable "send to worker for approval" report.
 *
 * No DB, no I/O — the endpoint feeds this pure data and gets back the
 * structure the UI + XLSX exporter can render without further logic.
 * Sundays–Fridays are all shown; Saturday is skipped from the day list
 * entirely (industry practice for Israeli construction; matches the
 * worker-history flow).
 */

import { workDate, israelYMD, isEntry, isExit } from "./attendance-time";

export type DayStatus =
  | "present"      // real clock-in + clock-out for the day
  | "in-progress"  // clocked in, no clock-out yet (today only)
  | "no-exit"      // past day, clocked in, never clocked out
  | "no-entry"     // past day, clocked out, never clocked in (orphan exit)
  | "vacation"     // covered by vacation_days (admin-approved)
  | "sick"         // clock_at=null attendance row with action='מחלה' etc.
  | "absent-marker" // clock_at=null attendance row with action='חופש'/'אחר'
  | "empty";       // no data at all for that day

export interface MonthlyReportAttendanceRow {
  staff_id: string;
  action: string;
  clock_at: string | null;
  created_at: string;
  project?: { name: string } | null;
}

export interface MonthlyReportVacationRow {
  staff_id: string;
  date: string;      // YYYY-MM-DD
  half_day: boolean;
}

export interface MonthlyStaff {
  id: string;
  name: string;
  is_freelancer: boolean;
  employment_type: string | null;
}

export interface DayRow {
  date: string;      // "YYYY-MM-DD"
  dayName: string;   // Hebrew weekday name
  entry: string | null;   // "HH:MM" or null
  exit:  string | null;   // "HH:MM" or null
  hours: number | null;   // rounded to 0.01
  status: DayStatus;
  project: string | null;
  halfDayVacation?: boolean;
}

export interface WorkerBlock {
  staff: MonthlyStaff;
  days: DayRow[];
  totals: {
    workDays: number;
    workHours: number;
    vacationDays: number;
    absenceDays: number;
    noExitDays: number;
    noEntryDays: number;
  };
}

const HE_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const ABSENCE_ACTIONS = new Set(["חופש", "מחלה", "אחר"]);

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Iterate every calendar day in [from, to] inclusive, "YYYY-MM-DD" strings.
 *  Anchored at UTC noon so DST seams don't drop a day. */
export function* iterDays(from: string, to: string): Generator<string> {
  let d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d.getTime() <= end.getTime()) {
    yield d.toISOString().slice(0, 10);
    d = new Date(d.getTime() + 86_400_000);
  }
}

/** Israel-local weekday index 0..6 (0=Sunday) for a "YYYY-MM-DD". */
function dayOfWeek(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

/** Build the per-worker blocks. Attendance rows are pre-filtered to the
 *  month by workDate (clock_at); vacation rows are pre-filtered to
 *  date ∈ [from, to]. All active workers appear in the output, even
 *  those with zero rows for the month (their block shows every day as
 *  "empty"). */
interface DayBucket {
  entries: MonthlyReportAttendanceRow[];
  exits: MonthlyReportAttendanceRow[];
  absenceMarkers: MonthlyReportAttendanceRow[];
  projects: string[];
}

export function buildMonthlyReport(
  staff: MonthlyStaff[],
  attendance: MonthlyReportAttendanceRow[],
  vacations: MonthlyReportVacationRow[],
  from: string,
  to: string,
): WorkerBlock[] {
  // Group attendance by (staff × day).
  const byStaffDay = new Map<string, Map<string, DayBucket>>();
  for (const rec of attendance) {
    const d = workDate(rec);
    const ymd = israelYMD(d);
    if (ymd < from || ymd > to) continue;

    if (!byStaffDay.has(rec.staff_id)) byStaffDay.set(rec.staff_id, new Map());
    const perDay = byStaffDay.get(rec.staff_id)!;
    if (!perDay.has(ymd)) {
      perDay.set(ymd, { entries: [], exits: [], absenceMarkers: [], projects: [] });
    }
    const bucket = perDay.get(ymd)!;
    // clock_at=null rows are absence markers (חופש/מחלה/אחר) created via
    // the admin manual-entry flow for absences.
    if (rec.clock_at == null) {
      bucket.absenceMarkers.push(rec);
    } else if (isEntry(rec.action)) {
      bucket.entries.push(rec);
    } else if (isExit(rec.action)) {
      bucket.exits.push(rec);
    }
    const projName = rec.project?.name;
    if (projName) bucket.projects.push(projName);
  }

  // Vacation lookup: date → half_day per staff.
  const vacByStaff = new Map<string, Map<string, boolean>>();
  for (const v of vacations) {
    if (v.date < from || v.date > to) continue;
    if (!vacByStaff.has(v.staff_id)) vacByStaff.set(v.staff_id, new Map());
    vacByStaff.get(v.staff_id)!.set(v.date, v.half_day);
  }

  const todayYmd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const blocks: WorkerBlock[] = [];

  for (const s of staff) {
    const perDay: Map<string, DayBucket>    = byStaffDay.get(s.id) ?? new Map();
    const vacs:   Map<string, boolean>      = vacByStaff.get(s.id) ?? new Map();
    const days: DayRow[] = [];
    let workDays = 0, workHoursMs = 0, vacationDays = 0, absenceDays = 0, noExitDays = 0, noEntryDays = 0;

    for (const ymd of iterDays(from, to)) {
      const dow = dayOfWeek(ymd);
      if (dow === 6) continue; // Saturday skipped from the output entirely
      const dayName = HE_WEEKDAYS[dow];

      // 1. Vacation wins (admin-approved calendar leave)
      const half = vacs.get(ymd);
      if (half !== undefined) {
        days.push({
          date: ymd, dayName,
          entry: null, exit: null, hours: null,
          status: "vacation", project: null, halfDayVacation: half,
        });
        vacationDays += half ? 0.5 : 1;
        continue;
      }

      const bucket = perDay.get(ymd);

      // 2. Absence marker (clock_at=null attendance rows from admin manual)
      if (bucket?.absenceMarkers.length) {
        const first = bucket.absenceMarkers[0];
        const isSick = first.action === "מחלה";
        days.push({
          date: ymd, dayName,
          entry: null, exit: null, hours: null,
          status: isSick ? "sick" : "absent-marker",
          project: null,
        });
        absenceDays += 1;
        continue;
      }

      // 3. Real presence — pair firstIn / lastOut
      if (bucket && (bucket.entries.length || bucket.exits.length)) {
        bucket.entries.sort((a, b) => (a.clock_at! < b.clock_at! ? -1 : 1));
        bucket.exits.sort((a, b) => (a.clock_at! < b.clock_at! ? -1 : 1));
        const firstEntry = bucket.entries[0] ?? null;
        const lastExit   = bucket.exits[bucket.exits.length - 1] ?? null;
        const entry = firstEntry ? hhmm(firstEntry.clock_at!) : null;
        const exit  = lastExit   ? hhmm(lastExit.clock_at!)   : null;

        let hours: number | null = null;
        let status: DayStatus;
        if (firstEntry && lastExit) {
          const ms = new Date(lastExit.clock_at!).getTime() - new Date(firstEntry.clock_at!).getTime();
          if (ms > 0) {
            hours = Math.round(ms / 36_000) / 100;
            workHoursMs += ms;
          }
          status = "present";
          workDays += 1;
        } else if (firstEntry && !lastExit) {
          status = ymd === todayYmd ? "in-progress" : "no-exit";
          if (status === "no-exit") { noExitDays += 1; workDays += 1; }
        } else {
          // exit without matching in (orphan exit) — a distinct incomplete
          // day from no-exit, and the opposite manual fix ("השלם כניסה").
          // Counted separately so the block summary doesn't mislabel it, and
          // NOT as a work day (no entry → no measurable shift).
          status = "no-entry";
          noEntryDays += 1;
        }

        // Most-mentioned project for the day.
        const projectCount: Record<string, number> = {};
        for (const p of bucket.projects) projectCount[p] = (projectCount[p] ?? 0) + 1;
        const project = Object.entries(projectCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        days.push({ date: ymd, dayName, entry, exit, hours, status, project });
        continue;
      }

      // 4. Nothing at all for this day
      days.push({
        date: ymd, dayName,
        entry: null, exit: null, hours: null,
        status: "empty", project: null,
      });
    }

    blocks.push({
      staff: s,
      days,
      totals: {
        workDays,
        workHours: Math.round(workHoursMs / 36_000) / 100,
        vacationDays,
        absenceDays,
        noExitDays,
        noEntryDays,
      },
    });
  }

  blocks.sort((a, b) => a.staff.name.localeCompare(b.staff.name, "he"));
  return blocks;
}
