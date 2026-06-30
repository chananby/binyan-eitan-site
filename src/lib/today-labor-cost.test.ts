import { describe, it, expect } from "vitest";
import {
  computeTodayLaborCost,
  type OnSiteEntry,
} from "./today-labor-cost";

// "Now" anchor — 12:00 UTC on a Tuesday. Tests build clock-in times
// relative to this so the math is deterministic.
const NOW = new Date("2026-07-14T12:00:00Z").getTime();
const fourHoursAgo  = new Date(NOW - 4 * 3_600_000).toISOString();
const oneHourAgo    = new Date(NOW - 1 * 3_600_000).toISOString();

function entry(
  worker: OnSiteEntry["worker"],
  record: OnSiteEntry["record"],
): OnSiteEntry {
  return { worker, record };
}

describe("computeTodayLaborCost — labor estimate for the dashboard", () => {
  it("daily-rate worker contributes the full daily rate, irrespective of clock time", () => {
    const list = [
      entry({ daily_rate: 700 }, { clock_at: oneHourAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(700);
  });

  it("hourly-rate worker contributes (now − clock_at) × rate", () => {
    const list = [
      entry({ hourly_rate: 60 }, { clock_at: fourHoursAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(60 * 4, 5);
  });

  it("mixed list sums correctly", () => {
    const list = [
      entry({ daily_rate: 500 },  { clock_at: oneHourAgo }),
      entry({ hourly_rate: 50 },  { clock_at: fourHoursAgo }),  // 200
      entry({ daily_rate: 600 },  { clock_at: fourHoursAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(500 + 200 + 600, 5);
  });

  // ── REGRESSION: the bug that motivated this helper ──────────────────────
  it("hourly worker WITHOUT clock_at / recorded_at / created_at contributes 0, NOT NaN", () => {
    // This is the exact shape the /api/admin/attendance/today endpoint
    // returned when the dashboard was rendering ₪NaN — clock_at present,
    // recorded_at (which the old inline code read) absent. With the
    // helper the row is either valid or skipped; the result is always
    // finite.
    const list = [
      entry({ hourly_rate: 50 }, {} as never),  // no timestamp at all
    ];
    const out = computeTodayLaborCost(list, NOW);
    expect(out).toBe(0);
    expect(Number.isFinite(out)).toBe(true);
  });

  it("hourly worker with a garbage clock_at string contributes 0, NOT NaN", () => {
    const list = [
      entry({ hourly_rate: 50 }, { clock_at: "not-a-date" }),
    ];
    const out = computeTodayLaborCost(list, NOW);
    expect(out).toBe(0);
    expect(Number.isFinite(out)).toBe(true);
  });

  it("a single bad row doesn't poison the rest of the sum", () => {
    const list = [
      entry({ hourly_rate: 50 }, { clock_at: fourHoursAgo }),     // 200
      entry({ hourly_rate: 60 }, {} as never),                    // would-be NaN
      entry({ daily_rate: 700 }, { clock_at: oneHourAgo }),       // 700
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(200 + 700, 5);
  });

  it("worker with no usable rate (both null/zero) is silently skipped", () => {
    const list = [
      entry({ daily_rate: null, hourly_rate: null }, { clock_at: oneHourAgo }),
      entry({ daily_rate: 0, hourly_rate: 0 }, { clock_at: oneHourAgo }),
      entry({ daily_rate: 600 }, { clock_at: oneHourAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(600);
  });

  it("daily-rate takes precedence — hourly is ignored when both are present", () => {
    const list = [
      entry({ daily_rate: 500, hourly_rate: 999 }, { clock_at: fourHoursAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(500);
  });

  it("falls back through recorded_at and created_at when clock_at is missing", () => {
    const list = [
      entry({ hourly_rate: 50 }, { recorded_at: fourHoursAgo }),
      entry({ hourly_rate: 50 }, { created_at:  fourHoursAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(50 * 4 + 50 * 4, 5);
  });

  it("coerces numeric columns that arrive as strings (Supabase numeric → string)", () => {
    const list = [
      entry({ daily_rate: "700" as unknown as number }, { clock_at: oneHourAgo }),
      entry({ hourly_rate: "50.5" as unknown as number }, { clock_at: oneHourAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(700 + 50.5 * 1, 5);
  });

  it("worker undefined (deleted/inactive) → row contributes 0", () => {
    const list = [
      entry(undefined, { clock_at: oneHourAgo }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(0);
  });

  it("clock-in in the future yields 0 hours, not negative cost", () => {
    const oneHourFromNow = new Date(NOW + 3_600_000).toISOString();
    const list = [
      entry({ hourly_rate: 50 }, { clock_at: oneHourFromNow }),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(0);
  });

  it("empty list → 0 (never NaN)", () => {
    expect(computeTodayLaborCost([], NOW)).toBe(0);
  });
});
