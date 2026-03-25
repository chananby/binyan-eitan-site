/**
 * Fractions Question Engine
 * Bar-Ilan Math Program — Gifted Students (Grades 5–6)
 *
 * Level 1 — Unit fractions:    "כמה זה 1/d מ-[d×n]?"     → integer
 * Level 2 — Proper fractions:  "כמה זה a/d מ-[d×n]?"     → integer
 * Level 3 — Mixed numbers:     "כמה זה W ו-a/d בסך הכל?" → decimal
 */

import type { Difficulty, MathQuestion } from "../types";
export type { Difficulty } from "../types";
export { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let _seq = 0;
function uid(): string { return `frac-${Date.now()}-${++_seq}`; }

/** Round to 3 significant decimal places to avoid IEEE 754 display noise */
function clean(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function fmt(n: number): string {
  const c = clean(n);
  return Number.isInteger(c) ? String(c) : String(c);
}

// Denominators that produce clean decimal values
const UNIT_DENOMS   = [2, 3, 4, 5, 6, 8, 10];    // level 1
const PROPER_DENOMS = [3, 4, 5, 6, 10];            // level 2 (min d=3 to get num≥2)
const MIXED_DENOMS  = [2, 4, 5, 10];               // level 3 — clean decimals

// ── level generators ─────────────────────────────────────────────────────────

function genLevel1(): MathQuestion {
  const d     = UNIT_DENOMS[rand(0, UNIT_DENOMS.length - 1)];
  const n     = rand(2, 10);          // multiplier
  const whole = d * n;
  const answer = n;                   // 1/d × (d×n) = n

  return {
    id: uid(), difficulty: 1,
    text: `כמה זה 1/${d} מ-${whole}?`,
    answer,
    hint: `חלק את ${whole} ב-${d}`,
    unit: "",
    fullSolution: [
      `שלב 1: כדי למצוא 1/${d} מ-${whole}, נחלק ב-${d}`,
      `חישוב: ${whole} ÷ ${d} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

function genLevel2(): MathQuestion {
  const d   = PROPER_DENOMS[rand(0, PROPER_DENOMS.length - 1)];
  const num = rand(2, d - 1);   // numerator: 2 … d-1 (proper, non-unit fraction)
  const n   = rand(2, 8);       // multiplier
  const whole  = d * n;
  const answer = num * n;       // (num/d) × (d×n) = num×n

  return {
    id: uid(), difficulty: 2,
    text: `כמה זה ${num}/${d} מ-${whole}?`,
    answer,
    hint: `מצא 1/${d} מ-${whole}, ואז כפול ב-${num}`,
    unit: "",
    fullSolution: [
      `שלב 1: מצא 1/${d} מ-${whole} — ${whole} ÷ ${d} = ${n}`,
      `שלב 2: כפול ב-${num} (המונה) — ${n} × ${num} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

function genLevel3(): MathQuestion {
  const w   = rand(1, 9);                               // whole-number part
  const d   = MIXED_DENOMS[rand(0, MIXED_DENOMS.length - 1)];
  const num = rand(1, d - 1);                           // proper fraction
  const fracDecimal = clean(num / d);
  const answer      = clean(w + num / d);

  return {
    id: uid(), difficulty: 3,
    text: `כמה זה ${w} ו-${num}/${d} בסך הכל? (ענה כמספר עשרוני)`,
    answer,
    hint: `חשב: ${w} + ${num} ÷ ${d}`,
    unit: "",
    fullSolution: [
      `שלב 1: קח את השלמים — ${w}`,
      `שלב 2: חשב את השבר — ${num} ÷ ${d} = ${fmt(fracDecimal)}`,
      `שלב 3: חבר שלמים ושבר — ${w} + ${fmt(fracDecimal)} = ${fmt(answer)}`,
      `✅ תשובה: ${fmt(answer)}`,
    ],
  };
}

// ── public API ────────────────────────────────────────────────────────────────

const generators: Record<Difficulty, () => MathQuestion> = {
  1: genLevel1, 2: genLevel2, 3: genLevel3,
};

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  return generators[difficulty]();
}
