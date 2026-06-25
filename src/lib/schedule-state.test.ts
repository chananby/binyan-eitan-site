import { describe, it, expect } from "vitest";
import {
  weekRange,
  groupBySchedule,
  cellAt,
  applyToAllWeek,
  buildAssignmentRow,
  distinctTempWorkers,
  workerKeyString,
  workerKeyFromRow,
  type ScheduleAssignment,
  type WorkerKey,
} from "./schedule-state";
import { getSundayLocal, addWeeks, WEEK_DAYS } from "./israel-week";

// Test factory — minimal ScheduleAssignment with sensible defaults so
// each test only spells out the fields it cares about. The two worker
// sides (staff_id / temp_name) are mutually exclusive per the DB
// CHECK; the factory defaults to a real staff row.
const mk = (a: Partial<ScheduleAssignment>): ScheduleAssignment => {
  const isStaff = a.staff_id !== undefined || a.temp_name === undefined;
  return {
    id:           a.id           ?? "r-" + Math.random().toString(36).slice(2, 7),
    staff_id:     isStaff ? (a.staff_id ?? "s1") : null,
    temp_name:    isStaff ? null : (a.temp_name ?? "פועל יומי"),
    date:         a.date         ?? "2026-07-12",
    project_id:   a.project_id   ?? null,
    project_name: a.project_name ?? null,
  };
};

const STAFF = (id: string): WorkerKey => ({ kind: "staff", id });
const TEMP  = (name: string): WorkerKey => ({ kind: "temp",  name });

describe("workerKeyString — Map-friendly scalar encoding", () => {
  it("encodes staff and temp with distinct prefixes so collisions can't happen", () => {
    expect(workerKeyString(STAFF("abc"))).toBe("staff:abc");
    expect(workerKeyString(TEMP("abc"))).toBe("temp:abc");
  });

  it("two workers with the same display string map to different keys", () => {
    // A real staff worker called "פועל יומי" wouldn't clash with a
    // temp by the same name — the prefix isolates them.
    expect(workerKeyString(STAFF("פועל יומי"))).not.toBe(workerKeyString(TEMP("פועל יומי")));
  });
});

describe("workerKeyFromRow — pick the right side", () => {
  it("returns staff for a real-staff row", () => {
    const row = mk({ staff_id: "s1" });
    expect(workerKeyFromRow(row)).toEqual({ kind: "staff", id: "s1" });
  });

  it("returns temp for a temp row", () => {
    const row = mk({ staff_id: undefined, temp_name: "אבי הזמני" });
    expect(workerKeyFromRow(row)).toEqual({ kind: "temp", name: "אבי הזמני" });
  });

  it("throws when both sides are null — defensive against a corrupt row that shouldn't exist per the DB CHECK", () => {
    const bad = { ...mk({}), staff_id: null, temp_name: null };
    expect(() => workerKeyFromRow(bad)).toThrow();
  });
});

describe("weekRange — 5 ascending dates starting Sunday", () => {
  it("returns WEEK_DAYS dates beginning at the given Sunday", () => {
    const days = weekRange("2026-07-12");
    expect(days).toHaveLength(WEEK_DAYS);
    expect(days[0]).toBe("2026-07-12");
    expect(days[4]).toBe("2026-07-16");
  });

  it("crosses month boundary cleanly (Sun=2026-07-26 → spans Jul/Aug)", () => {
    expect(weekRange("2026-07-26")).toEqual([
      "2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30",
    ]);
  });

  it("crosses year boundary cleanly (Sun=2025-12-28 → spans Dec/Jan)", () => {
    const days = weekRange("2025-12-28");
    expect(days[0]).toBe("2025-12-28");
    expect(days[WEEK_DAYS - 1]).toBe("2026-01-01");
  });

  it("composes with addWeeks — next week's Sunday is +7d", () => {
    expect(addWeeks("2026-07-12", 1)).toBe("2026-07-19");
    expect(weekRange(addWeeks("2026-07-12", 1))[0]).toBe("2026-07-19");
  });
});

