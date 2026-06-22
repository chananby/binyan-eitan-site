import { describe, it, expect } from "vitest";
import {
  workerLabel,
  projectLabel,
  projectKey,
  groupByProject,
  unassignedWorkers,
  type BoardAssignment,
  type WorkerRef,
  type ProjectRef,
} from "./board-state";

// Factory: build a minimal assignment with sensible defaults so each
// test only specifies the fields it cares about.
const mk = (a: Partial<BoardAssignment>): BoardAssignment => ({
  id: a.id ?? "a-" + Math.random().toString(36).slice(2, 7),
  worker_id: a.worker_id ?? null,
  worker_name: a.worker_name ?? null,
  project_id: a.project_id ?? null,
  project_name: a.project_name ?? null,
  updated_at: a.updated_at,
});

const W = (id: string, name: string): WorkerRef => ({ id, name });
const P = (id: string, name: string): ProjectRef => ({ id, name });

describe("workerLabel", () => {
  const workers = new Map([
    ["w1", W("w1", "מאיר")],
    ["w2", W("w2", "אבי")],
  ]);

  it("returns the FK worker's name when worker_id resolves", () => {
    expect(workerLabel(mk({ worker_id: "w1" }), workers)).toBe("מאיר");
  });

  it("falls back to worker_name (manual row) when worker_id is null", () => {
    expect(workerLabel(mk({ worker_name: "פועל יומי" }), workers)).toBe("פועל יומי");
  });

  it("falls back to worker_name if worker_id doesn't resolve (stale FK)", () => {
    expect(workerLabel(mk({ worker_id: "w-gone", worker_name: "fallback" }), workers))
      .toBe("fallback");
  });

  it("renders '—' for a fully-empty side (defensive — DB CHECK should prevent this)", () => {
    expect(workerLabel(mk({}))).toBe("—");
  });

  it("works without a workers map (returns manual name or '—')", () => {
    expect(workerLabel(mk({ worker_name: "ידני" }))).toBe("ידני");
    expect(workerLabel(mk({ worker_id: "w1" }))).toBe("—");
  });
});

describe("projectLabel — mirrors workerLabel semantics on the project side", () => {
  const projects = new Map([
    ["p1", P("p1", "טשרניחובסקי 72")],
  ]);

  it("FK first", () => {
    expect(projectLabel(mk({ project_id: "p1" }), projects)).toBe("טשרניחובסקי 72");
  });

  it("manual name when no FK", () => {
    expect(projectLabel(mk({ project_name: "אתר זמני" }), projects)).toBe("אתר זמני");
  });

  it("'—' on a fully-empty side", () => {
    expect(projectLabel(mk({}))).toBe("—");
  });
});

describe("projectKey — column identity for grouping", () => {
  it("keys real projects on their FK id", () => {
    expect(projectKey(mk({ project_id: "p1" }))).toBe("p1");
  });

  it("keys manual projects on 'manual:<name>' so two rows with the same name share a column", () => {
    expect(projectKey(mk({ project_name: "אתר א" }))).toBe("manual:אתר א");
  });

  it("distinct manual names → distinct columns", () => {
    expect(projectKey(mk({ project_name: "אתר א" })))
      .not.toBe(projectKey(mk({ project_name: "אתר ב" })));
  });

  it("prefers project_id over project_name when both are set (real wins)", () => {
    expect(projectKey(mk({ project_id: "p1", project_name: "ignored" }))).toBe("p1");
  });

  it("__none__ for fully-empty side (defensive)", () => {
    expect(projectKey(mk({}))).toBe("__none__");
  });
});

describe("groupByProject", () => {
  it("returns a Map keyed by projectKey, values in input order", () => {
    const assignments = [
      mk({ id: "a1", project_id: "p1", worker_id: "w1" }),
      mk({ id: "a2", project_id: "p1", worker_id: "w2" }),
      mk({ id: "a3", project_id: "p2", worker_id: "w3" }),
    ];
    const grouped = groupByProject(assignments);
    expect([...grouped.keys()]).toEqual(["p1", "p2"]);
    expect(grouped.get("p1")?.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(grouped.get("p2")?.map((a) => a.id)).toEqual(["a3"]);
  });

  it("buckets manual-project assignments with the same name together", () => {
    const grouped = groupByProject([
      mk({ id: "a1", project_name: "אתר X" }),
      mk({ id: "a2", project_name: "אתר X" }),
      mk({ id: "a3", project_name: "אתר Y" }),
    ]);
    expect(grouped.get("manual:אתר X")?.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(grouped.get("manual:אתר Y")?.map((a) => a.id)).toEqual(["a3"]);
  });

  it("empty input → empty map", () => {
    expect(groupByProject([]).size).toBe(0);
  });
});

describe("unassignedWorkers", () => {
  const allWorkers = [W("w1", "מאיר"), W("w2", "אבי"), W("w3", "יוסי")];

  it("returns the workers NOT present in any assignment", () => {
    const assignments = [mk({ worker_id: "w1", project_id: "p1" })];
    expect(unassignedWorkers(allWorkers, assignments).map((w) => w.id))
      .toEqual(["w2", "w3"]);
  });

  it("ignores manual assignments — those workers are NOT in staff so 'unassigned' doesn't apply", () => {
    const assignments = [
      mk({ worker_id: "w1", project_id: "p1" }),
      mk({ worker_name: "פועל מקרי", project_id: "p1" }),
    ];
    expect(unassignedWorkers(allWorkers, assignments).map((w) => w.id))
      .toEqual(["w2", "w3"]);
  });

  it("preserves the input order of allWorkers", () => {
    const reverse = [W("z", "Z"), W("a", "A"), W("m", "M")];
    expect(unassignedWorkers(reverse, []).map((w) => w.id)).toEqual(["z", "a", "m"]);
  });

  it("empty assignments → all workers are unassigned", () => {
    expect(unassignedWorkers(allWorkers, []).map((w) => w.id)).toEqual(["w1", "w2", "w3"]);
  });

  it("empty workers → empty result regardless of assignments", () => {
    expect(unassignedWorkers([], [mk({ worker_id: "w1", project_id: "p1" })])).toEqual([]);
  });

  it("all workers assigned → empty result", () => {
    const assignments = allWorkers.map((w) => mk({ worker_id: w.id, project_id: "p1" }));
    expect(unassignedWorkers(allWorkers, assignments)).toEqual([]);
  });
});
