import { describe, it, expect } from "vitest";
import { fetchAllRows } from "./supabase-pagination";

/** Build a fake makeQuery over `total` synthetic rows, honouring .range(from,to)
 *  the way PostgREST does (inclusive bounds, capped at `serverCap`). Records the
 *  ranges requested so we can assert the paging walk. */
function fakeSource(total: number, serverCap: number, ranges: Array<[number, number]>) {
  const all = Array.from({ length: total }, (_, i) => ({ id: i }));
  return () => ({
    range(from: number, to: number) {
      ranges.push([from, to]);
      // PostgREST returns at most serverCap rows even if the range asks for more.
      const slice = all.slice(from, Math.min(to + 1, from + serverCap));
      return Promise.resolve({ data: slice, error: null });
    },
  });
}

describe("fetchAllRows", () => {
  it("returns everything when it fits in one short page", async () => {
    const ranges: Array<[number, number]> = [];
    const rows = await fetchAllRows<{ id: number }>(fakeSource(37, 1000, ranges), 1000);
    expect(rows).toHaveLength(37);
    expect(ranges).toEqual([[0, 999]]); // one page, then a short page ended it
  });

  it("keeps paging past a FULL page (the silent-truncation trap)", async () => {
    const ranges: Array<[number, number]> = [];
    const rows = await fetchAllRows<{ id: number }>(fakeSource(2300, 1000, ranges), 1000);
    expect(rows).toHaveLength(2300);
    expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 2300 }, (_, i) => i)); // no gaps/dupes
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("does an extra empty read when total is an exact multiple of pageSize", async () => {
    const ranges: Array<[number, number]> = [];
    const rows = await fetchAllRows<{ id: number }>(fakeSource(2000, 1000, ranges), 1000);
    expect(rows).toHaveLength(2000);
    // 1000 (full) → 1000 (full) → 0 (short) stops it
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("THROWS on a page error — never returns a partial set", async () => {
    let call = 0;
    const make = () => ({
      range(_from: number, _to: number) {
        call += 1;
        if (call === 2) return Promise.resolve({ data: null, error: { message: "boom" } });
        return Promise.resolve({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null });
      },
    });
    await expect(fetchAllRows<{ id: number }>(make, 1000)).rejects.toThrow(/boom/);
  });

  it("handles an empty result set", async () => {
    const ranges: Array<[number, number]> = [];
    const rows = await fetchAllRows<{ id: number }>(fakeSource(0, 1000, ranges), 1000);
    expect(rows).toEqual([]);
    expect(ranges).toEqual([[0, 999]]);
  });

  it("never mistakes a server cap below pageSize as the end is not our concern, but a full page always continues", async () => {
    // total 1500, pageSize 1000: page1=1000 (full → continue), page2=500 (short → stop)
    const ranges: Array<[number, number]> = [];
    const rows = await fetchAllRows<{ id: number }>(fakeSource(1500, 1000, ranges), 1000);
    expect(rows).toHaveLength(1500);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });
});
