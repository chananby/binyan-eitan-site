import { describe, it, expect } from "vitest";
import { checkPhoneClockGate, insertPhoneAttendance } from "./twilio";

// Chainable Supabase stub. Every query builder method returns `this`; the
// object is awaitable and resolves to { data, error }. `.insert` is awaitable
// too so the insert path (and the fail-open failure-log) can run.
function stub(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertError?: unknown;
}) {
  const inserted: unknown[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "select", "is", "eq", "in", "gte", "order"]) {
    chain[m] = () => chain;
  }
  chain.then = (resolve: (v: unknown) => void) =>
    resolve(opts.selectResult ?? { data: [], error: null });
  chain.insert = (row: unknown) => {
    inserted.push(row);
    return Promise.resolve({ error: opts.insertError ?? null });
  };
  return { supabase: chain, inserted };
}

const IN = (clock_at: string) => ({ action: "in", clock_at });
const OUT = (clock_at: string) => ({ action: "out", clock_at });

// The gate day-scopes by the REAL "today" (israelTodayYMD), so an "open shift"
// fixture must be timestamped today — a hard-coded date silently falls out of
// the window as the clock advances. "now" is always inside the current day.
const OPEN_TODAY = new Date().toISOString();

describe("checkPhoneClockGate — verbatim gate, structured result", () => {
  it("passes when no open record (IN with no rows today)", async () => {
    const { supabase } = stub({ selectResult: { data: [], error: null } });
    const g = await checkPhoneClockGate({ supabase, staffId: "s1", action: "in" });
    expect(g.kind).toBe("pass");
  });

  it("blocks a second IN when a clock-in is already open", async () => {
    const { supabase } = stub({ selectResult: { data: [IN(OPEN_TODAY)], error: null } });
    const g = await checkPhoneClockGate({ supabase, staffId: "s1", action: "in" });
    expect(g.kind).toBe("block");
  });

  it("blocks an OUT when there is no open entry (orphan exit)", async () => {
    const { supabase } = stub({ selectResult: { data: [], error: null } });
    const g = await checkPhoneClockGate({ supabase, staffId: "s1", action: "out" });
    expect(g.kind).toBe("block");
  });

  it("allows an OUT when a shift is open (last event is an entry)", async () => {
    const { supabase } = stub({ selectResult: { data: [IN(OPEN_TODAY)], error: null } });
    const g = await checkPhoneClockGate({ supabase, staffId: "s1", action: "out" });
    expect(g.kind).toBe("pass");
  });

  it("recognises the Hebrew vocabulary too (כניסה blocks a second IN)", async () => {
    const { supabase } = stub({ selectResult: { data: [{ action: "כניסה", clock_at: OPEN_TODAY }], error: null } });
    const g = await checkPhoneClockGate({ supabase, staffId: "s1", action: "in" });
    expect(g.kind).toBe("block");
  });

  it("returns query_error (not a throw) when the SELECT fails", async () => {
    const { supabase } = stub({ selectResult: { data: null, error: { message: "db down" } } });
    const g = await checkPhoneClockGate({ supabase, staffId: "s1", action: "in" });
    expect(g.kind).toBe("query_error");
  });
});

describe("insertPhoneAttendance — outcome + fail-open", () => {
  const project = { id: "p1", name: "אתר א" };

  it("inserts when the gate passes", async () => {
    const { supabase, inserted } = stub({ selectResult: { data: [], error: null } });
    const out = await insertPhoneAttendance({ supabase, staffId: "s1", action: "in", project });
    expect(out.status).toBe("inserted");
    // one row into `attendance`
    expect(inserted.some((r) => (r as { source?: string }).source === "phone-call")).toBe(true);
  });

  it("blocks (no insert) when the gate blocks", async () => {
    const { supabase, inserted } = stub({ selectResult: { data: [IN(OPEN_TODAY)], error: null } });
    const out = await insertPhoneAttendance({ supabase, staffId: "s1", action: "in", project });
    expect(out.status).toBe("blocked");
    expect(inserted.some((r) => (r as { source?: string }).source === "phone-call")).toBe(false);
  });

  it("FAILS OPEN: gate query error → logs + inserts anyway", async () => {
    const { supabase, inserted } = stub({ selectResult: { data: null, error: { message: "db down" } } });
    const out = await insertPhoneAttendance({ supabase, staffId: "s1", action: "in", project });
    expect(out.status).toBe("inserted");
    // both the failure-log row and the attendance row were written
    expect(inserted.some((r) => (r as { error_code?: string }).error_code === "phone_gate_query_failed")).toBe(true);
    expect(inserted.some((r) => (r as { source?: string }).source === "phone-call")).toBe(true);
  });
});
