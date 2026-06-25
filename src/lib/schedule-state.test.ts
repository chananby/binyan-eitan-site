import { describe, it, expect } from "vitest";
import {
  weekRange,
  groupBySchedule,
  cellAt,
  applyToAllWeek,
  type ScheduleAssignment,
} from "./schedule-state";
import { getSundayLocal, addWeeks, WEEK_DAYS } from "./israel-week";

// Test factory — minimal ScheduleAssignment with sensible defaults so
// each test only spells out the fields it cares about.
const mk = (a: Partial<ScheduleAssignment>): ScheduleAssignment => ({
  id:           a.id           ?? "r-" + Math.random().toString(36).slice(2, 7),
  staff_id:     a.staff_id     ?? "s1",
  date:         a.date         ?? "2026-07-12",
  project_id:   a.project_id   ?? null,
  project_name: a.project_name ?? null,
});

describe("weekRange — 5 ascending dates starting Sunday", () => {
  it("returns WEEK_DAYS dates beginning at the given Sunday", () => {
    // 2026-07-12 is a Sunday in the Gregorian calendar.
    const days = weekRange("2026-07-12");
    expect(days).toHaveLength(WEEK_DAYS);
    expect(days[0]).toBe("2026-07-12");
    expect(days[1]).toBe("2026-07-13");
    expect(days[2]).toBe("2026-07-14");
    expect(days[3]).toBe("2026-07-15");
    expect(days[4]).toBe("2026-07-16");
  });

  it("crosses month boundary cleanly (Sun=2026-07-26 → spans Jul/Aug)", () => {
    const days = weekRange("2026-07-26");
    expect(days).toEqual([
      "2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30",
    ]);
  });

  it("crosses year boundary cleanly (Sun=2025-12-28 → spans Dec/Jan)", () => {
    const days = weekRange("2025-12-28");
    expect(days[0]).toBe("2025-12-28");
    expect(days[WEEK_DAYS - 1]).toBe("2026-01-01");
  });

  it("composes with the existing addWeeks helper — next week's Sunday is +7d", () => {
    const next = addWeeks("2026-07-12", 1);
    expect(next).toBe("2026-07-19");
    expect(weekRange(next)[0]).toBe("2026-07-19");
  });
});

describe("groupBySchedule — 2-level Map(staff_id → Map(date → cell))", () => {
  it("buckets rows by staff_id then by date", () => {
    const rows = [
      mk({ id: "a", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "b", staff_id: "s1", date: "2026-07-13", project_id: "p2" }),
      mk({ id: "c", staff_id: "s2", date: "2026-07-12", project_name: "אתר ידני" }),
    ];
    const m = groupBySchedule(rows);
    expect(m.size).toBe(2);
    expect(m.get("s1")?.size).toBe(2);
    expect(m.get("s1")?.get("2026-07-12")?.projectId).toBe("p1");
    expect(m.get("s1")?.get("2026-07-13")?.projectId).toBe("p2");
    expect(m.get("s2")?.get("2026-07-12")?.projectName).toBe("אתר ידני");
  });

  it("propagates assignmentId so the UI can target a row for delete/update", () => {
    const m = groupBySchedule([mk({ id: "row-42", staff_id: "s1", date: "2026-07-12" })]);
    expect(m.get("s1")?.get("2026-07-12")?.assignmentId).toBe("row-42");
  });

  it("a duplicate (staff_id, date) — last write wins (the DB unique index prevents this from happening anyway)", () => {
    const m = groupBySchedule([
      mk({ id: "old", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "new", staff_id: "s1", date: "2026-07-12", project_id: "p2" }),
    ]);
    expect(m.get("s1")?.get("2026-07-12")?.projectId).toBe("p2");
    expect(m.get("s1")?.get("2026-07-12")?.assignmentId).toBe("new");
  });

  it("empty input → empty map", () => {
    expect(groupBySchedule([]).size).toBe(0);
  });
});

describe("cellAt — single-cell lookup with null fallback", () => {
  const grouped = groupBySchedule([
    mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
    mk({ id: "r2", staff_id: "s1", date: "2026-07-14", project_name: "אתר X" }),
  ]);

  it("returns the cell when both staff and date hit", () => {
    expect(cellAt(grouped, "s1", "2026-07-12")?.projectId).toBe("p1");
    expect(cellAt(grouped, "s1", "2026-07-14")?.projectName).toBe("אתר X");
  });

  it("returns null when staff has no plan at all", () => {
    expect(cellAt(grouped, "s-unknown", "2026-07-12")).toBeNull();
  });

  it("returns null when staff exists but has nothing planned that day (gap)", () => {
    expect(cellAt(grouped, "s1", "2026-07-13")).toBeNull();
  });
});

describe("applyToAllWeek — generate 5 upsert payloads for a row-fill", () => {
  const weekDates = weekRange("2026-07-12");

  it("emits one row per visible day with real project_id", () => {
    const out = applyToAllWeek("s1", { kind: "real", id: "p1" }, weekDates);
    expect(out).toHaveLength(WEEK_DAYS);
    for (const row of out) {
      expect(row.staff_id).toBe("s1");
      expect(row.project_id).toBe("p1");
      expect(row.project_name).toBeNull();
    }
    expect(out.map((r) => r.date)).toEqual(weekDates);
  });

  it("emits manual project_name on the same shape (project_id = null)", () => {
    const out = applyToAllWeek("s1", { kind: "manual", name: "אתר X" }, weekDates);
    expect(out).toHaveLength(WEEK_DAYS);
    for (const row of out) {
      expect(row.project_id).toBeNull();
      expect(row.project_name).toBe("אתר X");
    }
  });

  it("passes through an arbitrary date list (not just weekRange output)", () => {
    // 3-day fill (e.g. a future "apply Mon-Wed" tweak in PR 4) — helper
    // doesn't validate length, so it works for any non-empty list.
    const out = applyToAllWeek("s1", { kind: "real", id: "p1" }, ["2026-07-12", "2026-07-13", "2026-07-14"]);
    expect(out).toHaveLength(3);
  });

  it("empty dates → empty output (defensive)", () => {
    expect(applyToAllWeek("s1", { kind: "real", id: "p1" }, [])).toEqual([]);
  });
});

describe("israel-week helpers — already-shared by WeeklyPlanner", () => {
  it("getSundayLocal anchors a midweek date to its Sunday", () => {
    // 2026-07-15 is a Wednesday → its Sunday is 2026-07-12.
    const date = new Date(2026, 6, 15, 12, 0); // local midday avoids TZ surprise
    expect(getSundayLocal(date)).toBe("2026-07-12");
  });

  it("getSundayLocal is idempotent — a Sunday maps to itself", () => {
    const date = new Date(2026, 6, 12, 12, 0); // 2026-07-12 (Sunday)
    expect(getSundayLocal(date)).toBe("2026-07-12");
  });

  it("addWeeks moves forward by exactly n*7 days", () => {
    expect(addWeeks("2026-07-12", 1)).toBe("2026-07-19");
    expect(addWeeks("2026-07-12", 4)).toBe("2026-08-09");
  });

  it("addWeeks moves backward with negative n", () => {
    expect(addWeeks("2026-07-12", -1)).toBe("2026-07-05");
  });
});
