import { describe, it, expect } from "vitest";
import {
  computeAttendanceProjectShares,
  shareHoursToIls,
  type AttendanceProjectRow,
} from "./attendance-project-shares";

// Build an attendance row shorthand. Times are in Israel local wall clock
// via an explicit "+03:00" offset (summer time — matches what production
// clock_at strings look like for June/July rows).
function rec(ymd: string, hhmm: string, action: "in" | "out", project_id: string | null): AttendanceProjectRow {
  return {
    action,
    clock_at: `${ymd}T${hhmm}:00+03:00`,
    created_at: `${ymd}T${hhmm}:00+03:00`,
    project_id,
  };
}

describe("computeAttendanceProjectShares", () => {
  it("returns empty shares when no attendance rows", () => {
    const r = computeAttendanceProjectShares([], "2026-06");
    expect(r.shares).toEqual([]);
    expect(r.totalHours).toBe(0);
    expect(r.unassignedHours).toBe(0);
  });

  it("attributes a full 8h day to its single project", () => {
    const rows = [
      rec("2026-06-01", "07:00", "in",  "P1"),
      rec("2026-06-01", "15:00", "out", "P1"),
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    expect(r.shares).toEqual([{ project_id: "P1", hours: 8 }]);
    expect(r.totalHours).toBe(8);
    expect(r.unassignedHours).toBe(0);
  });

  it("skips a day with no clock-out (open shift)", () => {
    const rows = [
      rec("2026-06-01", "07:00", "in",  "P1"),
      // no exit
      rec("2026-06-02", "07:00", "in",  "P2"),
      rec("2026-06-02", "15:00", "out", "P2"),
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    expect(r.shares).toEqual([{ project_id: "P2", hours: 8 }]);
    expect(r.totalHours).toBe(8);
  });

  it("sums across multiple days and sorts shares by hours desc", () => {
    const rows = [
      rec("2026-06-01", "07:00", "in",  "P1"),
      rec("2026-06-01", "15:00", "out", "P1"),        // P1: 8h
      rec("2026-06-02", "07:00", "in",  "P2"),
      rec("2026-06-02", "11:00", "out", "P2"),        // P2: 4h
      rec("2026-06-03", "08:00", "in",  "P1"),
      rec("2026-06-03", "16:00", "out", "P1"),        // P1: 8h more (=16 total)
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    expect(r.shares).toEqual([
      { project_id: "P1", hours: 16 },
      { project_id: "P2", hours: 4 },
    ]);
    expect(r.totalHours).toBe(20);
  });

  it("skips rows outside the monthPrefix (±1 day widening safe)", () => {
    const rows = [
      rec("2026-05-31", "07:00", "in",  "P1"),
      rec("2026-05-31", "15:00", "out", "P1"),        // outside — dropped
      rec("2026-06-01", "07:00", "in",  "P2"),
      rec("2026-06-01", "15:00", "out", "P2"),        // kept
      rec("2026-07-01", "07:00", "in",  "P3"),
      rec("2026-07-01", "15:00", "out", "P3"),        // outside — dropped
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    expect(r.shares).toEqual([{ project_id: "P2", hours: 8 }]);
  });

  it("picks the day's dominant project by row-count", () => {
    // Day has 3 P1 votes + 1 P2 vote → whole day goes to P1.
    const rows = [
      rec("2026-06-01", "07:00", "in",  "P1"),
      rec("2026-06-01", "10:00", "out", "P2"),   // stray project id
      rec("2026-06-01", "11:00", "in",  "P1"),
      rec("2026-06-01", "15:00", "out", "P1"),
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    // 07:00 → 15:00 = 8h (firstIn → lastOut).
    expect(r.shares).toEqual([{ project_id: "P1", hours: 8 }]);
  });

  it("bucket-drops a day with hours but no project id anywhere", () => {
    const rows = [
      rec("2026-06-01", "07:00", "in",  null),
      rec("2026-06-01", "15:00", "out", null),
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    expect(r.shares).toEqual([]);
    expect(r.unassignedHours).toBe(8);
  });

  it("ignores absence markers (clock_at=null)", () => {
    const rows: AttendanceProjectRow[] = [
      { action: "חופש", clock_at: null, created_at: "2026-06-01T00:00:00Z", project_id: null },
      rec("2026-06-02", "07:00", "in",  "P1"),
      rec("2026-06-02", "15:00", "out", "P1"),
    ];
    const r = computeAttendanceProjectShares(rows, "2026-06");
    expect(r.shares).toEqual([{ project_id: "P1", hours: 8 }]);
  });
});

describe("shareHoursToIls", () => {
  it("returns [] for zero total", () => {
    expect(shareHoursToIls([{ project_id: "P1", hours: 8 }], 0)).toEqual([]);
    expect(shareHoursToIls([], 1000)).toEqual([]);
    expect(shareHoursToIls([{ project_id: "P1", hours: 0 }], 1000)).toEqual([]);
  });

  it("splits proportionally and preserves the exact total on clean divisions", () => {
    const rows = shareHoursToIls(
      [{ project_id: "P1", hours: 6 }, { project_id: "P2", hours: 2 }],
      1000,
    );
    expect(rows).toEqual([
      { project_id: "P1", hours: 6, amount: 750 },
      { project_id: "P2", hours: 2, amount: 250 },
    ]);
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(1000);
  });

  it("absorbs rounding residual into the largest share so sum === docTotal", () => {
    // 1/3, 1/3, 1/3 of 100 → 33.33 * 3 = 99.99 → largest row absorbs 0.01
    const rows = shareHoursToIls(
      [{ project_id: "P1", hours: 1 }, { project_id: "P2", hours: 1 }, { project_id: "P3", hours: 1 }],
      100,
    );
    const total = Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;
    expect(total).toBe(100);
    // Every row got 33.33 or 33.34
    for (const r of rows) expect([33.33, 33.34]).toContain(r.amount);
  });

  it("drops rows that round to zero after proportional split", () => {
    // 0.0001h out of 1000.0001h * ₪100 = ₪0.00001 → rounds to 0 → dropped
    const rows = shareHoursToIls(
      [{ project_id: "P1", hours: 1000 }, { project_id: "P2", hours: 0.0001 }],
      100,
    );
    expect(rows.map((r) => r.project_id)).toEqual(["P1"]);
    expect(rows[0].amount).toBe(100);
  });
});
