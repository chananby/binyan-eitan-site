/**
 * Percentages Question Engine
 * Bar-Ilan Math Program — Gifted Students (Grades 5–6)
 *
 * Level 1 — Direct:   "כמה זה X% מ-Y?"              (find X% of Y)
 * Level 2 — Reverse:  "Y הוא X% מ-כמה?"             (find the whole)
 * Level 3 — Rate:     "כמה אחוז זה X מתוך Y?"        (find the percent)
 */

import type { Difficulty, MathQuestion } from "../types";
export type { Difficulty } from "../types";
export { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const NICE_PERCENTS: Record<Difficulty, number[]> = {
  1: [10, 20, 25, 50, 75],
  2: [10, 20, 25, 50],
  3: [10, 20, 25, 50, 75],
};

// pct-aware: ensures (pct/100)*whole is always a whole number
function pickWhole(level: Difficulty, pct: number): number {
  if (level === 1) {
    // pct 25/75 need mult-of-4; other percents (10,20,50) are fine with mult-of-10
    if (pct === 25 || pct === 75) {
      const pool = [20, 40, 60, 80];
      return pool[rand(0, pool.length - 1)];
    }
    return rand(1, 9) * 10; // 10–90
  }
  if (level === 2) return rand(1, 8) * 20; // 20–160, always mult-of-4 ✓
  // Level 3
  if (pct === 25 || pct === 75) {
    const pool = [20, 40, 60, 80, 100, 120, 200];
    return pool[rand(0, pool.length - 1)];
  }
  if (pct === 50) return rand(1, 10) * 20;  // 20–200, mult-of-2 ✓
  return rand(1, 10) * 10;                  // 10–100, mult-of-10 ✓ (for 10% and 20%)
}

let _seq = 0;
function uid(): string { return `pct-${Date.now()}-${++_seq}`; }

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

// ── level generators ─────────────────────────────────────────────────────────

function genLevel1(): MathQuestion {
  const pct   = NICE_PERCENTS[1][rand(0, NICE_PERCENTS[1].length - 1)];
  const whole = pickWhole(1, pct);
  const answer = (pct / 100) * whole;
  const onePercent = whole / 100;

  return {
    id: uid(), difficulty: 1,
    text: `כמה זה ${pct}% מ-${whole}?`,
    answer,
    hint: `כדי למצוא ${pct}% מ-${whole}: ${whole} × ${pct} ÷ 100`,
    unit: "",
    fullSolution: [
      `שלב 1: מצא 1% מ-${whole} — ${whole} ÷ 100 = ${fmt(onePercent)}`,
      `שלב 2: כפול ב-${pct} (מספר האחוזים) — ${fmt(onePercent)} × ${pct} = ${fmt(answer)}`,
      `✅ תשובה: ${fmt(answer)}`,
    ],
  };
}

function genLevel2(): MathQuestion {
  const pct   = NICE_PERCENTS[2][rand(0, NICE_PERCENTS[2].length - 1)];
  const whole = pickWhole(2, pct);
  const part  = (pct / 100) * whole;
  const onePercent = part / pct;

  return {
    id: uid(), difficulty: 2,
    text: `${fmt(part)} הוא ${pct}% מ-כמה?`,
    answer: whole,
    hint: `אם ${fmt(part)} הוא ${pct}%, אז השלם הוא: ${fmt(part)} ÷ ${pct} × 100`,
    unit: "",
    fullSolution: [
      `שלב 1: ${fmt(part)} הוא ${pct}%, לכן 1% שווה — ${fmt(part)} ÷ ${pct} = ${fmt(onePercent)}`,
      `שלב 2: כפול ב-100 כדי לקבל את השלם (100%) — ${fmt(onePercent)} × 100 = ${fmt(whole)}`,
      `✅ תשובה: ${fmt(whole)}`,
    ],
  };
}

function genLevel3(): MathQuestion {
  const pct   = NICE_PERCENTS[3][rand(0, NICE_PERCENTS[3].length - 1)];
  const whole = pickWhole(3, pct);
  const part  = (pct / 100) * whole;
  const ratio = part / whole;

  return {
    id: uid(), difficulty: 3,
    text: `כמה אחוזים זה ${fmt(part)} מתוך ${whole}?`,
    answer: pct,
    hint: `חשב: (${fmt(part)} ÷ ${whole}) × 100`,
    unit: "%",
    fullSolution: [
      `שלב 1: חלק את החלק בשלם — ${fmt(part)} ÷ ${whole} = ${fmt(ratio)}`,
      `שלב 2: כפול ב-100 כדי להפוך לאחוזים — ${fmt(ratio)} × 100 = ${pct}`,
      `✅ תשובה: ${pct}%`,
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
