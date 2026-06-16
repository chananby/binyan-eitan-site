import { describe, it, expect } from "vitest";
import {
  openEntryCount,
  hasOpenRecord,
  planManualWorkRows,
  type AttEvent,
} from "./attendance-logic";

// Day boundary for the tests. The routes pass israelDayStartISO(today); here we
// use a plain UTC midnight — the logic only does string >= on ISO-8601 values,
// which sort chronologically, so the exact zone is irrelevant to the rules.
const DAY_START = "2026-06-16T00:00:00.000Z";
const todayAt   = (hhmm: string) => `2026-06-16T${hhmm}:00.000Z`;
const ev = (action: string, clock_at: string | null): AttEvent => ({ action, clock_at });

describe("planManualWorkRows — manual entry-only vs entry+exit (fix #1)", () => {
  it("entry only (no exit) → a single open כניסה row", () => {
    const rows = planManualWorkRows("08:00");
    expect(rows).toEqual([{ action: "כניסה", time: "08:00" }]);
  });

  it("empty / null exit is treated the same as no exit", () => {
    expect(planManualWorkRows("08:00", "")).toHaveLength(1);
    expect(planManualWorkRows("08:00", null)).toHaveLength(1);
    expect(planManualWorkRows("08:00", undefined)).toHaveLength(1);
  });

  it("entry + exit → two rows (כניסה then יציאה) as before", () => {
    const rows = planManualWorkRows("08:00", "17:00");
    expect(rows).toEqual([
      { action: "כניסה", time: "08:00" },
      { action: "יציאה", time: "17:00" },
    ]);
  });
});

describe("hasOpenRecord — re-clock-in guard (fixes #2 & #3)", () => {
  it("entry→exit→(new in): prior pair is closed → NOT blocked (fix #2)", () => {
    // State seen by the guard just before the third clock-in is inserted.
    const rows = [ev("in", todayAt("08:00")), ev("out", todayAt("12:00"))];
    expect(openEntryCount(rows, DAY_START)).toBe(0);
    expect(hasOpenRecord(rows, DAY_START)).toBe(false);
  });

  it("entry→(new in) while first is still open → blocked (fix #3)", () => {
    const rows = [ev("in", todayAt("08:00"))];
    expect(openEntryCount(rows, DAY_START)).toBe(1);
    expect(hasOpenRecord(rows, DAY_START)).toBe(true);
  });

  it("two full shifts (in,out,in,out) → next in allowed", () => {
    const rows = [
      ev("in",  todayAt("06:00")),
      ev("out", todayAt("10:00")),
      ev("in",  todayAt("11:00")),
      ev("out", todayAt("15:00")),
    ];
    expect(hasOpenRecord(rows, DAY_START)).toBe(false);
  });

  it("no records at all today → first clock-in allowed", () => {
    expect(hasOpenRecord([], DAY_START)).toBe(false);
  });

  it("counts both action vocabularies (manual כניסה/יציאה + live in/out)", () => {
    // Manual open entry stored as כניסה; a live 'in' would be a second open.
    expect(hasOpenRecord([ev("כניסה", todayAt("08:00"))], DAY_START)).toBe(true);
    // A manual יציאה closes a live 'in'.
    const closed = [ev("in", todayAt("08:00")), ev("יציאה", todayAt("17:00"))];
    expect(hasOpenRecord(closed, DAY_START)).toBe(false);
  });

  it("an exit without a matching entry never reports a (negative) open record", () => {
    const rows = [ev("out", todayAt("17:00"))];
    expect(openEntryCount(rows, DAY_START)).toBe(-1);
    expect(hasOpenRecord(rows, DAY_START)).toBe(false);
  });
});

describe("day scoping by clock_at (fix #4)", () => {
  it("a record entered today FOR yesterday (clock_at < dayStart) is not open today", () => {
    const rows = [ev("כניסה", "2026-06-15T20:00:00.000Z")]; // yesterday's clock_at
    expect(openEntryCount(rows, DAY_START)).toBe(0);
    expect(hasOpenRecord(rows, DAY_START)).toBe(false);
  });

  it("a null clock_at (absence marker) never counts as an open entry", () => {
    expect(hasOpenRecord([ev("חופש", null), ev("כניסה", null)], DAY_START)).toBe(false);
  });

  it("yesterday's open entry does not block; today's own entry still does", () => {
    const rows = [
      ev("in", "2026-06-15T06:00:00.000Z"), // yesterday — excluded
      ev("in", todayAt("08:00")),           // today — open
    ];
    expect(openEntryCount(rows, DAY_START)).toBe(1);
    expect(hasOpenRecord(rows, DAY_START)).toBe(true);
  });
});
