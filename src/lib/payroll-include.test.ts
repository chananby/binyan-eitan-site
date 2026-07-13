import { describe, it, expect } from "vitest";
import { includeInReport } from "./payroll-include";

describe("includeInReport — presence-driven payroll inclusion", () => {
  it("includes an active worker regardless of hours", () => {
    expect(includeInReport(true, false)).toBe(true);
    expect(includeInReport(true, true)).toBe(true);
  });

  // The bug this fixes: a deactivated worker who clocked hours this month
  // used to vanish from payroll (and the accountant's XLSX) — an unpaid
  // worker. Presence must override status.
  it("includes a DEACTIVATED worker who worked this month", () => {
    expect(includeInReport(false, true)).toBe(true);
  });

  // The guard against flooding: a deactivated worker with no activity must
  // stay out, so the ~21 dormant inactive rows don't drown the report.
  it("excludes a deactivated worker with no hours this month", () => {
    expect(includeInReport(false, false)).toBe(false);
  });
});
