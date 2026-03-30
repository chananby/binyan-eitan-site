/**
 * Fractions Question Engine
 * Bar-Ilan Math Program — Gifted Students (Grades 5–6)
 *
 * Level 1 — Unit fractions:     "כמה זה 1/d מ-[d×n]?"              → integer
 * Level 2 — Proper fractions:   "כמה זה a/d מ-[d×n]?"              → integer
 * Level 3 — Mixed numbers:      "כמה זה W ו-a/d בסך הכל?"          → decimal
 * Level 4 — Add fractions:      "כמה זה a/d + b/d?"                 → decimal
 * Level 5 — Unlike denominators:"כמה זה a/d₁ + b/d₂?" / "a/d₁ - b/d₂?"
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

function clean(n: number): number { return Math.round(n * 1000) / 1000; }
function fmt(n: number): string { return String(clean(n)); }

// Denominators that produce clean decimal values
const UNIT_DENOMS   = [2, 3, 4, 5, 6, 8, 10];
const PROPER_DENOMS = [3, 4, 5, 6, 10];
const MIXED_DENOMS  = [2, 4, 5, 10];
// Denominators safe for addition (clean decimals for sum too)
const ADD_DENOMS    = [2, 4, 5, 10];

// Pairs (d1, d2) where d2 is a multiple of d1 → common denom = d2
const UNLIKE_PAIRS: [number, number][] = [
  [2, 4], [2, 10], [5, 10], [2, 4], [4, 4], [5, 10],
];

// ── level generators ─────────────────────────────────────────────────────────

function genLevel1(): MathQuestion {
  const d     = UNIT_DENOMS[rand(0, UNIT_DENOMS.length - 1)];
  const n     = rand(2, 10);
  const whole = d * n;
  const answer = n;

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
  const num = rand(2, d - 1);
  const n   = rand(2, 8);
  const whole  = d * n;
  const answer = num * n;

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
  const w   = rand(1, 9);
  const d   = MIXED_DENOMS[rand(0, MIXED_DENOMS.length - 1)];
  const num = rand(1, d - 1);
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

function genLevel4(): MathQuestion {
  // Add two fractions with the SAME denominator (answer may be improper → decimal)
  const d  = ADD_DENOMS[rand(0, ADD_DENOMS.length - 1)];
  const a  = rand(1, d);
  const b  = rand(1, d);
  const answer = clean((a + b) / d);

  return {
    id: uid(), difficulty: 4,
    text: `${a}/${d} + ${b}/${d} = ?  (ענה כמספר עשרוני)`,
    answer,
    hint: `חבר את המונים: ${a} + ${b} = ${a + b}, ואז חלק ב-${d}`,
    unit: "",
    fullSolution: [
      `שלב 1: המכנים שווים (${d}), לכן חבר את המונים בלבד`,
      `שלב 2: ${a} + ${b} = ${a + b}`,
      `שלב 3: ${a + b}/${d} = ${fmt(answer)}`,
      `✅ תשובה: ${fmt(answer)}`,
    ],
  };
}

function genLevel5(): MathQuestion {
  // Add or subtract fractions with UNLIKE denominators (d1 divides d2)
  const [d1, d2] = UNLIKE_PAIRS[rand(0, UNLIKE_PAIRS.length - 1)];
  const isAdd = rand(0, 1) === 1;

  if (d1 === d2) {
    // Same denom — subtraction: a/d - b/d where a > b
    const a = rand(2, d1);
    const b = rand(1, a - 1);
    const answer = clean((a - b) / d1);
    return {
      id: uid(), difficulty: 5,
      text: `${a}/${d1} − ${b}/${d1} = ?  (ענה כמספר עשרוני)`,
      answer,
      hint: `חסר את המונים: ${a} − ${b}`,
      unit: "",
      fullSolution: [
        `המכנים שווים (${d1}), חסר את המונים`,
        `${a} − ${b} = ${a - b}`,
        `${a - b}/${d1} = ${fmt(answer)}`,
        `✅ תשובה: ${fmt(answer)}`,
      ],
    };
  }

  // Unlike denominators: convert d1 fraction to d2 denominator
  const a  = rand(1, d1);       // numerator over d1
  const b  = rand(1, d2 - 1);  // numerator over d2
  const scale = d2 / d1;
  const aConv = a * scale;     // equivalent numerator over d2
  const sumNum = isAdd ? aConv + b : Math.abs(aConv - b);
  const answer = clean(sumNum / d2);
  const op     = isAdd ? "+" : "−";

  return {
    id: uid(), difficulty: 5,
    text: `${a}/${d1} ${op} ${b}/${d2} = ?  (ענה כמספר עשרוני)`,
    answer,
    hint: `הפוך ${a}/${d1} לשבר עם מכנה ${d2}: כפול מונה ומכנה ב-${scale}`,
    unit: "",
    fullSolution: [
      `שלב 1: הפוך ${a}/${d1} → מכנה ${d2}: ${a}×${scale}/${d1}×${scale} = ${aConv}/${d2}`,
      `שלב 2: ${aConv}/${d2} ${op} ${b}/${d2} = ${sumNum}/${d2}`,
      `שלב 3: ${sumNum}/${d2} = ${fmt(answer)}`,
      `✅ תשובה: ${fmt(answer)}`,
    ],
  };
}

// ── public API ────────────────────────────────────────────────────────────────

const generators: Record<Difficulty, () => MathQuestion> = {
  1: genLevel1, 2: genLevel2, 3: genLevel3, 4: genLevel4, 5: genLevel5,
};

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  return generators[difficulty]();
}
