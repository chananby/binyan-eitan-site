import { describe, it, expect } from "vitest";
import {
  forecastWorker,
  forecastByWorker,
  forecastTotal,
  WORK_DAYS_PER_MONTH,
  WORK_HOURS_PER_DAY,
  WORK_HOURS_PER_MONTH,
  type ForecastRates,
} from "./payroll-forecast";

describe("payroll-forecast — constants", () => {
  it("a full month = 22 days × 8.5 hours = 187 hours", () => {
    expect(WORK_DAYS_PER_MONTH).toBe(22);
    expect(WORK_HOURS_PER_DAY).toBe(8.5);
    expect(WORK_HOURS_PER_MONTH).toBe(187);
  });
});

describe("forecastWorker", () => {
  it("hourly: rate 50 → 50 × 187 = 9350", () => {
    expect(forecastWorker("hourly", { hourly_rate: 50, daily_rate: null, monthly_global_salary: null }))
      .toBe(9350);
  });

  it("daily: rate 500 → 500 × 22 = 11_000", () => {
    expect(forecastWorker("daily", { hourly_rate: null, daily_rate: 500, monthly_global_salary: null }))
      .toBe(11_000);
  });

  it("global: monthly_global_salary 10_000 → 10_000 (no multiplier)", () => {
    expect(forecastWorker("global", { hourly_rate: null, daily_rate: null, monthly_global_salary: 10_000 }))
      .toBe(10_000);
  });

  it("returns 0 when rates is null", () => {
    expect(forecastWorker("hourly", null)).toBe(0);
    expect(forecastWorker("daily",  null)).toBe(0);
    expect(forecastWorker("global", null)).toBe(0);
  });

  it("returns 0 when the relevant rate field is null/0 (not NaN)", () => {
    expect(forecastWorker("hourly", { hourly_rate: null, daily_rate: 500, monthly_global_salary: 9999 })).toBe(0);
    expect(forecastWorker("daily",  { hourly_rate: 50,   daily_rate: 0,    monthly_global_salary: 9999 })).toBe(0);
    expect(forecastWorker("global", { hourly_rate: 50,   daily_rate: 500,  monthly_global_salary: null })).toBe(0);
  });

  it("returns 0 for an unknown employment_type — no silent crash", () => {
    expect(forecastWorker("contractor", { hourly_rate: 50, daily_rate: 500, monthly_global_salary: 9999 }))
      .toBe(0);
    expect(forecastWorker("", { hourly_rate: 50, daily_rate: null, monthly_global_salary: null }))
      .toBe(0);
  });
});

describe("forecastTotal — aggregation across mixed workers", () => {
  // A realistic spread: one of each type, plus one with no rate at all.
  const workers = [
    { id: "h1", employment_type: "hourly" },  // 50 × 187 = 9350
    { id: "h2", employment_type: "hourly" },  // 60 × 187 = 11_220
    { id: "d1", employment_type: "daily"  },  // 500 × 22 = 11_000
    { id: "g1", employment_type: "global" },  // 10_000
    { id: "ng", employment_type: "hourly" },  // no rate → 0, counted as missing
  ];
  const ratesById: Record<string, ForecastRates | null> = {
    h1: { hourly_rate: 50, daily_rate: null, monthly_global_salary: null },
    h2: { hourly_rate: 60, daily_rate: null, monthly_global_salary: null },
    d1: { hourly_rate: null, daily_rate: 500, monthly_global_salary: null },
    g1: { hourly_rate: null, daily_rate: null, monthly_global_salary: 10_000 },
    ng: null,
  };
  const ratesFor = (id: string) => ratesById[id] ?? null;

  it("sums per worker correctly", () => {
    const r = forecastTotal(workers, ratesFor);
    expect(r.total).toBe(9350 + 11_220 + 11_000 + 10_000 + 0);
    expect(r.total).toBe(41_570);
  });

  it("breaks down by employment_type", () => {
    const r = forecastTotal(workers, ratesFor);
    expect(r.per_type.hourly).toBe(9350 + 11_220);
    expect(r.per_type.daily).toBe(11_000);
    expect(r.per_type.global).toBe(10_000);
  });

  it("counts workers and missing rates", () => {
    const r = forecastTotal(workers, ratesFor);
    expect(r.count).toBe(5);
    expect(r.missing_rate_count).toBe(1); // only `ng`
  });

  it("empty worker list → all zeros, no NaNs", () => {
    const r = forecastTotal([], () => null);
    expect(r.total).toBe(0);
    expect(r.per_type).toEqual({ hourly: 0, daily: 0, global: 0 });
    expect(r.count).toBe(0);
    expect(r.missing_rate_count).toBe(0);
  });

  it("a worker with a rate row but a zero in the relevant column counts as missing", () => {
    const r = forecastTotal(
      [{ id: "h1", employment_type: "hourly" }],
      () => ({ hourly_rate: 0, daily_rate: 500, monthly_global_salary: null }),
    );
    expect(r.total).toBe(0);
    expect(r.missing_rate_count).toBe(1);
  });
});

