import { describe, it, expect } from "vitest";
import {
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
    expect(hasOpenRecord(rows, DAY_START)).toBe(false);
  });

  it("entry→(new in) while first is still open → blocked (fix #3)", () => {
    const rows = [ev("in", todayAt("08:00"))];
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

  it("mid-day: in→out→in (second still open) → blocked", () => {
    // Same worker went out for lunch, came back, hasn't clocked out for the
    // afternoon yet. The LATEST event is the second IN.
    const rows = [
      ev("in",  todayAt("06:00")),
      ev("out", todayAt("10:00")),
      ev("in",  todayAt("11:00")),
    ];
    expect(hasOpenRecord(rows, DAY_START)).toBe(true);
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

  it("an exit without a matching entry → not open (nothing to close)", () => {
    const rows = [ev("out", todayAt("17:00"))];
    expect(hasOpenRecord(rows, DAY_START)).toBe(false);
  });
});

describe("day scoping by clock_at (fix #4)", () => {
  it("a record entered today FOR yesterday (clock_at < dayStart) is not open today", () => {
    const rows = [ev("כניסה", "2026-06-15T20:00:00.000Z")]; // yesterday's clock_at
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
    expect(hasOpenRecord(rows, DAY_START)).toBe(true);
  });
});

describe("hasOpenRecord under a rolling 24h window (B3 clock-out guard)", () => {
  // This block reproduces the 2026-07-06 incident. The B3 guard passes a
  // rolling `now - 24h` cutoff rather than a fixed day boundary, so
  // yesterday's exit can still be in the window at the moment a worker
  // clocks in again this morning. The old count-based logic saw
  //   ins=1, outs=1 → openCount=0 → "no open entry" → BLOCKED
  // even though today's IN was manifestly unclosed. Last-event semantics
  // report the truth: LATEST is today's IN, shift is open, allow OUT.
  const CUTOFF = "2026-07-05T11:21:34.000Z"; // arbitrary 24h-ago moment
  const at = (iso: string) => iso;

  it("BUG REPRO: yesterday IN+OUT + today IN (still open) → open", () => {
    const rows = [
      ev("in",  at("2026-07-05T03:55:48.000Z")), // yesterday morning
      ev("out", at("2026-07-05T15:17:41.000Z")), // yesterday evening (still in 24h window)
      ev("in",  at("2026-07-06T03:59:26.000Z")), // today morning — unclosed
    ];
    expect(hasOpenRecord(rows, CUTOFF)).toBe(true);
  });

  it("yesterday IN+OUT + today IN+OUT → closed (last is exit)", () => {
    const rows = [
      ev("in",  at("2026-07-05T03:55:48.000Z")),
      ev("out", at("2026-07-05T15:17:41.000Z")),
      ev("in",  at("2026-07-06T03:59:26.000Z")),
      ev("out", at("2026-07-06T10:00:00.000Z")),
    ];
    expect(hasOpenRecord(rows, CUTOFF)).toBe(false);
  });

  it("worker with only stale IN (before the 24h cutoff) → not open (window scope)", () => {
    // Cutoff at 2026-07-05T11:21Z; entry 30h before — outside window.
    const rows = [ev("in", "2026-07-04T04:00:00.000Z")];
    expect(hasOpenRecord(rows, CUTOFF)).toBe(false);
  });

  it("last-event picks the max clock_at even when rows arrive out of order", () => {
    const rows = [
      ev("out", at("2026-07-06T10:00:00.000Z")), // last event chronologically
      ev("in",  at("2026-07-06T04:00:00.000Z")),
      ev("out", at("2026-07-05T15:00:00.000Z")),
      ev("in",  at("2026-07-05T04:00:00.000Z")),
    ];
    expect(hasOpenRecord(rows, CUTOFF)).toBe(false);
  });
});

describe("hasOpenRecord as the day-scoped guard for manual + clock-out endpoints", () => {
  // These are the exact shapes the /api/admin/attendance/manual (duplicate
  // guard on a new IN) and /api/admin/attendance/clock-out (orphan-exit
  // guard) call sites hand to hasOpenRecord: rows filtered to a single
  // calendar day, windowStart = that day's midnight. Same helper, tighter
  // window — proves both guards fire the way the routes expect.
  const DS = "2026-07-06T00:00:00.000Z"; // day-start for the test day
  const at = (hhmm: string) => `2026-07-06T${hhmm}:00.000Z`;

  it("BUG REPRO — Weiss 2026-07-06: live IN present → manual IN must be rejected", () => {
    // Weiss's actual state at the moment chnn opened ManualEntryForm:
    // one live IN at 06:14Z (09:14 IL), no exit yet.
    const rows = [ev("in", "2026-07-06T06:14:10.979Z")];
    expect(hasOpenRecord(rows, DS)).toBe(true);
  });

  it("no rows for the day → allow a fresh manual IN (blank canvas)", () => {
    expect(hasOpenRecord([], DS)).toBe(false);
  });

  it("closed shift (IN→OUT) earlier the same day → allow a second manual IN", () => {
    const rows = [ev("in", at("06:00")), ev("out", at("14:00"))];
    expect(hasOpenRecord(rows, DS)).toBe(false);
  });

  it("orphan exit already exists (no IN) → also 'no open entry' → BLOCK clock-out", () => {
    // Weird prior data — a lone OUT with no matching IN. clock-out
    // should refuse to add ANOTHER OUT.
    const rows = [ev("out", at("14:00"))];
    expect(hasOpenRecord(rows, DS)).toBe(false);
  });

  it("open IN present → ALLOW clock-out (the השלמת יציאה case)", () => {
    // This is the flow that used to force chnn into ManualEntryForm's
    // IN+OUT pair. With the WorkerHistoryPanel fix, in-progress days
    // route here, and the guard confirms the IN exists to close.
    const rows = [ev("in", at("07:00"))];
    expect(hasOpenRecord(rows, DS)).toBe(true);
  });
});

describe("hasOpenRecord as the Twilio /voice/action guard (mixed vocabularies)", () => {
  // The Twilio IVR was the last surface that filtered same-day duplicates
  // with .eq("action", "out") — English only. A worker whose manual
  // "יציאה" had been logged by chnn earlier the same day could call in,
  // slip past the check, and mint a duplicate OUT (Weiss on the phone).
  // These cases pin the invariants the new guard relies on: hasOpenRecord
  // must handle both action vocabularies uniformly and route Twilio's OUT
  // to the "already exited" / "no open entry" branches without ever
  // reaching insertPhoneAttendance.
  const DS = "2026-07-06T00:00:00.000Z";
  const at = (hhmm: string) => `2026-07-06T${hhmm}:00.000Z`;

  it("BUG REPRO — prior manual Hebrew יציאה + Twilio OUT: last event = exit → BLOCK", () => {
    // The exact shape from the /voice/action OUT branch: worker has IN
    // + a manual Hebrew יציאה earlier today. hasOpenRecord=false is
    // the signal for "no open entry to close" — Twilio must NOT insert
    // another out, or it duplicates the Hebrew exit already on the row.
    const rows = [ev("in", at("07:00")), ev("יציאה", at("14:00"))];
    expect(hasOpenRecord(rows, DS)).toBe(false);
  });

  it("live English 'in' + Twilio OUT with no prior exit → ALLOW (normal end-of-shift call)", () => {
    // The typical happy path: worker clocked in via the web this morning
    // (English "in"), calls Twilio at the end of shift. hasOpenRecord=true
    // → the guard lets the OUT through.
    const rows = [ev("in", at("07:00"))];
    expect(hasOpenRecord(rows, DS)).toBe(true);
  });

  it("no events at all today + Twilio OUT → BLOCK orphan exit", () => {
    // Worker never clocked in today, calls to clock out anyway (typo, or
    // called from home). Before the guard, Twilio would create a lone
    // OUT that shows up in payroll as a phantom −N-hour shift.
    expect(hasOpenRecord([], DS)).toBe(false);
  });

  it("manual כניסה (Hebrew) + Twilio OUT → ALLOW (chnn opened, worker closes by phone)", () => {
    // The reverse-vocabulary case: chnn added a manual Hebrew כניסה for
    // the worker earlier (say, they forgot the morning clock-in), the
    // worker now calls in for the OUT. Guard must recognise the Hebrew
    // IN as open — otherwise the worker is stuck.
    const rows = [ev("כניסה", at("06:00"))];
    expect(hasOpenRecord(rows, DS)).toBe(true);
  });
});
