import { describe, expect, it } from "vitest";
import { computeMonthlyPnl, type PnlDoc } from "./finance-pnl";

// All tests pin `now` to 2026-06-15 so the 6-month window deterministically
// spans 2026-01 … 2026-06 — the same shape an admin would see today.
const NOW = Date.UTC(2026, 5, 15); // June (month index 5)

function doc(over: Partial<PnlDoc>): PnlDoc {
  return {
    doc_date: "2026-06-01",
    direction: "expense",
    amount_ils: 100,
    status: "approved",
    ...over,
  };
}

describe("computeMonthlyPnl", () => {
  it("seeds 6 months ending with the current month (default window)", () => {
    const res = computeMonthlyPnl([], { now: NOW });
    expect(res.rows.map((r) => r.month)).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
    ]);
    expect(res.current.month).toBe("2026-06");
    // Every month zeroed out, not undefined.
    for (const r of res.rows) {
      expect(r.income).toBe(0);
      expect(r.expense).toBe(0);
      expect(r.net).toBe(0);
    }
  });

  it("computes income, expense and net for a month with both", () => {
    const res = computeMonthlyPnl(
      [
        doc({ direction: "income",  amount_ils: 12000, doc_date: "2026-06-05" }),
        doc({ direction: "expense", amount_ils: 4000,  doc_date: "2026-06-12" }),
        doc({ direction: "expense", amount_ils: 1500,  doc_date: "2026-06-20" }),
      ],
      { now: NOW },
    );
    expect(res.current).toEqual({ month: "2026-06", income: 12000, expense: 5500, net: 6500 });
  });

  it("income-only month → net equals income", () => {
    const res = computeMonthlyPnl(
      [doc({ direction: "income", amount_ils: 9000, doc_date: "2026-05-15" })],
      { now: NOW },
    );
    const may = res.rows.find((r) => r.month === "2026-05")!;
    expect(may).toEqual({ month: "2026-05", income: 9000, expense: 0, net: 9000 });
  });

  it("expense-only month → net is negative", () => {
    const res = computeMonthlyPnl(
      [doc({ direction: "expense", amount_ils: 7500, doc_date: "2026-04-20" })],
      { now: NOW },
    );
    const apr = res.rows.find((r) => r.month === "2026-04")!;
    expect(apr).toEqual({ month: "2026-04", income: 0, expense: 7500, net: -7500 });
  });

  it("ignores direction='none' (quotes, delivery notes)", () => {
    const res = computeMonthlyPnl(
      [
        doc({ direction: "none", amount_ils: 228000, doc_date: "2026-06-10" }),
        doc({ direction: null,   amount_ils: 5000,   doc_date: "2026-06-10" }),
      ],
      { now: NOW },
    );
    expect(res.current).toEqual({ month: "2026-06", income: 0, expense: 0, net: 0 });
  });

  it("ignores pending and rejected documents", () => {
    const res = computeMonthlyPnl(
      [
        doc({ status: "pending",  amount_ils: 1000, doc_date: "2026-06-01" }),
        doc({ status: "rejected", amount_ils: 2000, doc_date: "2026-06-01" }),
        doc({ status: "approved", amount_ils: 500,  doc_date: "2026-06-01" }),
      ],
      { now: NOW },
    );
    expect(res.current.expense).toBe(500);
  });

  it("skips missing amount_ils / missing doc_date / NaN without crashing", () => {
    const res = computeMonthlyPnl(
      [
        doc({ amount_ils: null,         doc_date: "2026-06-01" }),
        doc({ amount_ils: "not a num" as unknown as number, doc_date: "2026-06-01" }),
        doc({ amount_ils: 50,           doc_date: null }),
        doc({ amount_ils: 50,           doc_date: "" }),
        doc({ amount_ils: 100,          doc_date: "2026-06-01" }),
      ],
      { now: NOW },
    );
    // Only the clean 100 lands.
    expect(res.current.expense).toBe(100);
    // None of the dropped rows produced NaN.
    for (const r of res.rows) {
      expect(Number.isFinite(r.income)).toBe(true);
      expect(Number.isFinite(r.expense)).toBe(true);
      expect(Number.isFinite(r.net)).toBe(true);
    }
  });

  it("drops docs outside the window (older than N months back)", () => {
    const res = computeMonthlyPnl(
      [
        doc({ direction: "income",  amount_ils: 999, doc_date: "2025-06-15" }),
        doc({ direction: "expense", amount_ils: 88,  doc_date: "2026-06-15" }),
      ],
      { now: NOW, months: 6 },
    );
    expect(res.rows.reduce((s, r) => s + r.income, 0)).toBe(0);
    expect(res.current.expense).toBe(88);
  });

  it("honours custom `months` window", () => {
    const res = computeMonthlyPnl([], { now: NOW, months: 3 });
    expect(res.rows.map((r) => r.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
  });

  it("middle months with no docs stay at 0/0/0 (zero-fill)", () => {
    const res = computeMonthlyPnl(
      [
        doc({ direction: "expense", amount_ils: 100, doc_date: "2026-02-01" }),
        doc({ direction: "expense", amount_ils: 100, doc_date: "2026-06-01" }),
      ],
      { now: NOW },
    );
    const mar = res.rows.find((r) => r.month === "2026-03")!;
    expect(mar).toEqual({ month: "2026-03", income: 0, expense: 0, net: 0 });
  });

  it("rounds to 2 decimals so display never shows floating-point junk", () => {
    const res = computeMonthlyPnl(
      [
        doc({ direction: "expense", amount_ils: 0.1, doc_date: "2026-06-01" }),
        doc({ direction: "expense", amount_ils: 0.2, doc_date: "2026-06-01" }),
      ],
      { now: NOW },
    );
    // 0.1 + 0.2 = 0.30000000000000004 in raw JS; the helper rounds to 0.3.
    expect(res.current.expense).toBe(0.3);
  });
});
