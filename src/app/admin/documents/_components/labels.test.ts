import { describe, it, expect } from "vitest";
import { statusChip } from "./labels";

// statusChip is the per-document display decision: given (status,
// extraction_status), what chip does the inbox / detail header show. The
// decouple work added a distinct "ממתין לחילוץ" state, so lock the precedence
// in: failed-extraction first, then not-yet-extracted, then review status.
const chip = (status: string, extraction_status: string) =>
  statusChip({ status, extraction_status });

describe("statusChip", () => {
  it("failed extraction wins over everything (needs a retry first)", () => {
    expect(chip("pending", "failed").label).toBe("חילוץ נכשל");
    expect(chip("approved", "failed").label).toBe("חילוץ נכשל");
    expect(chip("failed", "failed").warn).toBe(true);
  });

  it("not-yet-extracted (decoupled / zombie) → ממתין לחילוץ, not review-pending", () => {
    expect(chip("pending", "pending").label).toBe("ממתין לחילוץ");
  });

  it("an already-decided doc keeps its review chip even if extraction is pending", () => {
    // Defensive: a decision must not be masked by a stale 'pending' extraction.
    expect(chip("approved", "pending").label).toBe("מאושר");
    expect(chip("rejected", "pending").label).toBe("נדחה");
  });

  it("extracted docs chip by review status", () => {
    expect(chip("pending", "done").label).toBe("ממתין");
    expect(chip("approved", "done").label).toBe("מאושר");
    expect(chip("rejected", "done").label).toBe("נדחה");
  });
});
