import { describe, it, expect } from "vitest";
import { computeProjectBudget, type BudgetDoc } from "./budget-actual";

const doc = (direction: string | null, status: string | null, total_amount: number | null): BudgetDoc =>
  ({ direction, status, total_amount });

describe("computeProjectBudget", () => {
  it("sums only approved expenses into approvedExpense", () => {
    const docs = [
      doc("expense", "approved", 100),
      doc("expense", "approved", 250),
      doc("expense", "pending", 999),   // not approved
      doc("expense", "rejected", 500),  // not approved
    ];
    const r = computeProjectBudget(1000, docs);
    expect(r.approvedExpense).toBe(350);
  });

  it("sums pending expenses separately into pendingExpense", () => {
    const docs = [
      doc("expense", "pending", 40),
      doc("expense", "pending", 60),
      doc("expense", "approved", 1000),
    ];
    const r = computeProjectBudget(5000, docs);
    expect(r.pendingExpense).toBe(100);
  });

  it("ignores income documents entirely", () => {
    const docs = [
      doc("income", "approved", 5000),
      doc("income", "pending", 3000),
      doc("expense", "approved", 200),
    ];
    const r = computeProjectBudget(1000, docs);
    expect(r.approvedExpense).toBe(200);
    expect(r.pendingExpense).toBe(0);
  });

  it("computes remaining and percentSpent against the budget", () => {
    const r = computeProjectBudget(1000, [doc("expense", "approved", 250)]);
    expect(r.remaining).toBe(750);
    expect(r.percentSpent).toBe(25);
  });

  it("treats a null budget as 'no budget defined' — remaining/percent null", () => {
    const r = computeProjectBudget(null, [doc("expense", "approved", 250)]);
    expect(r.hasBudget).toBe(false);
    expect(r.budget).toBeNull();
    expect(r.approvedExpense).toBe(250); // still computed
    expect(r.remaining).toBeNull();
    expect(r.percentSpent).toBeNull();
  });

  it("treats undefined budget like null", () => {
    const r = computeProjectBudget(undefined, [doc("expense", "approved", 10)]);
    expect(r.hasBudget).toBe(false);
    expect(r.remaining).toBeNull();
  });

  it("avoids divide-by-zero: budget 0 → percentSpent null, remaining negative", () => {
    const r = computeProjectBudget(0, [doc("expense", "approved", 50)]);
    expect(r.percentSpent).toBeNull();
    expect(r.remaining).toBe(-50);
  });

  it("counts a null total_amount as 0", () => {
    const r = computeProjectBudget(1000, [
      doc("expense", "approved", null),
      doc("expense", "approved", 100),
    ]);
    expect(r.approvedExpense).toBe(100);
  });

  it("over-budget yields a negative remaining and percent > 100", () => {
    const r = computeProjectBudget(1000, [doc("expense", "approved", 1500)]);
    expect(r.remaining).toBe(-500);
    expect(r.percentSpent).toBe(150);
  });

  it("empty document list → zero expenses, full budget remaining", () => {
    const r = computeProjectBudget(2000, []);
    expect(r.approvedExpense).toBe(0);
    expect(r.pendingExpense).toBe(0);
    expect(r.remaining).toBe(2000);
    expect(r.percentSpent).toBe(0);
  });
});
