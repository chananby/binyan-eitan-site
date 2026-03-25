/**
 * Grade 3 Junior Engine — Bar-Ilan Math App
 * ─────────────────────────────────────────
 * Topics: addition/subtraction (≤100), multiplication tables (×1–10),
 *         basic fractions (½, ¼, ¾), square perimeters (forward + reverse).
 *
 * Level 1 — Foundations : addition/subtraction · tables 1,2,3,4,5 · halves
 * Level 2 — Building    : tables 3,4,6 · quarters · bigger squares
 * Level 3 — Challenge   : tables 7,8,9,10 · ¾ · reverse-perimeter
 */

import type { Difficulty, MathQuestion } from "../types";

// ── helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Addition ──────────────────────────────────────────────────────────────────

function makeAddition(difficulty: Difficulty): MathQuestion {
  // L1: two-digit + one/two-digit, sum ≤ 100
  const a = randInt(10, 50);
  const b = randInt(5, Math.min(20, 100 - a));
  const answer = a + b;

  // Decompose tens and ones for hint
  const aT = Math.floor(a / 10) * 10;
  const aO = a % 10;
  const bT = Math.floor(b / 10) * 10;
  const bO = b % 10;
  const tensSum  = aT + bT;
  const onesSum  = aO + bO;

  return {
    id: uid(),
    difficulty,
    text: `${a} + ${b} = ?`,
    answer,
    hint: `פרק לעשרות ואחדות`,
    unit: "",
    fullSolution: [
      `שלב 1: פרק לעשרות: ${aT} + ${bT} = ${tensSum}`,
      `שלב 2: פרק לאחדות: ${aO} + ${bO} = ${onesSum}`,
      `שלב 3: ${tensSum} + ${onesSum} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Subtraction ───────────────────────────────────────────────────────────────

function makeSubtraction(difficulty: Difficulty): MathQuestion {
  const a = randInt(20, 80);
  const b = randInt(5, Math.min(30, a - 1));
  const answer = a - b;

  const aT = Math.floor(a / 10) * 10;
  const aO = a % 10;
  const bRound = Math.floor(b / 10) * 10;

  return {
    id: uid(),
    difficulty,
    text: `${a} − ${b} = ?`,
    answer,
    hint: `הפחת עשרות קודם`,
    unit: "",
    fullSolution: [
      `שלב 1: הפחת עשרות: ${a} − ${bRound} = ${a - bRound}`,
      `שלב 2: הפחת שארית: ${a - bRound} − ${b - bRound} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Multiplication ─────────────────────────────────────────────────────────────

function makeMultiplication(tables: number[], difficulty: Difficulty): MathQuestion {
  const a = pick(tables);
  const b = randInt(1, 10);
  const answer = a * b;

  // Skip-count hint: show b, 2b, 3b, … a×b
  const skips = Array.from({ length: a }, (_, i) => (i + 1) * b).join(", ");

  return {
    id: uid(),
    difficulty,
    text: `${a} × ${b} = ?`,
    answer,
    hint: `ספור בקפיצות של ${b}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${a} × ${b} — נספור ${a} קפיצות של ${b}`,
      `שלב 2: ${skips}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Half (½) ──────────────────────────────────────────────────────────────────

function makeHalf(nums: number[], difficulty: Difficulty): MathQuestion {
  const x = pick(nums);
  const answer = x / 2;
  return {
    id: uid(),
    difficulty,
    text: `½ מ-${x} = ?`,
    answer,
    hint: `חלק ${x} ב-2`,
    unit: "",
    fullSolution: [
      `שלב 1: מחצית (½) = לחלק ב-2`,
      `שלב 2: ${x} ÷ 2 = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Quarter (¼) ───────────────────────────────────────────────────────────────

function makeQuarter(nums: number[], difficulty: Difficulty): MathQuestion {
  const x = pick(nums);
  const answer = x / 4;
  return {
    id: uid(),
    difficulty,
    text: `¼ מ-${x} = ?`,
    answer,
    hint: `חלק ${x} ב-4`,
    unit: "",
    fullSolution: [
      `שלב 1: רבע (¼) = לחלק ב-4`,
      `שלב 2: ${x} ÷ 4 = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Three-quarters (¾) ────────────────────────────────────────────────────────

function makeThreeQuarters(nums: number[], difficulty: Difficulty): MathQuestion {
  const x = pick(nums);
  const quarter = x / 4;
  const answer  = quarter * 3;
  return {
    id: uid(),
    difficulty,
    text: `¾ מ-${x} = ?`,
    answer,
    hint: `מצא ¼ ואז כפול ב-3`,
    unit: "",
    fullSolution: [
      `שלב 1: מצא ¼ מ-${x}: ${x} ÷ 4 = ${quarter}`,
      `שלב 2: כפול ב-3: ${quarter} × 3 = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Square perimeter (find perimeter) ────────────────────────────────────────

function makeSquarePerimeter(sides: number[], difficulty: Difficulty): MathQuestion {
  const s = pick(sides);
  const answer = 4 * s;
  return {
    id: uid(),
    difficulty,
    text: `ריבוע עם צלע ${s} ס״מ — מה ההיקף?`,
    answer,
    hint: `היקף ריבוע = 4 × צלע`,
    unit: `ס״מ`,
    fullSolution: [
      `שלב 1: היקף ריבוע = 4 × צלע`,
      `שלב 2: 4 × ${s} = ${answer}`,
      `✅ תשובה: ${answer} ס״מ`,
    ],
  };
}

// ── Square perimeter (find side from perimeter) ───────────────────────────────

function makeReversePerimeter(perims: number[], difficulty: Difficulty): MathQuestion {
  const p = pick(perims);
  const s = p / 4;
  return {
    id: uid(),
    difficulty,
    text: `היקף ריבוע הוא ${p} ס״מ — מה אורך הצלע?`,
    answer: s,
    hint: `צלע = היקף ÷ 4`,
    unit: `ס״מ`,
    fullSolution: [
      `שלב 1: היקף = 4 × צלע`,
      `שלב 2: צלע = היקף ÷ 4 = ${p} ÷ 4 = ${s}`,
      `✅ תשובה: ${s} ס״מ`,
    ],
  };
}

// ── Question type union ───────────────────────────────────────────────────────

type QType = "add" | "sub" | "mult" | "frac" | "peri";

// ── Main generator ────────────────────────────────────────────────────────────

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 1) {
    // Weighted: mostly arithmetic + tables 1-5, some fractions
    const type = pick<QType>(["add", "add", "add", "sub", "sub", "mult", "mult", "frac"]);
    if (type === "add")  return makeAddition(1);
    if (type === "sub")  return makeSubtraction(1);
    if (type === "mult") return makeMultiplication([1, 2, 3, 4, 5], 1);
    return makeHalf([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], 1);
  }

  if (difficulty === 2) {
    const type = pick<QType>(["mult", "mult", "frac", "peri"]);
    if (type === "mult") return makeMultiplication([3, 4, 6], 2);
    if (type === "frac") return makeQuarter([4, 8, 12, 16, 20, 24, 28, 32], 2);
    return makeSquarePerimeter([7, 8, 9, 10, 11, 12], 2);
  }

  // difficulty === 3
  const type = pick<QType>(["mult", "mult", "frac", "peri"]);
  if (type === "mult") return makeMultiplication([7, 8, 9, 10], 3);
  if (type === "frac") return makeThreeQuarters([4, 8, 12, 16, 20, 24, 28, 32], 3);
  return makeReversePerimeter([8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48], 3);
}
