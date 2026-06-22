import { describe, it, expect } from "vitest";
import {
  validateJoinRequest,
  MAX_NAME_CHARS,
  MAX_DESCRIPTION_CHARS,
} from "./join-requests-validate";

describe("validateJoinRequest — full_name", () => {
  it("accepts a trimmed Hebrew name", () => {
    const r = validateJoinRequest({ full_name: "  ישראל ישראלי ", phone: "0585008447" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.full_name).toBe("ישראל ישראלי");
  });

  it("collapses internal whitespace runs", () => {
    const r = validateJoinRequest({ full_name: "ישראל\t\nישראלי", phone: "0585008447" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.full_name).toBe("ישראל ישראלי");
  });

  it("rejects an empty name", () => {
    const r = validateJoinRequest({ full_name: "", phone: "0585008447" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.full_name).toBeTruthy();
  });

  it("rejects whitespace-only name", () => {
    const r = validateJoinRequest({ full_name: "   ", phone: "0585008447" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.full_name).toBeTruthy();
  });

  it("rejects a name longer than the cap", () => {
    const r = validateJoinRequest({
      full_name: "א".repeat(MAX_NAME_CHARS + 1),
      phone: "0585008447",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.full_name).toMatch(/ארוך/);
  });

  it("rejects a non-string name field (defensive)", () => {
    const r = validateJoinRequest({ full_name: 123, phone: "0585008447" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.full_name).toBeTruthy();
  });
});

describe("validateJoinRequest — phone normalization + validation", () => {
  it("normalizes Israeli formats to 10-digit leading-0", () => {
    const a = validateJoinRequest({ full_name: "א", phone: "058-500-8447" });
    const b = validateJoinRequest({ full_name: "א", phone: "+972585008447" });
    const c = validateJoinRequest({ full_name: "א", phone: "972585008447" });
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (a.ok && b.ok && c.ok) {
      expect(a.data.phone).toBe("0585008447");
      expect(b.data.phone).toBe("0585008447");
      expect(c.data.phone).toBe("0585008447");
    }
  });

  it("rejects a phone with fewer than 9 digits after normalize", () => {
    const r = validateJoinRequest({ full_name: "א", phone: "0585008" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.phone).toMatch(/לא תקין/);
  });

  it("rejects empty phone", () => {
    const r = validateJoinRequest({ full_name: "א", phone: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.phone).toBeTruthy();
  });

  it("rejects whitespace-only phone", () => {
    const r = validateJoinRequest({ full_name: "א", phone: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.phone).toBeTruthy();
  });
});

describe("validateJoinRequest — description", () => {
  it("accepts an empty description and stores it as null", () => {
    const r = validateJoinRequest({ full_name: "א", phone: "0585008447" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.description).toBe(null);
  });

  it("accepts a short description verbatim (after tidy)", () => {
    const r = validateJoinRequest({
      full_name: "א", phone: "0585008447",
      description: " עובד בנייה כללי, ניסיון 5 שנים  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.description).toBe("עובד בנייה כללי, ניסיון 5 שנים");
  });

  it("rejects a description longer than the cap", () => {
    const r = validateJoinRequest({
      full_name: "א", phone: "0585008447",
      description: "x".repeat(MAX_DESCRIPTION_CHARS + 1),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.description).toMatch(/ארוך/);
  });

  it("non-string description is treated as empty (defensive — no crash)", () => {
    const r = validateJoinRequest({
      full_name: "א", phone: "0585008447",
      description: { length: 999 } as unknown as string,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.description).toBe(null);
  });
});

describe("validateJoinRequest — multiple errors at once", () => {
  it("returns all field errors in a single response", () => {
    const r = validateJoinRequest({ full_name: "", phone: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.full_name).toBeTruthy();
      expect(r.errors.phone).toBeTruthy();
    }
  });
});
