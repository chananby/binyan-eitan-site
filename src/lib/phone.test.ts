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
  it("Israeli leading-0 → legacy 4 variants + suffix-9 expansion", () => {
    // Legacy layer: 0XXX, XXX, 972XXX, +972XXX (the 4 forms older
    // callers depended on). Layer 2 adds the 9-digit suffix and the
    // common country-code wrappers; for an already-Israeli input most
    // suffix forms dedupe back into the legacy 4, so net new variants
    // are just 94XXX / +94XXX / 0094XXX.
    const v = phoneVariants("0585008447").sort();
    expect(v).toEqual([
      "+94585008447",
      "+972585008447",
      "0094585008447",
      "0585008447",
      "585008447",
      "94585008447",
      "972585008447",
    ]);
  });

  it("non-Israeli input now gets full suffix-9 expansion (was: single variant)", () => {
    // Pre-fix this returned just ["4712789240"], leaving Sri Lankan
    // workers identifiable only if they typed an exact-form match.
    // With layer 2 the variant set covers the local form, the bare
    // 9-digit suffix, and every common country-code wrapper.
    const v = phoneVariants("4712789240").sort();
    expect(v).toEqual([
      "+94712789240",
      "+972712789240",
      "0094712789240",
      "0712789240",
      "4712789240",
      "712789240",
      "94712789240",
      "972712789240",
    ]);
  });

  it("inputs shorter than 9 digits skip suffix expansion (too little material)", () => {
    expect(phoneVariants("12345678")).toEqual(["12345678"]);
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
  // ── 5 Sri Lankan records (post-backfill: 11-digit "94..." form) ──
  // Step 2a (DB UPDATE) put the leading 9 of the country code back.
  // The fixture lines up with the live state again.
  { phone: "94711692914", note: "עובד נילנגה (סרי לנקה)" },
  { phone: "94712789240", note: "עובד פייסירי (סרי לנקה)" },
  { phone: "94763340674", note: "עובד סנניקה (סרי לנקה)" },
  { phone: "94775729368", note: "עובד ניפונר (סרי לנקה)" },
  { phone: "94778300852", note: "עובד בודיגה (סרי לנקה)" },
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

/** Inputs that should identify a Sri Lankan worker — both what the
 *  admin would type when entering them in the first place AND what
 *  the worker themselves would dial. With suffix-9 expansion in
 *  phoneVariants, the local format (a worker dialling from home) now
 *  resolves to the same stored value as the international form. */
function plausibleSriLankanInputs(stored: string): string[] {
  // stored = "94DDDDDDDDD" — 11 digits, full Sri Lanka country code.
  // The 9-digit national portion is everything past the "94".
  const national9 = stored.slice(2);
  return [
    stored,                   // 94712789240
    `+${stored}`,             // +94712789240
    `00${stored}`,            // 0094712789240 (IDD from Israel)
    `0${national9}`,          // 0712789240 — local format the worker dials at home
    national9,                // 712789240 — bare 9 digits
    `4${national9}`,          // 4712789240 — the legacy chopped form, still tolerated
  ];
}

describe("snapshot — every current staff record is identifiable today", () => {
  for (const fixture of STAFF_SNAPSHOT) {
    const isIsraeli = fixture.phone.startsWith("0");
    const inputs = isIsraeli
      ? plausibleIsraeliInputs(fixture.phone)
      : plausibleSriLankanInputs(fixture.phone);
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

// ── Layer 3: Sri Lankan local format — now passes after step 2 ────────────
//
// What was a .fails() block in step 1 is now a regular passing block.
// A Sri Lankan worker dialling their own number drops the country
// code 94 and prepends 0 — so 94712789240 becomes 0712789240. With
// the suffix-9 expansion in phoneVariants this normalizes back to a
// variant set that contains the stored 94XXXXXXXXX, so identify
// succeeds regardless of which form is used.

const FOREIGN_FIXTURES = STAFF_SNAPSHOT.filter((f) => !f.phone.startsWith("0"));

describe("Sri Lankan local format identifies via suffix-9 expansion", () => {
  for (const fixture of FOREIGN_FIXTURES) {
    // Stored "94DDDDDDDDD" → local "0DDDDDDDDD" (drop country code, add leading 0)
    const localFormat = "0" + fixture.phone.slice(2);
    it(`${fixture.note} — local "${localFormat}" → stored ${fixture.phone}`, () => {
      const variants = phoneVariants(normalizePhone(localFormat));
      expect(variants).toContain(fixture.phone);
    });
  }
});

// ── Layer 4: collision protection — different suffixes → no overlap ───────
//
// The agnostic suffix-9 lookup hinges on the assumption that the 40
// workers in the system have distinct last-9 digits. We audited that
// at design time (no collisions in the live data). These tests lock
// the invariant into the suite so a future fixture update + change
// pairing can't silently introduce a collision.

describe("collision protection — distinct suffixes never overlap", () => {
  it("two Israeli phones with different last-9 digits → no overlapping variants", () => {
    const a = phoneVariants(normalizePhone("0585008447"));
    const b = phoneVariants(normalizePhone("0511111111"));
    const overlap = a.filter((x) => b.includes(x));
    expect(overlap, `unexpected overlap: ${JSON.stringify(overlap)}`).toEqual([]);
  });

  it("two Sri Lankan phones with different last-9 digits → no overlapping variants", () => {
    const a = phoneVariants(normalizePhone("94712789240"));
    const b = phoneVariants(normalizePhone("94778300852"));
    const overlap = a.filter((x) => b.includes(x));
    expect(overlap, `unexpected overlap: ${JSON.stringify(overlap)}`).toEqual([]);
  });

  it("an Israeli phone and a Sri Lankan phone with different suffixes → no overlap", () => {
    const a = phoneVariants(normalizePhone("0585008447"));     // suffix 585008447
    const b = phoneVariants(normalizePhone("94712789240"));    // suffix 712789240
    const overlap = a.filter((x) => b.includes(x));
    expect(overlap).toEqual([]);
  });

  it("the full snapshot has no inter-record variant overlap", () => {
    // Stronger: across every pair of fixture records, no variant
    // generated for record A also appears in the variant set for B.
    const variantSets = STAFF_SNAPSHOT.map((f) => ({
      phone: f.phone,
      variants: new Set(phoneVariants(normalizePhone(f.phone))),
    }));
    for (let i = 0; i < variantSets.length; i++) {
      for (let j = i + 1; j < variantSets.length; j++) {
        const a = variantSets[i];
        const b = variantSets[j];
        const overlap = [...a.variants].filter((x) => b.variants.has(x));
        expect(
          overlap,
          `${a.phone} and ${b.phone} share variants: ${JSON.stringify(overlap)}`,
        ).toEqual([]);
      }
    }
  });
});
