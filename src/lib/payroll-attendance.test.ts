import { describe, it, expect } from "vitest";
import { filterApprovedForPay, countPendingStatus } from "./payroll-attendance";

const row = (status: string | null) => ({ staff_id: "s1", status });

describe("payroll-attendance — approval gate", () => {
  it("counts an approved row toward pay", () => {
    expect(filterApprovedForPay([row("approved")])).toHaveLength(1);
  });

  // The core of this fix: a pending row (foreman awaiting review) must NOT be
  // paid. It's held back until an admin approves it.
  it("does NOT count a pending row toward pay", () => {
    const approved = filterApprovedForPay([row("approved"), row("pending")]);
    expect(approved).toHaveLength(1);
    expect(approved[0].status).toBe("approved");
  });

  it("excludes rejected rows from pay too", () => {
    expect(filterApprovedForPay([row("rejected"), row("approved")])).toHaveLength(1);
  });

  // Legacy safety: a NULL status is not 'approved', so it is excluded. (In
  // production every live row is written 'approved', so this is defensive.)
  it("excludes a null-status row", () => {
    expect(filterApprovedForPay([row(null)])).toHaveLength(0);
  });

  it("counts only pending rows for the warning", () => {
    expect(countPendingStatus([row("approved"), row("pending"), row("pending"), row("rejected")])).toBe(2);
  });
});
