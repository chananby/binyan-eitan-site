/**
 * phone.ts coverage — baseline BEFORE the planned normalize change.
 *
 * Three layers:
 *   1. Hand-written assertions for normalizePhone + phoneVariants
 *      using the canonical examples from phone.ts's own header.
 *   2. Snapshot of every current staff record (40 rows pulled live
 *      from Supabase at the time this file was written). For each
 *      record we generate a set of "plausible re-discovery inputs" —
 *      what an admin or worker might type — and assert that they all
 *      normalize+vary into a set that contains the stored value. Every
 *      single record must be identifiable today.
 *   3. Known broken cases — Sri Lankan workers whose stored phone has
 *      the leading 9 of the country code chopped off (by the very
 *      normalize bug we're going to fix). Inputs in the natural Sri
 *      Lankan local format do NOT identify them today; these are
 *      marked .fails() so the test suite is honest about it. Once
 *      step 2 (normalize fix + backfill) lands, these flip to passing
 *      and the .fails() modifier comes off.
 */
import { describe, it, expect } from "vitest";
import { normalizePhone, phoneVariants } from "./phone";

// ── Layer 1: documented examples from phone.ts ────────────────────────────
describe("normalizePhone — documented behaviour", () => {
  it("Israeli with dashes → leading-0 10-digit", () => {
    expect(normalizePhone("058-500-8447")).toBe("0585008447");
  });
  it("Israeli with +972 → leading-0 10-digit", () => {
    expect(normalizePhone("+972585008447")).toBe("0585008447");
  });
  it("Israeli with 972 (no +) → leading-0 10-digit", () => {
    expect(normalizePhone("972585008447")).toBe("0585008447");
  });
  it("strips arbitrary non-digit characters", () => {
    expect(normalizePhone("058 500 8447")).toBe("0585008447");
    expect(normalizePhone("(058) 500-8447")).toBe("0585008447");
    expect(normalizePhone(" 0585008447 ")).toBe("0585008447");
  });
  it("falls through to last-10-digits when 972 prefix is too short", () => {
    // Only enters the special 972 branch when length >= 12. Anything
    // shorter takes the generic slice(-10) path.
    expect(normalizePhone("972585008")).toBe("972585008");
  });
});

describe("phoneVariants — documented behaviour", () => {
  it("Israeli leading-0 → 4 variants (0XXX, XXX, 972XXX, +972XXX)", () => {
    const v = phoneVariants("0585008447");
    expect(v.sort()).toEqual([
      "+972585008447",
      "0585008447",
      "585008447",
      "972585008447",
    ].sort());
  });
  it("non-Israeli (no leading 0) → single variant of itself", () => {
    // This is the gap the snapshot suite below documents: foreign
    // numbers get no expansion at all, so the worker has to type a
    // format that survives normalize unchanged.
    expect(phoneVariants("4712789240")).toEqual(["4712789240"]);
  });
});

// ── Layer 2: snapshot of every staff record (live pull, 40 rows) ──────────
//
// Embedded as a fixture so future normalize changes are guaranteed to
// keep identifying the existing roster. Names are first-name only.
// When staff joins / leaves, this fixture goes out of date — that's
// the explicit cost of a snapshot test, and it's worth paying for the
// confidence it gives across the 40-strong Israeli + Sri Lankan mix.

interface StaffFixture {
  phone: string;
  note: string;
}

const STAFF_SNAPSHOT: StaffFixture[] = [
  // ── 35 Israeli records (stored as 10-digit leading 0) ──
  { phone: "0503884757", note: "עובד דניאל" },
  { phone: "0504366436", note: "עובד מיכאל" },
  { phone: "0504692551", note: "עובד שחר" },
  { phone: "0504886948", note: "עובד ישראל" },
  { phone: "0504917936", note: "עובד שחוב" },
  { phone: "0507633875", note: "עובד נריה" },
  { phone: "0509012815", note: "עובד דוד" },
  { phone: "0509772083", note: "עובד יצחק" },
  { phone: "0512859717", note: "עובד נתן" },
  { phone: "0522953302", note: "עובד מוחמד" },
  { phone: "0524852800", note: "עובד ניסיון" },
  { phone: "0525063895", note: "עובד אביאל" },
  { phone: "0525405083", note: "עובד זיו" },
  { phone: "0526332353", note: "עובד יוסף" },
  { phone: "0527040366", note: "עובד יצחק" },
  { phone: "0533070021", note: "עובד מיקי" },
  { phone: "0533214208", note: "עובד סיימון" },
  { phone: "0537305347", note: "עובד משה" },
  { phone: "0542000456", note: "מנהל מוטי" },
  { phone: "0543619570", note: "עובד נתנאל" },
  { phone: "0545234869", note: "עובד חנן" },
  { phone: "0547505755", note: "עובד ישראל" },
  { phone: "0547511142", note: "עובד חזי" },
  { phone: "0548092500", note: "ממונה מיכאל" },
  { phone: "0548578565", note: "עובד נחמן" },
  { phone: "0549669198", note: "עובד מאיר" },
  { phone: "0552770936", note: "עובד בן" },
  { phone: "0556615678", note: "עובד שמואל" },
  { phone: "0559121857", note: "עובד פריינטה" },
  { phone: "0559250466", note: "עובד סוחרוב" },
  { phone: "0559364194", note: "עובד אברהם" },
  { phone: "0559507364", note: "עובד עלי" },
  { phone: "0584061010", note: "עובד נחמן" },
  { phone: "0585008447", note: "מנהל ראשי" },
  { phone: "0585716860", note: "עובד צ'ארלי" },
  // ── 5 Sri Lankan records (stored with chopped leading 9 — bug we'll fix) ──
  { phone: "4711692914", note: "עובד נילנגה (סרי לנקה)" },
  { phone: "4712789240", note: "עובד פייסירי (סרי לנקה)" },
  { phone: "4763340674", note: "עובד סנניקה (סרי לנקה)" },
  { phone: "4775729368", note: "עובד ניפונר (סרי לנקה)" },
  { phone: "4778300852", note: "עובד בודיגה (סרי לנקה)" },
];