describe("groupBySchedule — 2-level Map keyed by WorkerKey-string + date", () => {
  it("buckets real staff rows by staff:<id>", () => {
    const rows = [
      mk({ id: "a", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "b", staff_id: "s1", date: "2026-07-13", project_id: "p2" }),
      mk({ id: "c", staff_id: "s2", date: "2026-07-12", project_name: "אתר ידני" }),
    ];
    const m = groupBySchedule(rows);
    expect(m.size).toBe(2);
    expect(m.get("staff:s1")?.size).toBe(2);
    expect(m.get("staff:s1")?.get("2026-07-12")?.projectId).toBe("p1");
    expect(m.get("staff:s2")?.get("2026-07-12")?.projectName).toBe("אתר ידני");
  });

  it("buckets temp rows by temp:<name> alongside staff rows", () => {
    const rows = [
      mk({ id: "a", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "b", staff_id: undefined, temp_name: "אבי הזמני", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "c", staff_id: undefined, temp_name: "אבי הזמני", date: "2026-07-13", project_id: "p2" }),
    ];
    const m = groupBySchedule(rows);
    expect(m.size).toBe(2);
    expect(m.get("staff:s1")?.get("2026-07-12")?.projectId).toBe("p1");
    expect(m.get("temp:אבי הזמני")?.size).toBe(2);
    expect(m.get("temp:אבי הזמני")?.get("2026-07-13")?.projectId).toBe("p2");
  });

  it("propagates assignmentId so the UI can target a row for delete/update", () => {
    const m = groupBySchedule([mk({ id: "row-42", staff_id: "s1", date: "2026-07-12" })]);
    expect(m.get("staff:s1")?.get("2026-07-12")?.assignmentId).toBe("row-42");
  });

  it("a duplicate (worker, date) — last write wins (DB unique prevents this anyway for staff)", () => {
    const m = groupBySchedule([
      mk({ id: "old", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "new", staff_id: "s1", date: "2026-07-12", project_id: "p2" }),
    ]);
    expect(m.get("staff:s1")?.get("2026-07-12")?.projectId).toBe("p2");
    expect(m.get("staff:s1")?.get("2026-07-12")?.assignmentId).toBe("new");
  });

  it("empty input → empty map", () => {
    expect(groupBySchedule([]).size).toBe(0);
  });
});

describe("cellAt — single-cell lookup using a WorkerKey discriminant", () => {
  const grouped = groupBySchedule([
    mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
    mk({ id: "r2", staff_id: undefined, temp_name: "אבי הזמני", date: "2026-07-14", project_name: "אתר X" }),
  ]);

  it("returns the cell for a staff worker", () => {
    expect(cellAt(grouped, STAFF("s1"), "2026-07-12")?.projectId).toBe("p1");
  });

  it("returns the cell for a temp worker", () => {
    expect(cellAt(grouped, TEMP("אבי הזמני"), "2026-07-14")?.projectName).toBe("אתר X");
  });

  it("returns null when the worker has no plan at all", () => {
    expect(cellAt(grouped, STAFF("s-unknown"), "2026-07-12")).toBeNull();
    expect(cellAt(grouped, TEMP("דוד הזמני"), "2026-07-12")).toBeNull();
  });

  it("returns null when the worker exists but has nothing planned that day", () => {
    expect(cellAt(grouped, STAFF("s1"), "2026-07-13")).toBeNull();
  });
});

describe("distinctTempWorkers — registry derived from rows, not a separate table", () => {
  it("returns sorted unique temp names", () => {
    const rows = [
      mk({ staff_id: undefined, temp_name: "ב" }),
      mk({ staff_id: undefined, temp_name: "א" }),
      mk({ staff_id: undefined, temp_name: "א" }),  // dup
      mk({ staff_id: undefined, temp_name: "ג" }),
    ];
    expect(distinctTempWorkers(rows)).toEqual(["א", "ב", "ג"]);
  });

  it("skips real staff rows", () => {
    const rows = [
      mk({ staff_id: "s1" }),
      mk({ staff_id: undefined, temp_name: "אבי" }),
      mk({ staff_id: "s2" }),
    ];
    expect(distinctTempWorkers(rows)).toEqual(["אבי"]);
  });

  it("empty input → empty list", () => {
    expect(distinctTempWorkers([])).toEqual([]);
  });
});

