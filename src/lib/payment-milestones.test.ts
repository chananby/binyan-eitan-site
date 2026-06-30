import { describe, it, expect } from "vitest";
import {
  computeMilestoneTotals,
  isTransitionableStatus,
  type MilestoneForTotals,
} from "./payment-milestones";

const m = (
  status: string | null,
  amount: number | string | null,
  paid_amount: number | string | null = 0,
  deleted = false,
): MilestoneForTotals => ({
  status,
  amount,
  paid_amount,
  deleted_at: deleted ? new Date().toISOString() : null,
});

describe("computeMilestoneTotals — planned / collected / due / outstanding", () => {
  it("mixes future and due with no payments yet", () => {
    const rows = [
      m("future", 40000),
      m("future", 50000),
      m("due",    40000),
      m("due",    20000),
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 150000,
      collected: 0,
      due: 60000,         // only the two due rows
      outstanding: 150000, // every row, none paid
    });
  });

  it("partial payment on a 'due' row counts the remainder in both due and outstanding", () => {
    const rows = [
      m("due", 40000, 15000),  // remaining 25000 → in due + outstanding
      m("due", 20000),         // remaining 20000 → in due + outstanding
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 60000,
      collected: 15000,
      due: 45000,
      outstanding: 45000,
    });
  });

  it("fully paid row contributes to planned + collected but NOT to due / outstanding", () => {
    const rows = [
      m("paid", 30000, 30000),
      m("due",  40000),
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 70000,
      collected: 30000,
      due: 40000,
      outstanding: 40000,
    });
  });

  it("overpayment doesn't push remaining negative — clamped at zero", () => {
    const rows = [
      m("paid", 100, 150),   // somehow got more than billed
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 100,
      collected: 150,        // collected reflects the cash that arrived
      due: 0,
      outstanding: 0,        // not negative
    });
  });

  it("partially-paid future row counts toward outstanding but not toward due", () => {
    // Status='future' means the admin hasn't ripened it yet, even if
    // some cash arrived early. It belongs in 'outstanding' (forecast)
    // but NOT in 'due' (chase-list).
    const rows = [
      m("future", 50000, 10000),
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 50000,
      collected: 10000,
      due: 0,
      outstanding: 40000,
    });
  });

  it("skips soft-deleted rows entirely", () => {
    const rows = [
      m("due", 40000),
      m("due", 99999, 0, /* deleted */ true),
      m("paid", 20000, 20000, /* deleted */ true),
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 40000,
      collected: 0,
      due: 40000,
      outstanding: 40000,
    });
  });

  it("empty input → all zeros", () => {
    expect(computeMilestoneTotals([])).toEqual({
      planned: 0,
      collected: 0,
      due: 0,
      outstanding: 0,
    });
  });

  it("coerces string amounts (Supabase numeric → string) and null paid_amount → 0", () => {
    const rows = [
      m("due", "12345.67", null),  // paid null
      m("due", "1000",      "250"),
    ];
    expect(computeMilestoneTotals(rows)).toEqual({
      planned: 13345.67,
      collected: 250,
      due: 12345.67 + 750,
      outstanding: 12345.67 + 750,
    });
  });
});

describe("isTransitionableStatus — type guard for the transition endpoint", () => {
  it("accepts future and due only", () => {
    expect(isTransitionableStatus("future")).toBe(true);
    expect(isTransitionableStatus("due")).toBe(true);
  });

  it("rejects 'paid' — paid is derived from paid_amount, not set directly", () => {
    expect(isTransitionableStatus("paid")).toBe(false);
  });

  it("rejects garbage", () => {
    expect(isTransitionableStatus("FUTURE")).toBe(false);
    expect(isTransitionableStatus("pending")).toBe(false);
    expect(isTransitionableStatus(null)).toBe(false);
    expect(isTransitionableStatus(undefined)).toBe(false);
    expect(isTransitionableStatus(42)).toBe(false);
  });
});