/** Inputs an Israeli worker might plausibly type at the phone-entry
 *  screen. The stored form is leading-0 10-digit, so we generate the
 *  same with dashes/spaces/+972/972 prefixes — all four formats the
 *  current normalize+variants should round-trip to. */
function plausibleIsraeliInputs(stored: string): string[] {
  // stored = "0DDDDDDDDD" — drop the leading 0 for 972 prefix forms
  const without0 = stored.slice(1);
  return [
    stored,
    `${stored.slice(0, 3)}-${stored.slice(3, 6)}-${stored.slice(6)}`, // 050-388-4757
    `${stored.slice(0, 3)} ${stored.slice(3, 6)} ${stored.slice(6)}`, // 050 388 4757
    `+972${without0}`,
    `972${without0}`,
  ];
}

/** Inputs the admin might type for a Sri Lankan worker when entering
 *  them in the first place. The "9X" prefix is the country code; the
 *  stored 10-digit form is what survives slice(-10) after stripping
 *  the leading 9 — so any 11/12/13-digit international form should
 *  normalize to the same stored value. */
function plausibleForeignAdminInputs(stored: string): string[] {
  return [
    stored,            // "4712789240" itself
    `9${stored}`,      // "94712789240" — full intl without +
    `+9${stored}`,     // "+94712789240"
    `00 9${stored}`,   // "0094712789240" — IDD-prefixed
  ];
}

describe("snapshot — every current staff record is identifiable today", () => {
  for (const fixture of STAFF_SNAPSHOT) {
    const isIsraeli = fixture.phone.startsWith("0");
    const inputs = isIsraeli
      ? plausibleIsraeliInputs(fixture.phone)
      : plausibleForeignAdminInputs(fixture.phone);
    it(`${fixture.note} — ${fixture.phone} matches all ${inputs.length} plausible inputs`, () => {
      for (const input of inputs) {
        const variants = phoneVariants(normalizePhone(input));
        expect(
          variants,
          `input "${input}" produced variants ${JSON.stringify(variants)}, missing stored "${fixture.phone}"`,
        ).toContain(fixture.phone);
      }
    });
  }
});

// ── Layer 3: known-broken — what step 2 will fix ──────────────────────────
//
// A Sri Lankan worker, in the natural local format they'd dial back
// home, drops the country code 94 and prepends 0 — so 94712789240
// becomes 0712789240. With the bug-stored "4712789240" plus today's
// normalize+variants, that input does NOT identify the worker. The
// .fails() modifier asserts "this test SHOULD fail right now" — when
// step 2 lands, vitest will start failing this with "expected to fail
// but passed", and we delete the modifier (or the whole block) to
// promote it to a normal passing test.

const FOREIGN_FIXTURES = STAFF_SNAPSHOT.filter((f) => !f.phone.startsWith("0"));

describe("known broken — Sri Lankan local format (to fix in step 2)", () => {
  for (const fixture of FOREIGN_FIXTURES) {
    // Stored "4XXXXXXXXX" → real intl "94XXXXXXXXX" → local "0XXXXXXXXX"
    const localFormat = "0" + fixture.phone.slice(1);
    it.fails(
      `${fixture.note} — local "${localFormat}" SHOULD identify ${fixture.phone} (currently doesn't)`,
      () => {
        const variants = phoneVariants(normalizePhone(localFormat));
        expect(variants).toContain(fixture.phone);
      },
    );
  }
});
