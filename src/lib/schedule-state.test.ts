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
  projectKeyString,
  projectKeyFromRow,
  groupByProjectDate,
  cellWorkers,
  isUnassignedWorkday,
  buildCopyTargetRows,
  scheduleForDate,
  unassignedWorkersForDay,
  type ScheduleAssignment,
  type WorkerKey,
  type ProjectRef,
  type CopyableScheduleRow,
} from "./schedule-state";
import { getSundayLocal, addWeeks, WEEK_DAYS, todayLocal } from "./israel-week";

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

describe("projectKeyString — Map-friendly scalar encoding for project targets", () => {
  it("encodes real and manual with distinct prefixes", () => {
    expect(projectKeyString({ kind: "real",   id:   "abc" })).toBe("project:abc");
    expect(projectKeyString({ kind: "manual", name: "abc" })).toBe("manual:abc");
  });

  it("a real project whose id equals a manual project's name doesn't collide", () => {
    expect(projectKeyString({ kind: "real",   id:   "אתר א" }))
      .not.toBe(projectKeyString({ kind: "manual", name: "אתר א" }));
  });
});

describe("projectKeyFromRow — pick the right side", () => {
  const REAL   = (id: string) => mk({ project_id: id });
  const MANUAL = (n: string)  => mk({ project_name: n });

  it("real row → project:<id>", () => {
    expect(projectKeyFromRow(REAL("p1"))).toBe("project:p1");
  });

  it("manual row → manual:<name>", () => {
    expect(projectKeyFromRow(MANUAL("אתר X"))).toBe("manual:אתר X");
  });

  it("no project side at all → null (defensive — shouldn't reach here)", () => {
    const row = mk({});
    row.project_id = null;
    row.project_name = null;
    expect(projectKeyFromRow(row)).toBeNull();
  });
});

describe("groupByProjectDate — inverse view (project → date → workers[])", () => {
  const STAFF = (id: string): WorkerKey => ({ kind: "staff", id });
  const TEMP  = (name: string): WorkerKey => ({ kind: "temp",  name });

  it("groups multiple workers under the same project & date", () => {
    const rows = [
      mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "r2", staff_id: "s2", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "r3", staff_id: "s3", date: "2026-07-12", project_id: "p2" }),
    ];
    const m = groupByProjectDate(rows);
    expect(m.size).toBe(2);
    const p1Day = m.get("project:p1")?.get("2026-07-12") ?? [];
    expect(p1Day).toHaveLength(2);
    expect(p1Day.map(workerKeyString).sort()).toEqual([
      workerKeyString(STAFF("s1")),
      workerKeyString(STAFF("s2")),
    ].sort());
  });

  it("includes temp workers on the same shape as registered staff", () => {
    const rows = [
      mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "r2", staff_id: undefined, temp_name: "אבי הזמני", date: "2026-07-12", project_id: "p1" }),
    ];
    const day = groupByProjectDate(rows).get("project:p1")?.get("2026-07-12") ?? [];
    expect(day).toHaveLength(2);
    const kinds = day.map((k) => k.kind).sort();
    expect(kinds).toEqual(["staff", "temp"]);
  });

  it("buckets manual-project assignments under manual:<name>", () => {
    const rows = [
      mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_name: "אתר ידני" }),
      mk({ id: "r2", staff_id: "s2", date: "2026-07-12", project_name: "אתר ידני" }),
    ];
    const day = groupByProjectDate(rows).get("manual:אתר ידני")?.get("2026-07-12") ?? [];
    expect(day).toHaveLength(2);
  });

  it("multiple dates per project — separate inner-map entries", () => {
    const rows = [
      mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
      mk({ id: "r2", staff_id: "s1", date: "2026-07-13", project_id: "p1" }),
    ];
    const byDate = groupByProjectDate(rows).get("project:p1");
    expect(byDate?.size).toBe(2);
    expect(byDate?.get("2026-07-12")?.[0]).toEqual(STAFF("s1"));
    expect(byDate?.get("2026-07-13")?.[0]).toEqual(STAFF("s1"));
  });

  it("a row with no project (defensive) is skipped, not blown up", () => {
    const bad = mk({ id: "bad", staff_id: "s1", date: "2026-07-12" });
    bad.project_id = null;
    bad.project_name = null;
    const good = mk({ id: "ok", staff_id: "s1", date: "2026-07-12", project_id: "p1" });
    const m = groupByProjectDate([bad, good]);
    expect(m.size).toBe(1);
    expect(m.get("project:p1")?.get("2026-07-12")).toHaveLength(1);
  });

  it("empty rows → empty map", () => {
    expect(groupByProjectDate([]).size).toBe(0);
    void TEMP; // touch the unused factory so the lint stays clean if expanded later
  });
});

