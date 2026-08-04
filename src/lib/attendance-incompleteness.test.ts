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

  it("stuck_failure — a worker_stuck row (no error_code → add_day fallback)", () => {
    const failures: EngineFailureRow[] = [{
      id: "f1", staff_id: "s1", staff_name: "name-s1",
      attempted_at: "2026-07-11T09:00:00+03:00", project_id: "p1", project_name: "Proj 1",
    }];
    const items = run({ failures });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "stuck_failure", action: "add_day", ref_id: "f1", date: "2026-07-11" });
  });

  it("stuck_failure — action is chosen by error_code, not always add_day", () => {
    const mk = (code: string): EngineFailureRow => ({
      id: "f-" + code, staff_id: "s1", staff_name: "name-s1",
      attempted_at: "2026-07-11T09:00:00+03:00", project_id: "p1", project_name: "Proj 1",
      error_code: code,
    });
    // no_open_entry_to_close is context-derived: a lone exit on the day → check/
    // complete the missing ENTRY. (Empty day → add_day; full pair → filtered —
    // both covered in the dedicated describe block below.)
    const looseExit = run({
      attendance: [att("x-nooe", "s1", "2026-07-11", "16:00", "out")],
      failures: [mk("no_open_entry_to_close")],
    });
    expect(looseExit.find((i) => i.issue === "stuck_failure")).toMatchObject({
      action: "complete_entry", error_code: "no_open_entry_to_close",
    });
    // remote-exit cap → the open entry just needs its exit completed
    expect(run({ failures: [mk("monthly_remote_exit_cap_reached")] })[0]).toMatchObject({
      action: "complete_exit",
    });
    // off-site clock-in was rejected → worker was there, no row exists → add_day
    expect(run({ failures: [mk("gps_out_of_range")] })[0]).toMatchObject({ action: "add_day" });
    // unknown code → safe add_day fallback, code still carried for the UI
    expect(run({ failures: [mk("something_new")] })[0]).toMatchObject({
      action: "add_day", error_code: "something_new",
    });
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

describe("stuck_failure — double-tap OUT is noise, real orphan is kept", () => {
  // Failures are built with raw ISO so we get second precision the att()
  // helper (minute + ":00") can't express. All on TODAY so the no_exit /
  // no_entry loop (past-days only) never adds incidental items — leaving
  // stuck_failure as the sole thing under test.
  const failAt = (id: string, hhmmss: string, code = "no_open_entry_to_close"): EngineFailureRow => ({
    id, staff_id: "s1", staff_name: "name-s1",
    attempted_at: `${TODAY}T${hhmmss}+03:00`, project_id: "p1", project_name: "Proj 1", error_code: code,
  });

  it("drops a no_open_entry_to_close logged seconds after the worker's own exit", () => {
    // Yitzhak Sayeg pattern: a successful exit, then two blocked OUT taps.
    const items = run({
      attendance: [
        att("in1", "s1", TODAY, "07:53", "in"),
        att("out1", "s1", TODAY, "13:04", "out"), // 13:04:00
      ],
      failures: [
        failAt("f-a", "13:04:57"), // +57s
        failAt("f-b", "13:05:11"), // +71s
      ],
    });
    // both taps are noise → no stuck_failure item survives.
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(false);
  });

  it("keeps a genuine orphan OUT — a block with NO preceding exit", () => {
    const items = run({ failures: [failAt("f-c", "09:00:00")] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ issue: "stuck_failure", error_code: "no_open_entry_to_close" });
  });

  it("keeps the failure when the exit is OUTSIDE the 5-min window", () => {
    const items = run({
      attendance: [att("out2", "s1", TODAY, "13:00", "out")], // 13:00:00
      failures: [failAt("f-d", "13:10:00")], // 10 min later
    });
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(true);
  });

  it("does NOT treat a manual/admin exit as the double-tap trigger", () => {
    const items = run({
      attendance: [att("out3", "s1", TODAY, "13:04", "out", { is_manual: true })],
      failures: [failAt("f-e", "13:04:57")],
    });
    // manual backfill ≠ a live double-tap → the failure is still surfaced.
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(true);
  });

  it("only the no_open_entry_to_close code is double-tap filtered", () => {
    // a nearby exit must NOT silence an unrelated code (e.g. server_error).
    const items = run({
      attendance: [att("out4", "s1", TODAY, "13:04", "out")],
      failures: [failAt("f-f", "13:04:57", "server_error")],
    });
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(true);
  });
});

describe("stuck_failure — a resolved no_open_entry_to_close (day completed) is dropped", () => {
  const DAY = "2026-07-10"; // past day, before TODAY
  const stuckFail = (id: string, code = "no_open_entry_to_close"): EngineFailureRow => ({
    id, staff_id: "s1", staff_name: "name-s1",
    attempted_at: `${DAY}T12:00:00+03:00`, project_id: "p1", project_name: "Proj 1", error_code: code,
  });

  it("drops the failure when the day now has a complete entry+exit pair (Sayeg/Osnaka)", () => {
    // The day was fixed manually (entry 08:00 + exit 18:45 added after the fail).
    const items = run({
      attendance: [
        att("in1",  "s1", DAY, "08:00", "כניסה", { is_manual: true }),
        att("out1", "s1", DAY, "18:45", "יציאה", { is_manual: true }),
      ],
      failures: [stuckFail("f1")],
    });
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(false);
    // the complete day is not re-flagged as no_exit / no_entry either
    expect(items.some((i) => i.issue === "no_exit" || i.issue === "no_entry")).toBe(false);
  });

  it("empty day (nothing recorded — the OUT was blocked) → kept with action add_day", () => {
    // Nadika 26.07 pattern: history shows no activity at all → nothing to
    // "complete", the whole shift is missing.
    const items = run({ failures: [stuckFail("f2-empty")] });
    const item = items.find((i) => i.issue === "stuck_failure");
    expect(item).toMatchObject({ issue: "stuck_failure", action: "add_day" });
  });

  it("lone exit, no entry → kept with action complete_entry", () => {
    const items = run({
      attendance: [att("out2", "s1", DAY, "16:00", "יציאה")], // exit only → the ENTRY is missing
      failures: [stuckFail("f2-exit")],
    });
    expect(items.find((i) => i.issue === "stuck_failure")).toMatchObject({ action: "complete_entry" });
  });

  it("drops the failure on a still-pending completion, but it re-surfaces as pending_manual", () => {
    const items = run({
      attendance: [
        att("pin",  "s1", DAY, "08:00", "כניסה", { is_manual: true, status: "pending" }),
        att("pout", "s1", DAY, "18:45", "יציאה", { is_manual: true, status: "pending" }),
      ],
      failures: [stuckFail("f3")],
    });
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(false);   // resolved (pair present)
    expect(items.some((i) => i.issue === "pending_manual")).toBe(true);   // not lost silently
  });

  it("does NOT drop a resolved-looking day for OTHER error codes (scoped)", () => {
    // A complete day must NOT silence e.g. gps_out_of_range (its remedy is add_day).
    const items = run({
      attendance: [
        att("gin",  "s1", DAY, "08:00", "כניסה"),
        att("gout", "s1", DAY, "18:45", "יציאה"),
      ],
      failures: [stuckFail("f4", "gps_out_of_range")],
    });
    expect(items.some((i) => i.issue === "stuck_failure")).toBe(true);
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
