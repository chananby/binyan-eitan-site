/**
 * Ratios & Proportions Engine — Bar-Ilan Math App (Senior)
 * ──────────────────────────────────────────────────────────
 * Topics: unit rate, direct proportion, scale maps.
 *
 * Level 1 — Unit rate: "X items cost Y ₪, how much do Z items cost?"
 * Level 2 — Direct proportion: "For every A of X there are B of Y; if C of X, how many Y?"
 * Level 3 — Scale maps: "Scale 1:N, map distance M cm → real distance in meters?"
 *
 * All answers are integers.
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

// ── Level 1: Unit rate ────────────────────────────────────────────────────────

const ITEMS = ["עוגיות", "תפוחים", "בקבוקי מים", "ספרים", "עטים", "שקיות", "אורנג׳ים", "לחמניות"];

function makeUnitRate(difficulty: Difficulty): MathQuestion {
  const item  = pick(ITEMS);
  const qty1  = randInt(2, 8);         // e.g. 4 items
  const price = randInt(2, 9) * qty1;  // price divisible by qty1
  const qty2  = randInt(2, 9) * qty1;  // ask for a multiple, answer is integer
  const unitP = price / qty1;
  const answer = unitP * qty2;

  return {
    id: uid(),
    difficulty,
    text: `${qty1} ${item} עולים ${price} ₪.\nכמה עולים ${qty2} ${item}?`,
    answer,
    hint: `מצא קודם כמה עולה ${item} אחד`,
    unit: "₪",
    fullSolution: [
      `שלב 1: מחיר ל-${item} אחד: ${price} ÷ ${qty1} = ${unitP} ₪`,
      `שלב 2: מחיר ל-${qty2}: ${unitP} × ${qty2} = ${answer} ₪`,
      `✅ תשובה: ${answer} ₪`,
    ],
  };
}

// ── Level 2: Direct proportion ────────────────────────────────────────────────

const PROP_PAIRS: Array<[string, string]> = [
  ["כחולות", "אדומות"],
  ["בנים", "בנות"],
  ["ילדים", "מורים"],
  ["עצים", "פרחים"],
  ["כדורגלנים", "שוערים"],
];

function makeProportion(difficulty: Difficulty): MathQuestion {
  const [xLabel, yLabel] = pick(PROP_PAIRS);
  const a  = randInt(2, 6);   // ratio A : B
  const b  = randInt(2, 8);
  const k  = randInt(2, 7);   // multiply by k
  const bigA  = a * k;        // known big quantity
  const answer = b * k;       // unknown

  return {
    id: uid(),
    difficulty,
    text: `על כל ${a} ${xLabel} יש ${b} ${yLabel}.\nאם יש ${bigA} ${xLabel}, כמה ${yLabel} יש?`,
    answer,
    hint: `מצא כמה פעמים ${a} נמצא ב-${bigA}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${bigA} ÷ ${a} = ${k} (מכפיל היחס)`,
      `שלב 2: ${b} × ${k} = ${answer}`,
      `✅ תשובה: ${answer} ${yLabel}`,
    ],
  };
}

// ── Level 3: Scale maps ───────────────────────────────────────────────────────

function makeScale(difficulty: Difficulty): MathQuestion {
  // Scale 1:N where N is a round number; distance in cm on map → real meters
  const scales = [100, 200, 500, 1000];
  const N      = pick(scales);           // 1 cm = N cm real = N/100 meters
  const mapCm  = randInt(2, 10);
  const realCm = mapCm * N;
  const answer = realCm / 100;          // convert to meters (always integer for chosen N ≥ 100)

  return {
    id: uid(),
    difficulty,
    text: `קנה מידה 1:${N}.\nמרחק על המפה: ${mapCm} ס״מ.\nמה המרחק האמיתי במטרים?`,
    answer,
    hint: `מרחק אמיתי (ס״מ) = מרחק מפה × ${N}`,
    unit: "מ׳",
    fullSolution: [
      `שלב 1: מרחק אמיתי בס״מ = ${mapCm} × ${N} = ${realCm} ס״מ`,
      `שלב 2: המרת ס״מ למטרים: ${realCm} ÷ 100 = ${answer} מ׳`,
      `✅ תשובה: ${answer} מ׳`,
    ],
  };
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 1) return makeUnitRate(1);
  if (difficulty === 2) return makeProportion(2);
  return makeScale(3);
}