describe("cellWorkers — list of workers planned at (project, date)", () => {
  const grouped = groupByProjectDate([
    mk({ id: "r1", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
    mk({ id: "r2", staff_id: undefined, temp_name: "אבי", date: "2026-07-12", project_id: "p1" }),
    mk({ id: "r3", staff_id: "s2", date: "2026-07-13", project_name: "אתר X" }),
  ]);
  const REAL   = (id: string): ProjectRef => ({ kind: "real",   id });
  const MANUAL = (n: string):  ProjectRef => ({ kind: "manual", name: n });

  it("real project, populated cell → all workers", () => {
    const ws = cellWorkers(grouped, REAL("p1"), "2026-07-12");
    expect(ws).toHaveLength(2);
  });

  it("manual project, populated cell", () => {
    const ws = cellWorkers(grouped, MANUAL("אתר X"), "2026-07-13");
    expect(ws).toHaveLength(1);
    expect(ws[0]).toEqual({ kind: "staff", id: "s2" });
  });

  it("real project, empty cell → empty array (not null)", () => {
    expect(cellWorkers(grouped, REAL("p1"), "2026-07-14")).toEqual([]);
  });

  it("unknown project → empty array", () => {
    expect(cellWorkers(grouped, REAL("p-unknown"), "2026-07-12")).toEqual([]);
    expect(cellWorkers(grouped, MANUAL("אתר Z"), "2026-07-12")).toEqual([]);
  });
});

describe("isUnassignedWorkday — gap-detection for the by-worker view", () => {
  const DATE = "2026-07-12";

  it("regular worker, no vacation, no assignment → true (the actual gap)", () => {
    const grouped = groupBySchedule([]);
    expect(
      isUnassignedWorkday({ id: "s1", role: "עובד" }, DATE, grouped, new Set()),
    ).toBe(true);
  });

  it("foreman with the exact same empty schedule → false (managers don't need a site)", () => {
    const grouped = groupBySchedule([]);
    expect(
      isUnassignedWorkday({ id: "s2", role: "ממונה" }, DATE, grouped, new Set()),
    ).toBe(false);
  });

  it("regular worker on vacation that day → false (legitimate absence, not a gap)", () => {
    const grouped = groupBySchedule([]);
    const vac    = new Set(["s1|" + DATE]);
    expect(
      isUnassignedWorkday({ id: "s1", role: "עובד" }, DATE, grouped, vac),
    ).toBe(false);
  });

  it("regular worker WITH a schedule row that day → false (already assigned)", () => {
    const grouped = groupBySchedule([
      mk({ staff_id: "s1", date: DATE, project_id: "p1" }),
    ]);
    expect(
      isUnassignedWorkday({ id: "s1", role: "עובד" }, DATE, grouped, new Set()),
    ).toBe(false);
  });

  it("temp worker (no role) → false (temps have no expectation of being placed)", () => {
    const grouped = groupBySchedule([]);
    // Mimic the shape distinctTempWorkers feeds the table — id is a
    // synthetic name, role is undefined.
    expect(
      isUnassignedWorkday({ id: "פועל יומי", role: null }, DATE, grouped, new Set()),
    ).toBe(false);
    expect(
      isUnassignedWorkday({ id: "פועל יומי" /* role omitted */ }, DATE, grouped, new Set()),
    ).toBe(false);
  });
});

describe("buildCopyTargetRows — week-to-week copy logic", () => {
  const SOURCE = ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02"];
  const TARGET = ["2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09"];

  const src = (a: Partial<CopyableScheduleRow>): CopyableScheduleRow => ({
    staff_id:     a.staff_id     ?? null,
    temp_name:    a.temp_name    ?? null,
    date:         a.date         ?? SOURCE[0],
    project_id:   a.project_id   ?? null,
    project_name: a.project_name ?? null,
    status:       a.status       ?? null,
    note:         a.note         ?? null,
  });

  it("maps each source date to the same index in target dates (+7 by convention)", () => {
    const rows = [
      src({ staff_id: "s1", date: SOURCE[0], project_id: "p1" }),
      src({ staff_id: "s1", date: SOURCE[3], project_id: "p2" }),
    ];
    const { inserts, skippedVacation } = buildCopyTargetRows(rows, new Set(), SOURCE, TARGET);
    expect(skippedVacation).toEqual([]);
    expect(inserts).toHaveLength(2);
    expect(inserts[0].date).toBe(TARGET[0]);  // Sun → Sun
    expect(inserts[1].date).toBe(TARGET[3]);  // Wed → Wed
  });

  it("skips a staff row when (staff_id, target_date) lands on a vacation day", () => {
    const rows = [
      src({ staff_id: "s1", date: SOURCE[0], project_id: "p1" }),
      src({ staff_id: "s1", date: SOURCE[1], project_id: "p1" }),  // target Mon — vacation
    ];
    const vac = new Set(["s1|" + TARGET[1]]);
    const { inserts, skippedVacation } = buildCopyTargetRows(rows, vac, SOURCE, TARGET);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].date).toBe(TARGET[0]);
    expect(skippedVacation).toEqual([{ staff_id: "s1", date: TARGET[1] }]);
  });

  it("temp rows (staff_id null) are always copied — vacations don't apply to them", () => {
    const rows = [
      src({ temp_name: "פועל יומי", date: SOURCE[0], project_name: "אתר ידני" }),
    ];
    // Even if a "matching" vacation key existed under a fake id, temps
    // wouldn't be filtered — they're keyed off staff_id which is null.
    const vac = new Set(["|" + TARGET[0]]);
    const { inserts, skippedVacation } = buildCopyTargetRows(rows, vac, SOURCE, TARGET);
    expect(skippedVacation).toEqual([]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].temp_name).toBe("פועל יומי");
    expect(inserts[0].project_name).toBe("אתר ידני");
    expect(inserts[0].staff_id).toBeNull();
  });

  it("preserves status + note verbatim on the target row", () => {
    const rows = [
      src({
        staff_id: "s1", date: SOURCE[0], project_id: "p1",
        status: "off", note: "מילואים שמרנו ידנית",
      }),
    ];
    const { inserts } = buildCopyTargetRows(rows, new Set(), SOURCE, TARGET);
    expect(inserts[0].status).toBe("off");
    expect(inserts[0].note).toBe("מילואים שמרנו ידנית");
    // Audit columns are NOT set by the helper — the route stamps them.
    expect(Object.hasOwn(inserts[0], "id")).toBe(false);
    expect(Object.hasOwn(inserts[0], "created_by")).toBe(false);
    expect(Object.hasOwn(inserts[0], "updated_at")).toBe(false);
  });
});

