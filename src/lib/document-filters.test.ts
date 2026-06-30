import { describe, it, expect } from "vitest";
import {
  readDocContentFilters,
  applyDocContentFilters,
  type FilterableQuery,
} from "./document-filters";

// Records every chained call so we can assert the EXACT .eq/.not/.or sequence
// the list GET and the export must share verbatim.
function mockQuery() {
  const calls: unknown[][] = [];
  const q: FilterableQuery & { calls: unknown[][] } = {
    calls,
    eq(col, val) { calls.push(["eq", col, val]); return q; },
    is(col, val) { calls.push(["is", col, val]); return q; },
    not(col, op, val) { calls.push(["not", col, op, val]); return q; },
    or(filters) { calls.push(["or", filters]); return q; },
  };
  return q;
}

describe("readDocContentFilters", () => {
  it("reads + trims each field, duplicates_only is boolean", () => {
    const sp = new URLSearchParams("doc_type=invoice&direction=expense&category=fuel&vendor_id=v1&project_id=p1&duplicates_only=true&q=  acme ");
    expect(readDocContentFilters(sp)).toEqual({
      doc_type: "invoice", direction: "expense", category: "fuel",
      vendor_id: "v1", project_id: "p1", no_project: false,
      duplicates_only: true, q: "acme",
    });
  });

  it("missing params → nulls / false", () => {
    const f = readDocContentFilters(new URLSearchParams(""));
    expect(f).toEqual({
      doc_type: null, direction: null, category: null,
      vendor_id: null, project_id: null, no_project: false,
      duplicates_only: false, q: null,
    });
  });

  it("duplicates_only only true for the literal 'true'", () => {
    expect(readDocContentFilters(new URLSearchParams("duplicates_only=1")).duplicates_only).toBe(false);
    expect(readDocContentFilters(new URLSearchParams("duplicates_only=true")).duplicates_only).toBe(true);
  });

  it("no_project is true only for the literal 'true'", () => {
    expect(readDocContentFilters(new URLSearchParams("no_project=1")).no_project).toBe(false);
    expect(readDocContentFilters(new URLSearchParams("no_project=true")).no_project).toBe(true);
  });
});

describe("applyDocContentFilters", () => {
  it("applies each present filter as the expected .eq/.is/.not/.or call", () => {
    const q = mockQuery();
    applyDocContentFilters(q, {
      doc_type: "invoice", direction: "expense", category: "fuel",
      vendor_id: "v1", project_id: "p1", no_project: false,
      duplicates_only: true, q: "acme",
    });
    expect(q.calls).toEqual([
      ["eq", "doc_type", "invoice"],
      ["eq", "direction", "expense"],
      ["eq", "category", "fuel"],
      ["eq", "vendor_id", "v1"],
      ["eq", "project_id", "p1"],
      ["not", "possible_duplicate_of", "is", null],
      ["or", "vendor_name_raw.ilike.%acme%,doc_number.ilike.%acme%,description.ilike.%acme%"],
    ]);
  });

  it("applies nothing when all filters are empty", () => {
    const q = mockQuery();
    applyDocContentFilters(q, {
      doc_type: null, direction: null, category: null,
      vendor_id: null, project_id: null, no_project: false,
      duplicates_only: false, q: null,
    });
    expect(q.calls).toEqual([]);
  });

  it("duplicates_only=false does not add the .not clause", () => {
    const q = mockQuery();
    applyDocContentFilters(q, {
      doc_type: null, direction: null, category: null,
      vendor_id: null, project_id: null, no_project: false,
      duplicates_only: false, q: "x",
    });
    expect(q.calls).toEqual([["or", "vendor_name_raw.ilike.%x%,doc_number.ilike.%x%,description.ilike.%x%"]]);
  });

  it("no_project=true emits .is(project_id, null) instead of .eq", () => {
    const q = mockQuery();
    applyDocContentFilters(q, {
      doc_type: null, direction: null, category: null,
      vendor_id: null, project_id: null, no_project: true,
      duplicates_only: false, q: null,
    });
    expect(q.calls).toEqual([["is", "project_id", null]]);
  });

  it("no_project wins when both no_project and project_id are sent", () => {
    const q = mockQuery();
    applyDocContentFilters(q, {
      doc_type: null, direction: null, category: null,
      vendor_id: null, project_id: "p1", no_project: true,
      duplicates_only: false, q: null,
    });
    expect(q.calls).toEqual([["is", "project_id", null]]);
  });
});
