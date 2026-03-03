/**
 * Grade 3 Junior Engine — Bar-Ilan Math App
 * ─────────────────────────────────────────
 * Topics: multiplication tables (×1–10), basic fractions (½, ¼, ¾),
 *         square perimeters (forward + reverse).
 *
 * Level 1 — Foundations : tables 1,2,5 · halves · small squares
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

// ── Multiplication ─────────────────────────────────────────────────────────────

function makeMultiplication(tables: number[], difficulty: Difficulty): MathQuestion {
  const a = pick(tables);
  const b = randInt(1, 10);
  const answer = a * b;

  // Build a skip-count hint string: e.g. 3,6,9,...
  const skips = Array.from({ length: a }, (_, i) => (i + 1) * b).join(", ");

  return {
    id: uid(),
    difficulty,
    text: `${a} × ${b} = ?`,
    answer,
    hint: `כפל ${a} ב-${b}`,
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

type QType = "mult" | "frac" | "peri";

// ── Main generator ────────────────────────────────────────────────────────────

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 1) {
    const type = pick<QType>(["mult", "mult", "frac", "peri"]);
    if (type === "mult") return makeMultiplication([1, 2, 5], 1);
    if (type === "frac") return makeHalf([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], 1);
    return makeSquarePerimeter([2, 3, 4, 5, 6], 1);
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
