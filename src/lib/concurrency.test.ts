import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./concurrency";

const tick = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

describe("mapWithConcurrency", () => {
  it("never runs more than `limit` at once", async () => {
    let active = 0, peak = 0;
    await mapWithConcurrency(Array.from({ length: 12 }, (_, i) => i), 4, async (x) => {
      active++; peak = Math.max(peak, active);
      await tick(5);
      active--;
      return x;
    });
    expect(peak).toBe(4); // 12 items, cap 4 → exactly 4 in flight
  });

  it("returns results in INPUT order, not completion order", async () => {
    // Earlier items resolve later (bigger delay) — output must still be ordered.
    const out = await mapWithConcurrency([0, 1, 2, 3, 4], 5, async (x) => {
      await tick((5 - x) * 4);
      return x * 10;
    });
    expect(out).toEqual([0, 10, 20, 30, 40]);
  });

  it("tolerates a single item failing when fn catches internally (export pattern)", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (x) => {
      try {
        if (x === 3) throw new Error("download failed");
        return x;
      } catch {
        return null; // sentinel — the export uses null bytes for a failed file
      }
    });
    expect(out).toEqual([1, 2, null, 4]);
  });

  it("propagates a rejection when fn does NOT catch", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (x) => { if (x === 2) throw new Error("boom"); return x; }),
    ).rejects.toThrow("boom");
  });

  it("empty input → empty output, fn never called", async () => {
    let called = 0;
    const out = await mapWithConcurrency([], 4, async (x) => { called++; return x; });
    expect(out).toEqual([]);
    expect(called).toBe(0);
  });

  it("limit larger than the list still works (caps at list length)", async () => {
    const out = await mapWithConcurrency([1, 2, 3], 99, async (x) => x + 1);
    expect(out).toEqual([2, 3, 4]);
  });
});