describe("forecastByWorker — per-worker breakdown", () => {
  const workers = [
    { id: "h1", employment_type: "hourly" },
    { id: "d1", employment_type: "daily"  },
    { id: "g1", employment_type: "global" },
    { id: "ng", employment_type: "hourly" },
  ];
  const ratesById: Record<string, ForecastRates | null> = {
    h1: { hourly_rate: 50,  daily_rate: null, monthly_global_salary: null },
    d1: { hourly_rate: null, daily_rate: 500, monthly_global_salary: null },
    g1: { hourly_rate: null, daily_rate: null, monthly_global_salary: 10_000 },
    ng: null,
  };
  const ratesFor = (id: string) => ratesById[id] ?? null;

  it("returns one line per input worker, preserving length", () => {
    const lines = forecastByWorker(workers, ratesFor);
    expect(lines).toHaveLength(4);
  });

  it("each line carries the rate field relevant to its employment_type", () => {
    const byId = Object.fromEntries(forecastByWorker(workers, ratesFor).map(l => [l.worker.id, l]));
    expect(byId.h1.rate).toBe(50);
    expect(byId.d1.rate).toBe(500);
    expect(byId.g1.rate).toBe(10_000);
    expect(byId.ng.rate).toBe(0); // no rate row → 0
  });

  it("monthly_forecast = rate × multiplier for the type", () => {
    const byId = Object.fromEntries(forecastByWorker(workers, ratesFor).map(l => [l.worker.id, l]));
    expect(byId.h1.monthly_forecast).toBe(50 * 187);
    expect(byId.d1.monthly_forecast).toBe(500 * 22);
    expect(byId.g1.monthly_forecast).toBe(10_000);
    expect(byId.ng.monthly_forecast).toBe(0);
  });

  it("missing_rate flag is set per-line, not aggregated", () => {
    const byId = Object.fromEntries(forecastByWorker(workers, ratesFor).map(l => [l.worker.id, l]));
    expect(byId.h1.missing_rate).toBe(false);
    expect(byId.ng.missing_rate).toBe(true);
  });
});

describe("forecastTotal — per_worker invariants (post-refactor)", () => {
  const workers = [
    { id: "h1", employment_type: "hourly" },
    { id: "d1", employment_type: "daily"  },
    { id: "g1", employment_type: "global" },
  ];
  const ratesFor = (id: string): ForecastRates | null => ({
    h1: { hourly_rate: 50,   daily_rate: null, monthly_global_salary: null },
    d1: { hourly_rate: null, daily_rate: 500,  monthly_global_salary: null },
    g1: { hourly_rate: null, daily_rate: null, monthly_global_salary: 10_000 },
  }[id] ?? null);

  it("per_worker length === input length", () => {
    const r = forecastTotal(workers, ratesFor);
    expect(r.per_worker).toHaveLength(workers.length);
  });

  it("sum of per_worker.monthly_forecast === total (the contract)", () => {
    const r = forecastTotal(workers, ratesFor);
    const sum = r.per_worker.reduce((s, l) => s + l.monthly_forecast, 0);
    expect(sum).toBe(r.total);
  });

  it("per_worker is sorted DESC by monthly_forecast (most expensive first)", () => {
    const r = forecastTotal(workers, ratesFor);
    const amounts = r.per_worker.map(l => l.monthly_forecast);
    const sorted = [...amounts].sort((a, b) => b - a);
    expect(amounts).toEqual(sorted);
    // Sanity: 11_000 > 10_000 > 9_350 (the daily worker tops the list).
    expect(amounts).toEqual([11_000, 10_000, 9_350]);
  });

  it("tie-breaks are deterministic (stable across runs)", () => {
    // Two workers with the same rate + type produce the same forecast →
    // their order must be stable so the dashboard doesn't shuffle on
    // refresh. Tie-breaks on worker.id (lexicographic ascending).
    const tied = [
      { id: "z", employment_type: "hourly" },
      { id: "a", employment_type: "hourly" },
    ];
    const sameRate = () => ({ hourly_rate: 50, daily_rate: null, monthly_global_salary: null });
    const r = forecastTotal(tied, sameRate);
    expect(r.per_worker.map(l => l.worker.id)).toEqual(["a", "z"]);
  });
});
