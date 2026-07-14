import { describe, it, expect } from "vitest";
import { isSuspiciousTimeMove } from "./correction-danger";

// Israel summer wall clock via explicit +03:00 offset.
const at = (hhmm: string) => `2026-06-28T${hhmm}:00+03:00`;

describe("isSuspiciousTimeMove", () => {
  // The core trap: worker forgot to clock OUT, attached an evening time to the
  // morning clock-IN. Approving it as fix_time would destroy the shift.
  it("flags an ENTRY moved to the afternoon (>=12:00)", () => {
    expect(isSuspiciousTimeMove("כניסה", at("06:52"), "17:00")).toBe(true);
    expect(isSuspiciousTimeMove("in", at("07:24"), "14:15")).toBe(true);
  });

  it("flags an ENTRY moved by more than 4 hours even if still morning-ish", () => {
    expect(isSuspiciousTimeMove("כניסה", at("07:00"), "11:30")).toBe(true); // +4.5h
  });

  it("does NOT flag a small ENTRY time correction", () => {
    expect(isSuspiciousTimeMove("כניסה", at("07:00"), "07:15")).toBe(false);
    expect(isSuspiciousTimeMove("כניסה", at("08:00"), "06:45")).toBe(false);
  });

  // Moving an EXIT is the legitimate use case — never suspicious.
  it("never flags an EXIT move, even to the evening", () => {
    expect(isSuspiciousTimeMove("יציאה", at("17:00"), "18:30")).toBe(false);
    expect(isSuspiciousTimeMove("out", at("12:00"), "20:00")).toBe(false);
  });

  it("returns false for a missing/invalid proposed time", () => {
    expect(isSuspiciousTimeMove("כניסה", at("07:00"), null)).toBe(false);
    expect(isSuspiciousTimeMove("כניסה", at("07:00"), "bad")).toBe(false);
  });
});