describe("buildAssignmentRow — single-cell payload shape with WorkerKey + ProjectRef", () => {
  it("staff + real project", () => {
    expect(buildAssignmentRow(STAFF("s1"), "2026-07-12", { kind: "real", id: "p1" })).toEqual({
      staff_id: "s1", temp_name: null, date: "2026-07-12", project_id: "p1", project_name: null,
    });
  });

  it("temp + manual project", () => {
    expect(buildAssignmentRow(TEMP("אבי הזמני"), "2026-07-12", { kind: "manual", name: "אתר X" })).toEqual({
      staff_id: null, temp_name: "אבי הזמני", date: "2026-07-12", project_id: null, project_name: "אתר X",
    });
  });

  it("staff + manual is allowed (orthogonal axes)", () => {
    const row = buildAssignmentRow(STAFF("s1"), "2026-07-12", { kind: "manual", name: "אתר X" });
    expect(row.staff_id).toBe("s1");
    expect(row.temp_name).toBeNull();
    expect(row.project_name).toBe("אתר X");
    expect(row.project_id).toBeNull();
  });

  it("temp + real is allowed", () => {
    const row = buildAssignmentRow(TEMP("אבי"), "2026-07-12", { kind: "real", id: "p1" });
    expect(row.staff_id).toBeNull();
    expect(row.temp_name).toBe("אבי");
    expect(row.project_id).toBe("p1");
    expect(row.project_name).toBeNull();
  });

  it("exactly-one invariant on both axes — never both staff_id AND temp_name, never both project_id AND project_name", () => {
    const rows = [
      buildAssignmentRow(STAFF("s1"), "2026-07-12", { kind: "real",   id:   "p1" }),
      buildAssignmentRow(STAFF("s1"), "2026-07-12", { kind: "manual", name: "x"  }),
      buildAssignmentRow(TEMP("a"),   "2026-07-12", { kind: "real",   id:   "p1" }),
      buildAssignmentRow(TEMP("a"),   "2026-07-12", { kind: "manual", name: "x"  }),
    ];
    for (const row of rows) {
      expect((row.staff_id === null) !== (row.temp_name === null)).toBe(true);
      expect((row.project_id === null) !== (row.project_name === null)).toBe(true);
    }
  });
});

describe("applyToAllWeek — generate row payloads for a row-fill (staff or temp)", () => {
  const weekDates = weekRange("2026-07-12");

  it("emits one row per date for a staff worker at a real project", () => {
    const out = applyToAllWeek(STAFF("s1"), { kind: "real", id: "p1" }, weekDates);
    expect(out).toHaveLength(WEEK_DAYS);
    for (const row of out) {
      expect(row.staff_id).toBe("s1");
      expect(row.temp_name).toBeNull();
      expect(row.project_id).toBe("p1");
    }
  });

  it("emits one row per date for a temp worker at a manual project", () => {
    const out = applyToAllWeek(TEMP("אבי הזמני"), { kind: "manual", name: "אתר X" }, weekDates);
    expect(out).toHaveLength(WEEK_DAYS);
    for (const row of out) {
      expect(row.staff_id).toBeNull();
      expect(row.temp_name).toBe("אבי הזמני");
      expect(row.project_name).toBe("אתר X");
    }
  });

  it("passes through an arbitrary date list — not just weekRange output", () => {
    const out = applyToAllWeek(STAFF("s1"), { kind: "real", id: "p1" }, ["2026-07-12", "2026-07-13"]);
    expect(out).toHaveLength(2);
  });

  it("empty dates → empty output", () => {
    expect(applyToAllWeek(STAFF("s1"), { kind: "real", id: "p1" }, [])).toEqual([]);
  });
});

describe("israel-week helpers — cross-check from this module", () => {
  it("getSundayLocal anchors a midweek date to its Sunday", () => {
    const date = new Date(2026, 6, 15, 12, 0); // Wed, local noon
    expect(getSundayLocal(date)).toBe("2026-07-12");
  });

  it("getSundayLocal is idempotent on a Sunday", () => {
    const date = new Date(2026, 6, 12, 12, 0);
    expect(getSundayLocal(date)).toBe("2026-07-12");
  });

  it("addWeeks moves forward/backward by exactly n*7 days", () => {
    expect(addWeeks("2026-07-12", 1)).toBe("2026-07-19");
    expect(addWeeks("2026-07-12", -1)).toBe("2026-07-05");
    expect(addWeeks("2026-07-12", 4)).toBe("2026-08-09");
  });
});
