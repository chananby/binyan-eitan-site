import { describe, it, expect } from "vitest";
import {
  aggregateWorkerHistory,
  type WorkerHistoryRecord,
} from "./worker-history-aggregate";

// Attendance row shorthand. Israel summer wall-clock via explicit +03:00,
// matching what production clock_at strings look like for June/July rows.
function rec(
  id: string,
  ymd: string,
  hhmm: string,
  action: "in" | "out" | "כניסה" | "יציאה",
): WorkerHistoryRecord {
  const at = `${ymd}T${hhmm}:00+03:00`;
  return { id, staff_id: "s1", action, clock_at: at, created_at: at, project: null };
}

describe("aggregateWorkerHistory — orphan exit vs orphan entry", () => {
  // The bug this fixes: a past day with an OUT but no IN used to fall through
  // to "no-exit", which offered a "השלם יציאה" button that always 409'd.
  it("marks a past day with an exit but no entry as 'no-entry'", () => {
    const days = aggregateWorkerHistory(
      [rec("x1", "2026-06-28", "15:08", "יציאה")],
      [],
      "2026-06-28",
      "2026-06-28",
    );
    expect(days).toHaveLength(1);
    expect(days[0].status).toBe("no-entry");
    expect(days[0].startTime).toBeNull();
    expect(days[0].endTime).toBe("15:08");
    expect(days[0].hours).toBeNull();
    // exitId is surfaced (so the row can be deleted), entryId is not.
    expect(days[0].exitId).toBe("x1");
    expect(days[0].entryId).toBeUndefined();
  });

  // Regression guard: the mirror case must STAY "no-exit".
  it("keeps a past day with an entry but no exit as 'no-exit'", () => {
    const days = aggregateWorkerHistory(
      [rec("e1", "2026-06-28", "07:02", "כניסה")],
      [],
      "2026-06-28",
      "2026-06-28",
    );
    expect(days).toHaveLength(1);
    expect(days[0].status).toBe("no-exit");
    expect(days[0].startTime).toBe("07:02");
    expect(days[0].endTime).toBeNull();
    expect(days[0].entryId).toBe("e1");
  });

  it("marks a complete entry+exit day as 'present'", () => {
    const days = aggregateWorkerHistory(
      [rec("e2", "2026-06-28", "07:00", "כניסה"), rec("x2", "2026-06-28", "16:00", "יציאה")],
      [],
      "2026-06-28",
      "2026-06-28",
    );
    expect(days).toHaveLength(1);
    expect(days[0].status).toBe("present");
    expect(days[0].hours).toBe(9);
  });

  // English action vocabulary must be treated identically (Twilio writes "out").
  it("recognises the English 'out' vocabulary as an orphan exit too", () => {
    const days = aggregateWorkerHistory(
      [rec("x3", "2026-06-28", "15:08", "out")],
      [],
      "2026-06-28",
      "2026-06-28",
    );
    expect(days[0].status).toBe("no-entry");
  });
});
