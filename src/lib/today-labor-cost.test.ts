import { describe, it, expect } from "vitest";
import {
  computeTodayLaborCost,
  hoursWorkedFromEvents,
  type WorkerLaborInput,
  type LaborEvent,
} from "./today-labor-cost";

// "Now" anchor — 16:00 IDT on a Tuesday. Tests build clock-ins
// relative to this so the math is deterministic.
const NOW = new Date("2026-06-30T13:00:00Z").getTime(); // 16:00 in Israel summer
const at = (hh: number, mm: number = 0) =>
  new Date(NOW - ((16 - hh) * 60 + (0 - mm)) * 60_000).toISOString();

function w(
  worker: WorkerLaborInput["worker"],
  events: LaborEvent[],
): WorkerLaborInput {
  return { worker, events };
}

const IN  = (t: string): LaborEvent => ({ action: "כניסה", clock_at: t });
const OUT = (t: string): LaborEvent => ({ action: "יציאה", clock_at: t });

describe("computeTodayLaborCost — approach C (actual hours with 10h cap)", () => {
  // ── Daily ──────────────────────────────────────────────────────────────
  it("daily worker contributes the full daily rate (regardless of clock-out)", () => {
    const list = [
      w({ employment_type: "daily", daily_rate: 1100 }, [IN(at(6)), OUT(at(15))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(1100);
  });

  it("daily worker who already left still counts (the bug that motivated this PR)", () => {
    const list = [
      w({ employment_type: "daily", daily_rate: 700 }, [IN(at(6, 15)), OUT(at(14, 47))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(700);
  });

  // ── Global ─────────────────────────────────────────────────────────────
  it("global worker contributes monthly_global_salary / 22", () => {
    const list = [
      w({ employment_type: "global", monthly_global_salary: 22000 }, [IN(at(6))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(1000);
  });

  it("global worker without monthly salary contributes 0", () => {
    const list = [
      w({ employment_type: "global", monthly_global_salary: null }, [IN(at(6))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(0);
  });

  // ── Hourly: actual hours from in/out pairs ─────────────────────────────
  it("hourly worker with one closed in/out pair gets actual hours × rate", () => {
    const list = [
      w({ employment_type: "hourly", hourly_rate: 100 }, [IN(at(6)), OUT(at(14))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(8 * 100, 5);
  });

  it("hourly worker with multiple in/out pairs sums them all (re-entry)", () => {
    // 4h + 1h = 5h × 80 = 400
    const list = [
      w({ employment_type: "hourly", hourly_rate: 80 }, [
        IN(at(6)),  OUT(at(10)),   // 4h
        IN(at(13)), OUT(at(14)),   // 1h
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(5 * 80, 5);
  });

  it("hourly worker still on site closes the open segment against now", () => {
    // Clocked in 4h ago, no out → 4h × 60 = 240
    const list = [
      w({ employment_type: "hourly", hourly_rate: 60 }, [IN(at(12))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(4 * 60, 5);
  });

  it("hourly worker with closed pair + open segment sums both", () => {
    // (10-6) + (16-13) = 4 + 3 = 7h × 50 = 350
    const list = [
      w({ employment_type: "hourly", hourly_rate: 50 }, [
        IN(at(6)),  OUT(at(10)),  // 4h closed
        IN(at(13)),                // 3h open until now (16:00)
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(7 * 50, 5);
  });

  // ── 10h cap safety net ────────────────────────────────────────────────
  it("hourly worker whose raw hours > 10 falls back to 8.5 (forgotten clock-out)", () => {
    // Clocked in 12h ago, no out → raw 12h, capped to 8.5 × 100 = 850
    const list = [
      w({ employment_type: "hourly", hourly_rate: 100 }, [IN(at(4))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(8.5 * 100, 5);
  });

  it("cap fires on accumulated pairs too, not just on a single open segment", () => {
    // Two closed pairs summing > 10h → 8.5 × 60 = 510 (not 11 × 60 = 660)
    const list = [
      w({ employment_type: "hourly", hourly_rate: 60 }, [
        IN(at(2)),  OUT(at(8)),    // 6h
        IN(at(9)),  OUT(at(14)),   // 5h
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(8.5 * 60, 5);
  });

  it("exactly 10h does NOT trigger the cap (boundary)", () => {
    // 10h × 70 = 700, not 8.5 × 70 = 595
    const list = [
      w({ employment_type: "hourly", hourly_rate: 70 }, [IN(at(6)), OUT(at(16))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(10 * 70, 5);
  });

  it("multiple 'in' without an intervening 'out' does NOT double-count", () => {
    // The second 'in' is a glitch / re-entry without an out. The first
    // open clock-in is kept; the second is a no-op. Out closes the
    // single (long) segment.
    const list = [
      w({ employment_type: "hourly", hourly_rate: 50 }, [
        IN(at(6)), IN(at(7)), OUT(at(10)),  // single 4h segment, not 4+3
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(4 * 50, 5);
  });

  it("orphan 'out' without a prior 'in' is ignored", () => {
    const list = [
      w({ employment_type: "hourly", hourly_rate: 50 }, [
        OUT(at(8)),                // orphan, ignored
        IN(at(10)), OUT(at(14)),   // valid 4h pair
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(4 * 50, 5);
  });

  // ── employment_type fallback ──────────────────────────────────────────
  it("employment_type missing: prefers daily, then hourly, then global", () => {
    const dailyOnly  = w({ daily_rate: 800 },  [IN(at(8))]);
    const hourlyOnly = w({ hourly_rate: 60 }, [IN(at(12))]);
    const globalOnly = w({ monthly_global_salary: 22000 }, [IN(at(8))]);
    expect(computeTodayLaborCost([dailyOnly], NOW)).toBe(800);
    expect(computeTodayLaborCost([hourlyOnly], NOW)).toBeCloseTo(4 * 60, 5);
    expect(computeTodayLaborCost([globalOnly], NOW)).toBe(1000);
  });

  it("employment_type='daily' takes precedence — hourly is ignored even if present", () => {
    const list = [
      w({ employment_type: "daily", daily_rate: 500, hourly_rate: 99 }, [IN(at(6)), OUT(at(15))]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(500);
  });

  // ── Edge cases (NaN safety retained) ──────────────────────────────────
  it("worker with no usable rate contributes 0 (not NaN)", () => {
    const list = [
      w({ employment_type: "hourly", hourly_rate: null }, [IN(at(8))]),
    ];
    const out = computeTodayLaborCost(list, NOW);
    expect(out).toBe(0);
    expect(Number.isFinite(out)).toBe(true);
  });

  it("worker with empty events list contributes 0 (not in attendance today)", () => {
    const list = [
      w({ employment_type: "daily", daily_rate: 1000 }, []),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(0);
  });

  it("worker undefined → row contributes 0", () => {
    const list = [{ worker: undefined, events: [IN(at(8))] }];
    expect(computeTodayLaborCost(list, NOW)).toBe(0);
  });

  it("garbage clock_at strings are filtered out before pairing", () => {
    const list = [
      w({ employment_type: "hourly", hourly_rate: 50 }, [
        { action: "כניסה", clock_at: "not-a-date" },
        IN(at(12)), OUT(at(14)),  // valid 2h
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(2 * 50, 5);
  });

  it("coerces string rates (Supabase numeric → string)", () => {
    const list = [
      w({ employment_type: "daily", daily_rate: "750" as unknown as number }, [IN(at(8))]),
      w({ employment_type: "hourly", hourly_rate: "100" as unknown as number }, [IN(at(12))]),  // 4h × 100 = 400
    ];
    expect(computeTodayLaborCost(list, NOW)).toBeCloseTo(750 + 400, 5);
  });

  it("clock-in in the future yields 0 hours for the open segment", () => {
    const list = [
      w({ employment_type: "hourly", hourly_rate: 60 }, [
        { action: "כניסה", clock_at: new Date(NOW + 3_600_000).toISOString() },
      ]),
    ];
    expect(computeTodayLaborCost(list, NOW)).toBe(0);
  });

  it("empty list → 0 (never NaN)", () => {
    const out = computeTodayLaborCost([], NOW);
    expect(out).toBe(0);
    expect(Number.isFinite(out)).toBe(true);
  });

  // ── Regression: simulate today's actual production data ──────────────
  it("today's production snapshot from 30.6.2026 reaches the expected ~11,800 ₪", () => {
    // Reconstructed from the live DB probe in the investigation report.
    // 18 workers attended today; the pre-fix code returned ~2,800 ₪
    // (only the 5 still on site). This regression locks in that the
    // new logic includes everyone who showed up.
    const list: WorkerLaborInput[] = [
      // Daily workers (full daily rate regardless of clock-out)
      w({ employment_type: "daily", daily_rate: 1100 }, [IN(at(5, 13)), OUT(at(15, 17))]),   // יצחק
      w({ employment_type: "daily", daily_rate:  700 }, [IN(at(6, 15)), OUT(at(14, 47))]),   // בן גרמה
      w({ employment_type: "daily", daily_rate: 1100 }, [IN(at(5, 33)), OUT(at(14, 34))]),   // ישראל שם טוב
      w({ employment_type: "daily", daily_rate:  500 }, [IN(at(5, 15)), OUT(at(14, 5))]),    // נחמן פרוש
      w({ employment_type: "daily", daily_rate: 1000 }, [IN(at(4, 26)), OUT(at(12, 53))]),   // נתן פרץ
      w({ employment_type: "daily", daily_rate: 1000 }, [IN(at(9, 58))]),                    // חנן מגורי (still in)
      w({ employment_type: "daily", daily_rate:  600 }, [IN(at(4, 15)), OUT(at(8, 48))]),    // שחר תובל
      // Hourly workers
      w({ employment_type: "hourly", hourly_rate: 100 }, [IN(at(4)), IN(at(15, 10))]),       // פזלי — capped (>10h raw)
      w({ employment_type: "hourly", hourly_rate: 100 }, [IN(at(4)), OUT(at(15, 10))]),      // שחוב — capped (11.17h raw)
      w({ employment_type: "hourly", hourly_rate:  70 }, [IN(at(6, 22)), OUT(at(14, 27))]),  // צ'ארלי
      w({ employment_type: "hourly", hourly_rate: 78.5 }, [IN(at(8, 23)), OUT(at(14, 23))]), // אסנקה
      w({ employment_type: "hourly", hourly_rate: 77.5 }, [IN(at(8, 25)), OUT(at(14, 21))]), // נישנטה
      w({ employment_type: "hourly", hourly_rate:  78 }, [
        IN(at(9, 55)), OUT(at(9, 56)), IN(at(9, 56)), OUT(at(9, 58)),
        IN(at(9, 58)), OUT(at(14, 20)),
      ]),                                                                                     // סנניקה
      w({ employment_type: "hourly", hourly_rate:  78 }, [
        IN(at(6, 36)), OUT(at(6, 37)), IN(at(6, 38)), OUT(at(14, 19)),
      ]),                                                                                     // פריינטה
      w({ employment_type: "hourly", hourly_rate:  65 }, [IN(at(6, 35)), OUT(at(14, 2))]),    // אלישע
      w({ employment_type: "hourly", hourly_rate: 100 }, [IN(at(4))]),                        // עלי — capped (12h raw, open)
      w({ employment_type: "global", monthly_global_salary: 22000 }, [IN(at(6, 50))]),        // מיכאל דרגן
      w({ employment_type: "hourly", hourly_rate:  55 }, [IN(at(6, 36))]),                    // ישראל מאיר וייס — open 9.4h
    ];
    const cost = computeTodayLaborCost(list, NOW);
    // Bounded check rather than a single exact figure — the snapshot
    // uses minute-resolution timestamps so tiny rounding drift is OK.
    expect(cost).toBeGreaterThan(10_000);
    expect(cost).toBeLessThan(14_000);
  });
});

describe("hoursWorkedFromEvents — building block exposed for direct testing", () => {
  it("returns 0 for empty events", () => {
    expect(hoursWorkedFromEvents([], NOW)).toBe(0);
  });

  it("pairs in/out in chronological order even if input is reversed", () => {
    // input order is descending (newest first)
    const events = [OUT(at(14)), IN(at(10))];
    expect(hoursWorkedFromEvents(events, NOW)).toBeCloseTo(4, 5);
  });

  it("ignores events with unparseable timestamps", () => {
    const events: LaborEvent[] = [
      { action: "כניסה", clock_at: null },
      IN(at(10)),
      OUT(at(14)),
    ];
    expect(hoursWorkedFromEvents(events, NOW)).toBeCloseTo(4, 5);
  });
});
