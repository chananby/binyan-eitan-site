/**
 * Conversions Question Engine
 * Bar-Ilan Math Program — Gifted Students (Grade 5)
 *
 * Goal: make percent ↔ decimal ↔ fraction conversions feel automatic.
 * Every question picks a random DIRECTION and a random VALUE, so the
 * student sees many different entry points for the same concept.
 *
 * Level 1 — Core set (1/2, 1/4, 3/4, 1/5, 1/10 family)
 *   Directions: % → decimal, decimal → %, fraction → %, fraction → decimal
 *
 * Level 2 — Extended set (fifths, tenths, twentieths)
 *   Adds: 2/5, 3/5, 3/10, 7/10, 9/10 + all level-1 directions
 *
 * Level 3 — Harder set (twentieths, twenty-fifths) + extra direction:
 *   "X% = __/20?" — find the numerator over a given denominator
 */

import type { Difficulty, MathQuestion } from "../types";
export type { Difficulty } from "../types";
export { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "../types";

// ── types ─────────────────────────────────────────────────────────────────────

interface Entry {
  frac: string;   // display string, e.g. "3/4"
  num:  number;   // numerator
  den:  number;   // denominator
  dec:  number;   // exact decimal  (e.g. 0.75)
  pct:  number;   // percent        (e.g. 75)
}

// "direction" of the conversion question
type Dir =
  | "pct_to_dec"    // 75%  → 0.75
  | "dec_to_pct"    // 0.75 → 75
  | "frac_to_pct"   // 3/4  → 75
  | "frac_to_dec"   // 3/4  → 0.75
  | "pct_to_numer"; // 35% = __/20?  (find numerator over fixed denom)

// ── helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }

let _seq = 0;
function uid(): string { return `conv-${Date.now()}-${++_seq}`; }

function fmtDec(n: number): string {
  // Show up to 3 decimal places, strip trailing zeros
  const s = n.toFixed(3).replace(/\.?0+$/, "");
  return s;
}

// ── conversion entry pools ────────────────────────────────────────────────────

const L1: Entry[] = [
  { frac: "1/2",   num: 1, den: 2,   dec: 0.5,  pct: 50  },
  { frac: "1/4",   num: 1, den: 4,   dec: 0.25, pct: 25  },
  { frac: "3/4",   num: 3, den: 4,   dec: 0.75, pct: 75  },
  { frac: "1/5",   num: 1, den: 5,   dec: 0.2,  pct: 20  },
  { frac: "2/5",   num: 2, den: 5,   dec: 0.4,  pct: 40  },
  { frac: "4/5",   num: 4, den: 5,   dec: 0.8,  pct: 80  },
  { frac: "1/10",  num: 1, den: 10,  dec: 0.1,  pct: 10  },
  { frac: "1/2",   num: 1, den: 2,   dec: 0.5,  pct: 50  }, // weighted — most fundamental
  { frac: "1/4",   num: 1, den: 4,   dec: 0.25, pct: 25  }, // weighted
];

const L2: Entry[] = [
  ...L1,
  { frac: "3/5",   num: 3, den: 5,   dec: 0.6,  pct: 60  },
  { frac: "3/10",  num: 3, den: 10,  dec: 0.3,  pct: 30  },
  { frac: "7/10",  num: 7, den: 10,  dec: 0.7,  pct: 70  },
  { frac: "9/10",  num: 9, den: 10,  dec: 0.9,  pct: 90  },
  { frac: "1/20",  num: 1, den: 20,  dec: 0.05, pct: 5   },
  { frac: "1/100", num: 1, den: 100, dec: 0.01, pct: 1   },
];

const L3: Entry[] = [
  ...L2,
  { frac: "3/20",  num: 3,  den: 20, dec: 0.15, pct: 15 },
  { frac: "7/20",  num: 7,  den: 20, dec: 0.35, pct: 35 },
  { frac: "9/20",  num: 9,  den: 20, dec: 0.45, pct: 45 },
  { frac: "11/20", num: 11, den: 20, dec: 0.55, pct: 55 },
  { frac: "13/20", num: 13, den: 20, dec: 0.65, pct: 65 },
  { frac: "17/20", num: 17, den: 20, dec: 0.85, pct: 85 },
  { frac: "1/25",  num: 1,  den: 25, dec: 0.04, pct: 4  },
  { frac: "3/25",  num: 3,  den: 25, dec: 0.12, pct: 12 },
  { frac: "4/25",  num: 4,  den: 25, dec: 0.16, pct: 16 },
];

// Denominators available for "pct_to_numer" (find numerator over D)
// Only usable when pct is cleanly divisible: pct / 100 * D is integer
const NUMER_DENOMS = [4, 5, 10, 20, 25, 100];

// ── question builders ─────────────────────────────────────────────────────────

function buildPctToDec(e: Entry): MathQuestion {
  return {
    id: uid(), difficulty: 1,
    text: `${e.pct}% כמספר עשרוני — כמה זה?`,
    answer: e.dec,
    hint: `חלק ב-100: ${e.pct} ÷ 100`,
    unit: "",
    fullSolution: [
      `כדי להפוך אחוז למספר עשרוני — מחלקים ב-100`,
      `${e.pct} ÷ 100 = ${fmtDec(e.dec)}`,
      `✅ תשובה: ${fmtDec(e.dec)}`,
    ],
  };
}

function buildDecToPct(e: Entry): MathQuestion {
  return {
    id: uid(), difficulty: 1,
    text: `${fmtDec(e.dec)} כמה אחוזים זה?`,
    answer: e.pct,
    hint: `כפול ב-100: ${fmtDec(e.dec)} × 100`,
    unit: "%",
    fullSolution: [
      `כדי להפוך מספר עשרוני לאחוז — מכפילים ב-100`,
      `${fmtDec(e.dec)} × 100 = ${e.pct}`,
      `✅ תשובה: ${e.pct}%`,
    ],
  };
}

function buildFracToPct(e: Entry): MathQuestion {
  return {
    id: uid(), difficulty: 1,
    text: `${e.frac} — כמה אחוזים זה?`,
    answer: e.pct,
    hint: `${e.num} ÷ ${e.den} × 100`,
    unit: "%",
    fullSolution: [
      `שלב 1: חלק מונה במכנה — ${e.num} ÷ ${e.den} = ${fmtDec(e.dec)}`,
      `שלב 2: כפול ב-100 — ${fmtDec(e.dec)} × 100 = ${e.pct}`,
      `✅ תשובה: ${e.pct}%`,
    ],
  };
}

function buildFracToDec(e: Entry): MathQuestion {
  return {
    id: uid(), difficulty: 1,
    text: `${e.frac} כמספר עשרוני — כמה זה?`,
    answer: e.dec,
    hint: `חלק מונה במכנה: ${e.num} ÷ ${e.den}`,
    unit: "",
    fullSolution: [
      `חלק את המונה במכנה: ${e.num} ÷ ${e.den} = ${fmtDec(e.dec)}`,
      `✅ תשובה: ${fmtDec(e.dec)}`,
    ],
  };
}

// "X% = __/D?" — find numerator over a specific denominator
function buildPctToNumer(e: Entry): MathQuestion | null {
  // Find a clean denominator for this percent
  const validDenoms = NUMER_DENOMS.filter(d => Number.isInteger((e.pct / 100) * d));
  if (validDenoms.length === 0) return null;
  const d = pick(validDenoms);
  const numerator = (e.pct / 100) * d;
  return {
    id: uid(), difficulty: 3,
    text: `${e.pct}% = ___/${d}  —  מה המספר החסר?`,
    answer: numerator,
    hint: `${e.pct} ÷ 100 × ${d}`,
    unit: "",
    fullSolution: [
      `שלב 1: הפוך את האחוז לשבר — ${e.pct}% = ${e.pct}/100`,
      `שלב 2: אם המכנה הוא ${d}, חשב ${e.pct} ÷ 100 × ${d} = ${numerator}`,
      `✅ תשובה: ${numerator}  (כלומר: ${e.pct}% = ${numerator}/${d})`,
    ],
  };
}

// ── level generators ──────────────────────────────────────────────────────────

const L1_DIRS: Dir[] = ["pct_to_dec", "dec_to_pct", "frac_to_pct", "frac_to_dec"];
const L2_DIRS: Dir[] = ["pct_to_dec", "dec_to_pct", "frac_to_pct", "frac_to_dec"];
const L3_DIRS: Dir[] = ["pct_to_dec", "dec_to_pct", "frac_to_pct", "frac_to_dec", "pct_to_numer", "pct_to_numer"];

function gen(pool: Entry[], dirs: Dir[]): MathQuestion {
  const e   = pick(pool);
  const dir = pick(dirs);

  switch (dir) {
    case "pct_to_dec":    return buildPctToDec(e);
    case "dec_to_pct":    return buildDecToPct(e);
    case "frac_to_pct":   return buildFracToPct(e);
    case "frac_to_dec":   return buildFracToDec(e);
    case "pct_to_numer": {
      const q = buildPctToNumer(e);
      // If this entry doesn't work for pct_to_numer, fall back to another direction
      return q ?? buildFracToPct(e);
    }
  }
}

function genLevel1(): MathQuestion { return gen(L1, L1_DIRS); }
function genLevel2(): MathQuestion { return gen(L2, L2_DIRS); }
function genLevel3(): MathQuestion { return gen(L3, L3_DIRS); }

// ── public API ────────────────────────────────────────────────────────────────

const generators: Record<Difficulty, () => MathQuestion> = {
  1: genLevel1, 2: genLevel2, 3: genLevel3,
};

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  return generators[difficulty]();
}