describe("scheduleForDate — single-day projection from a wider payload", () => {
  const rows = [
    mk({ id: "a", staff_id: "s1", date: "2026-07-12", project_id: "p1" }),
    mk({ id: "b", staff_id: "s1", date: "2026-07-13", project_id: "p2" }),
    mk({ id: "c", staff_id: "s2", date: "2026-07-12", project_id: "p1" }),
  ];

  it("returns only rows whose date matches", () => {
    const out = scheduleForDate(rows, "2026-07-12");
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id).sort()).toEqual(["a", "c"]);
  });

  it("returns an empty array when no rows match (not undefined/null)", () => {
    expect(scheduleForDate(rows, "2026-07-14")).toEqual([]);
  });

  it("does not mutate input", () => {
    const snapshot = [...rows];
    scheduleForDate(rows, "2026-07-12");
    expect(rows).toEqual(snapshot);
  });
});

describe("unassignedWorkersForDay — the live board's pool for a given date", () => {
  const DATE = "2026-07-12";

  const WORKERS = [
    { id: "s1", role: "עובד"  },
    { id: "s2", role: "ממונה" },
    { id: "s3", role: "עובד"  },
    { id: "s4", role: "עובד"  },
    { id: "s5", role: null    },           // shouldn't be in the payload but be defensive
  ] as const;

  it("returns 'עובד' + 'ממונה' rows that have no schedule + no vacation that day", () => {
    const schedule = [mk({ staff_id: "s3", date: DATE, project_id: "p1" })];
    const out = unassignedWorkersForDay(WORKERS, schedule, new Set(), DATE);
    // s3 is placed → out. s5 has no role → out. s1, s2, s4 remain.
    expect(out.map((w) => w.id)).toEqual(["s1", "s2", "s4"]);
  });

  it("filters out workers on vacation that day, even if otherwise unplaced", () => {
    const vac = new Set(["s2|" + DATE]);
    const out = unassignedWorkersForDay(WORKERS, [], vac, DATE);
    expect(out.map((w) => w.id)).toEqual(["s1", "s3", "s4"]);
  });

  it("vacation on a different day doesn't filter", () => {
    const vac = new Set(["s1|2026-07-13"]);
    const out = unassignedWorkersForDay(WORKERS, [], vac, DATE);
    expect(out.map((w) => w.id)).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("preserves input order so the caller's sort wins", () => {
    const out = unassignedWorkersForDay(WORKERS, [], new Set(), DATE);
    expect(out.map((w) => w.id)).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("ignores schedule rows for other dates when computing the placed set", () => {
    const schedule = [mk({ staff_id: "s1", date: "2026-07-13", project_id: "p1" })];
    const out = unassignedWorkersForDay(WORKERS, schedule, new Set(), DATE);
    // s1 is "placed" but on a different day — still in the pool today.
    expect(out.map((w) => w.id)).toContain("s1");
  });

  it("temp rows (staff_id null) don't accidentally mark anyone as placed", () => {
    const schedule = [
      mk({ staff_id: undefined, temp_name: "פועל יומי", date: DATE, project_id: "p1" }),
    ];
    const out = unassignedWorkersForDay(WORKERS, schedule, new Set(), DATE);
    expect(out.map((w) => w.id)).toEqual(["s1", "s2", "s3", "s4"]);
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

  it("todayLocal returns YYYY-MM-DD shape", () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("todayLocal returns Asia/Jerusalem's date, not UTC's, when they differ", () => {
    // 2026-07-15 00:30 IDT = 2026-07-14 21:30 UTC — without TZ pinning
    // the result would silently be "2026-07-14", which is the whole
    // class of bug this helper exists to prevent.
    const originalDate = global.Date;
    class StubDate extends Date {
      constructor() { super("2026-07-15T00:30:00+03:00"); }
    }
    // @ts-expect-error — test-only override of the global Date.
    global.Date = StubDate;
    try {
      expect(todayLocal()).toBe("2026-07-15");
    } finally {
      global.Date = originalDate;
    }
  });
});
