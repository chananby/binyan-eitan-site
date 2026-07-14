import { describe, it, expect } from "vitest";
import {
  computeIncompleteDays,
  summarizeIncomplete,
  type EngineAttendanceRow,
  type EngineFailureRow,
  type EngineCorrectionRow,
} from "./attendance-incompleteness";

const TODAY = "2026-07-14";

// Attendance row shorthand (Israel summer wall clock via +03:00).
function att(
  id: string,
  staff: string,
  ymd: string,
  hhmm: string,
  action: "in" | "out" | "כניסה" | "יציאה",
  extra: Partial<EngineAttendanceRow> = {},
): EngineAttendanceRow {
  const at = `${ymd}T${hhmm}:00+03:00`;
  return {
    id, staff_id: staff, staff_name: `name-${staff}`,
    action, clock_at: at, created_at: at,
    status: "approved", is_manual: false,
    project_id: "p1", project_name: "Proj 1",
    ...extra,
  };
}

function run(input: Partial<Parameters<typeof computeIncompleteDays>[0]>) {
  return computeIncompleteDays(
    { attendance: input.attendance ?? [], failures: input.failures ?? [], pendingCorrections: input.pendingCorrections ?? [] },
    { todayYmd: TODAY },
  );
}

describe("computeIncompleteDays — six issue types", () => {
  it("no_exit — past day with an entry and no exit", () => {
    const items = run({ attendance: [att("e1", "s1", "2026-07-10", "07:00", "כניסה")] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "no_exit", action: "complete_exit", ref_id: "e1", date: "2026-07-10" });
  });

  it("no_entry — past day with an exit and no entry", () => {
    const items = run({ attendance: [att("x1", "s1", "2026-07-10", "16:00", "יציאה")] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "no_entry", action: "complete_entry", ref_id: "x1" });
  });

  it("no_project — an entry with no project_id (incl. today)", () => {
    const items = run({ attendance: [att("e2", "s1", TODAY, "07:00", "כניסה", { project_id: null, project_name: null })] });
    // today + open entry → NOT no_exit, but the null project IS flagged.
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "no_project", action: "assign_project", ref_id: "e2", project_id: null });
  });

  it("stuck_failure — a worker_stuck row", () => {
    const failures: EngineFailureRow[] = [{
      id: "f1", staff_id: "s1", staff_name: "name-s1",
      attempted_at: "2026-07-11T09:00:00+03:00", project_id: "p1", project_name: "Proj 1",
    }];
    const items = run({ failures });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "stuck_failure", action: "add_day", ref_id: "f1", date: "2026-07-11" });
  });

  it("pending_correction — a pending request", () => {
    const pendingCorrections: EngineCorrectionRow[] = [{
      id: "c1", staff_id: "s1", staff_name: "name-s1",
      clock_at: "2026-07-09T07:00:00+03:00", created_at: "2026-07-09T07:00:00+03:00",
      project_id: "p1", project_name: "Proj 1",
    }];
    const items = run({ pendingCorrections });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "pending_correction", action: "review_correction", ref_id: "c1", date: "2026-07-09" });
  });

  it("pending_manual — an unapproved manual row", () => {
    const items = run({
      attendance: [
        // full day so no no_exit fires; both rows pending+manual.
        att("m1", "s1", "2026-07-08", "07:00", "כניסה", { status: "pending", is_manual: true }),
        att("m2", "s1", "2026-07-08", "16:00", "יציאה", { status: "pending", is_manual: true }),
      ],
    });
    const pm = items.filter((i) => i.issue === "pending_manual");
    expect(pm).toHaveLength(2);
    expect(pm[0].action).toBe("review_manual");
    // A complete day → no no_exit/no_entry.
    expect(items.some((i) => i.issue === "no_exit" || i.issue === "no_entry")).toBe(false);
  });
});

describe("computeIncompleteDays — edge cases", () => {
  it("does NOT flag today's open entry as no_exit (in-progress)", () => {
    const items = run({ attendance: [att("e3", "s1", TODAY, "07:00", "כניסה")] });
    expect(items.some((i) => i.issue === "no_exit")).toBe(false);
    expect(items).toHaveLength(0);
  });

  it("recognises both action vocabularies (English + Hebrew)", () => {
    const en = run({ attendance: [att("e4", "s1", "2026-07-10", "07:00", "in")] });
    const he = run({ attendance: [att("e5", "s2", "2026-07-10", "07:00", "כניסה")] });
    expect(en[0].issue).toBe("no_exit");
    expect(he[0].issue).toBe("no_exit");
    // English exit vocabulary pairs correctly → complete day, no issue.
    const paired = run({ attendance: [att("e6", "s3", "2026-07-10", "07:00", "in"), att("x6", "s3", "2026-07-10", "16:00", "out")] });
    expect(paired).toHaveLength(0);
  });

  it("a single day can carry MULTIPLE issues (overlap, not double-count)", () => {
    // Same staff+day: an entry with no project AND no exit → 2 items, 1 day.
    const items = run({
      attendance: [att("e7", "s1", "2026-07-10", "07:00", "כניסה", { project_id: null, project_name: null })],
    });
    const issues = items.map((i) => i.issue).sort();
    expect(issues).toEqual(["no_exit", "no_project"]);
    expect(summarizeIncomplete(items).day_count).toBe(1); // de-duped by (staff, date)
  });
});

describe("summarizeIncomplete", () => {
  it("counts per issue and de-dups day_count on (staff, date)", () => {
    const items = run({
      attendance: [
        att("e8", "s1", "2026-07-10", "07:00", "כניסה", { project_id: null, project_name: null }), // no_exit + no_project (s1|07-10)
        att("x9", "s2", "2026-07-11", "16:00", "יציאה"), // no_entry (s2|07-11)
      ],
      failures: [{ id: "f2", staff_id: "s1", staff_name: "name-s1", attempted_at: "2026-07-10T09:00:00+03:00", project_id: "p1", project_name: "Proj 1" }], // stuck (s1|07-10, same day as e8)
    });
    const s = summarizeIncomplete(items);
    expect(s.by_issue).toMatchObject({ no_exit: 1, no_entry: 1, no_project: 1, stuck_failure: 1 });
    // Days: s1|07-10 (3 issues) + s2|07-11 (1 issue) = 2 distinct days.
    expect(s.day_count).toBe(2);
  });
});
