import { describe, it, expect } from "vitest";
import {
  forecastWorker,
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
