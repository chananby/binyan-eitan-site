/**
 * Grade 3 Division Engine — Bar-Ilan Math App
 * ─────────────────────────────────────────────
 * Topics: integer division tables (no remainders).
 *
 * Level 1 — ÷2, ÷3, ÷4, ÷5  (quotient 2–9)
 * Level 2 — ÷6, ÷7, ÷8, ÷9  (quotient 2–9)
 * Level 3 — ÷2–10 (quotient 10–20, larger dividends)
 *
 * All answers are integers — compatible with JuniorKeypad (max 4 digits).
 */

import type { Difficulty, MathQuestion } from "../types";

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeDivision(divisors: number[], quotientMin: number, quotientMax: number, difficulty: Difficulty): MathQuestion {
  const d = pick(divisors);
  const q = randInt(quotientMin, quotientMax);
  const dividend = d * q;

  // Skip-count hint: show d, 2d, … dividend
  const skips = Array.from({ length: q }, (_, i) => (i + 1) * d).join(", ");

  return {
    id: uid(),
    difficulty,
    text: `${dividend} ÷ ${d} = ?`,
    answer: q,
    hint: `ספור בקפיצות של ${d} עד ${dividend}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${dividend} ÷ ${d} — נספור קפיצות של ${d}`,
      `שלב 2: ${skips}`,
      `שלב 3: ספרנו ${q} קפיצות`,
      `✅ תשובה: ${q}`,
    ],
  };
}

// Level 4/5: Division with word-problem context
function makeDivisionWord(divisors: number[], quotientMin: number, quotientMax: number, difficulty: Difficulty): MathQuestion {
  const d        = pick(divisors);
  const q        = randInt(quotientMin, quotientMax);
  const dividend = d * q;
  const items    = pick(["עוגיות", "כדורים", "ספרים", "תפוחים", "מחברות"]);
  const kids     = pick(["ילדים", "חברים", "תלמידים", "קבוצות"]);

  return {
    id: uid(), difficulty,
    text: `יש ${dividend} ${items}.\nחילקו אותם בשווה ל-${d} ${kids}.\nכמה ${items} לכל ${kids.slice(0, -1)}?`,
    answer: q,
    hint: `${dividend} ÷ ${d} = ?`,
    unit: items,
    fullSolution: [
      `${dividend} ÷ ${d} = ${q}`,
      `לכל ${kids.slice(0, -1)} יש ${q} ${items}`,
      `✅ תשובה: ${q}`,
    ],
  };
}

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 1) return makeDivision([2, 3, 4, 5], 2, 9, 1);
  if (difficulty === 2) return makeDivision([6, 7, 8, 9], 2, 9, 2);
  if (difficulty === 3) return makeDivision([2, 3, 4, 5, 6, 7, 8, 9, 10], 10, 20, 3);
  if (difficulty === 4) return makeDivisionWord([2, 3, 4, 5, 6], 5, 15, 4);
  // difficulty === 5
  return makeDivisionWord([6, 7, 8, 9, 10], 10, 25, 5);
}
