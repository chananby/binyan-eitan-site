import { describe, expect, it } from "vitest";
import {
  groupExpensesByProject,
  sumSplits,
  type SplitDocRaw,
  type SplitRowRaw,
} from "./document-splits";

// Convenience factory — the caller only overrides the interesting fields.
function doc(over: Partial<SplitDocRaw>): SplitDocRaw {
  return {
    id: "doc-1",
    project_id: null,
    direction: "expense",
    status: "approved",
    amount_ils: 1000,
    ...over,
  };
}
function split(over: Partial<SplitRowRaw>): SplitRowRaw {
  return { document_id: "doc-1", project_id: "proj-A", amount: 400, ...over };
}

const projA = "proj-A";
const projB = "proj-B";
const projC = "proj-C";

function amountsFor(map: Map<string, { amount_ils: number | null }[]>, project: string): number[] {
  return (map.get(project) ?? []).map((r) => Number(r.amount_ils));
}

describe("groupExpensesByProject", () => {
  it("routes a single-project doc through project_id", () => {
    const by = groupExpensesByProject(
      [doc({ project_id: projA, amount_ils: 1000 })],
      [],
    );
    expect(amountsFor(by, projA)).toEqual([1000]);
    expect(by.get(projB)).toBeUndefined();
  });

  it("routes a split doc to each split's project", () => {
    const parent = doc({ id: "d-split", project_id: null, amount_ils: 5000 });
    const by = groupExpensesByProject(
      [parent],
      [
        split({ document_id: "d-split", project_id: projA, amount: 3000 }),
        split({ document_id: "d-split", project_id: projB, amount: 2000 }),
      ],
    );
    expect(amountsFor(by, projA)).toEqual([3000]);
    expect(amountsFor(by, projB)).toEqual([2000]);
  });

  it("carries direction + status from the parent doc onto every split row", () => {
    const parent = doc({
      id: "d-p", project_id: null,
      direction: "expense", status: "pending",
    });
    const by = groupExpensesByProject(
      [parent],
      [split({ document_id: "d-p", project_id: projA, amount: 100 })],
    );
    const row = by.get(projA)![0];
    expect(row.direction).toBe("expense");
    expect(row.status).toBe("pending");
  });

  it("does not double count a doc that has BOTH project_id AND splits (defensive)", () => {
    // Someone violated the write-time invariant via direct SQL. The splits
    // should still win — the doc's own project_id contribution is dropped.
    const parent = doc({
      id: "d-both", project_id: projC, amount_ils: 999,
    });
    const by = groupExpensesByProject(
      [parent],
      [split({ document_id: "d-both", project_id: projA, amount: 400 })],
    );
    // projA gets the split, projC gets nothing.
    expect(amountsFor(by, projA)).toEqual([400]);
    expect(by.get(projC)).toBeUndefined();
  });

  it("drops split rows whose parent doc isn't in the input slice", () => {
    // Real-world case: rollup filters out rejected docs; their orphan
    // splits should also disappear from the bucket rather than contribute
    // with unknown status/direction.
    const by = groupExpensesByProject(
      [], // no docs
      [split({ document_id: "d-ghost", project_id: projA, amount: 400 })],
    );
    expect(by.get(projA)).toBeUndefined();
  });

  it("handles multiple singles + multiple splits on the same project", () => {
    const by = groupExpensesByProject(
      [
        doc({ id: "s1", project_id: projA, amount_ils: 100 }),
        doc({ id: "s2", project_id: projA, amount_ils: 200 }),
        doc({ id: "mp", project_id: null, amount_ils: 500 }),
      ],
      [
        split({ document_id: "mp", project_id: projA, amount: 300 }),
        split({ document_id: "mp", project_id: projB, amount: 200 }),
      ],
    );
    // projA has: two singles (100, 200) + one split slice (300)
    expect(amountsFor(by, projA).sort()).toEqual([100, 200, 300]);
    expect(amountsFor(by, projB)).toEqual([200]);
  });

  it("no docs, no splits → empty map (does not throw)", () => {
    const by = groupExpensesByProject([], []);
    expect(by.size).toBe(0);
  });

  it("passes through null amount_ils on singles — downstream sum treats null as 0", () => {
    // The helper doesn't coerce singles because computeProjectBudget already
    // handles null via `?? 0`. Preserving null here keeps a downstream flag
    // (e.g. "we're missing an ILS value") reachable if anyone wants it.
    const by = groupExpensesByProject(
      [doc({ project_id: projA, amount_ils: null })],
      [],
    );
    expect(by.get(projA)![0].amount_ils).toBeNull();
  });

  it("split amounts ARE coerced (null → 0) so a bad row can't produce NaN", () => {
    const parent = doc({ id: "dp", project_id: null });
    const by = groupExpensesByProject(
      [parent],
      [split({ document_id: "dp", project_id: projA, amount: null })],
    );
    expect(by.get(projA)![0].amount_ils).toBe(0);
  });
});

describe("sumSplits", () => {
  it("sums numeric amounts", () => {
    expect(sumSplits([split({ amount: 100 }), split({ amount: 200 })])).toBe(300);
  });

  it("accepts string amounts (Supabase numeric → string in some clients)", () => {
    expect(sumSplits([split({ amount: "100.50" }), split({ amount: "50.25" })])).toBe(150.75);
  });

  it("rounds to 2 decimals so 0.1 + 0.2 displays as 0.3", () => {
    expect(sumSplits([split({ amount: 0.1 }), split({ amount: 0.2 })])).toBe(0.3);
  });

  it("null amounts are treated as 0", () => {
    expect(sumSplits([split({ amount: null }), split({ amount: 100 })])).toBe(100);
  });

  it("empty list → 0", () => {
    expect(sumSplits([])).toBe(0);
  });
});
