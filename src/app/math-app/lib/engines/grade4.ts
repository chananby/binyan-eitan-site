/**
 * Grade 4 Engine — Bar-Ilan Math App
 * ────────────────────────────────────
 * Topics: multi-digit multiplication, area and perimeter of a rectangle.
 *
 * Level 1 — 2-digit × 1-digit (12–49 × 2–9)  +  rectangle area (small dims)
 * Level 2 — 3-digit × 1-digit (100–499 × 2–9) +  rectangle area + perimeter (medium)
 * Level 3 — 2-digit × 2-digit (12–49 × 11–29) +  rectangle area + perimeter (larger)
 *
 * All answers are integers — compatible with JuniorKeypad (max 4 digits).
 * Max possible: 49 × 29 = 1421  ✓
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

// ── 2-digit × 1-digit ────────────────────────────────────────────────────────

function makeMult2x1(difficulty: Difficulty): MathQuestion {
  const a = randInt(12, 49);
  const b = randInt(2, 9);
  const answer = a * b;

  const aT = Math.floor(a / 10) * 10;
  const aO = a % 10;

  return {
    id: uid(),
    difficulty,
    text: `${a} × ${b} = ?`,
    answer,
    hint: `פרק לעשרות: ${aT} × ${b} + ${aO} × ${b}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${aT} × ${b} = ${aT * b}`,
      `שלב 2: ${aO} × ${b} = ${aO * b}`,
      `שלב 3: ${aT * b} + ${aO * b} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── 3-digit × 1-digit ────────────────────────────────────────────────────────

function makeMult3x1(difficulty: Difficulty): MathQuestion {
  const a = randInt(100, 499);
  const b = randInt(2, 9);
  const answer = a * b;

  const aH = Math.floor(a / 100) * 100;
  const aTens = Math.floor((a % 100) / 10) * 10;
  const aO = a % 10;

  return {
    id: uid(),
    difficulty,
    text: `${a} × ${b} = ?`,
    answer,
    hint: `פרק: מאות × ${b}, עשרות × ${b}, אחדות × ${b}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${aH} × ${b} = ${aH * b}`,
      `שלב 2: ${aTens} × ${b} = ${aTens * b}`,
      `שלב 3: ${aO} × ${b} = ${aO * b}`,
      `שלב 4: ${aH * b} + ${aTens * b} + ${aO * b} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── 2-digit × 2-digit ────────────────────────────────────────────────────────

function makeMult2x2(difficulty: Difficulty): MathQuestion {
  const a = randInt(12, 49);
  const b = randInt(11, 29);
  const answer = a * b;

  const bT = Math.floor(b / 10) * 10;
  const bO = b % 10;

  return {
    id: uid(),
    difficulty,
    text: `${a} × ${b} = ?`,
    answer,
    hint: `פרק: ${a} × ${bT} + ${a} × ${bO}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${a} × ${bT} = ${a * bT}`,
      `שלב 2: ${a} × ${bO} = ${a * bO}`,
      `שלב 3: ${a * bT} + ${a * bO} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Rectangle area ────────────────────────────────────────────────────────────

function makeRectArea(aMin: number, aMax: number, bMin: number, bMax: number, difficulty: Difficulty): MathQuestion {
  const a = randInt(aMin, aMax);
  const b = randInt(bMin, bMax);
  const answer = a * b;

  return {
    id: uid(),
    difficulty,
    text: `מלבן ${a} ס״מ × ${b} ס״מ — מה השטח?`,
    answer,
    hint: `שטח מלבן = אורך × רוחב`,
    unit: `ס״מ²`,
    fullSolution: [
      `שלב 1: שטח מלבן = אורך × רוחב`,
      `שלב 2: ${a} × ${b} = ${answer}`,
      `✅ תשובה: ${answer} ס״מ²`,
    ],
  };
}

// ── Rectangle perimeter ───────────────────────────────────────────────────────

function makeRectPerimeter(aMin: number, aMax: number, bMin: number, bMax: number, difficulty: Difficulty): MathQuestion {
  const a = randInt(aMin, aMax);
  const b = randInt(bMin, bMax);
  const answer = 2 * (a + b);

  return {
    id: uid(),
    difficulty,
    text: `מלבן ${a} ס״מ × ${b} ס״מ — מה ההיקף?`,
    answer,
    hint: `היקף מלבן = 2 × (אורך + רוחב)`,
    unit: `ס״מ`,
    fullSolution: [
      `שלב 1: היקף מלבן = 2 × (אורך + רוחב)`,
      `שלב 2: 2 × (${a} + ${b}) = 2 × ${a + b} = ${answer}`,
      `✅ תשובה: ${answer} ס״מ`,
    ],
  };
}

// ── Area from perimeter (Level 4) ────────────────────────────────────────────

function makeAreaFromPerim(difficulty: Difficulty): MathQuestion {
  const a = randInt(4, 12);
  const b = randInt(3, a - 1);
  const perim  = 2 * (a + b);
  const answer = a * b;
  return {
    id: uid(), difficulty,
    text: `היקף המלבן ${perim} ס״מ, אורך ${a} ס״מ.\nמה השטח?`,
    answer, hint: `מצא קודם את הרוחב (היקף ÷ 2 − אורך)`,
    unit: "ס״מ²",
    fullSolution: [
      `שלב 1: חצי היקף = ${perim} ÷ 2 = ${perim / 2}`,
      `שלב 2: רוחב = ${perim / 2} − ${a} = ${b}`,
      `שלב 3: שטח = ${a} × ${b} = ${answer}`,
      `✅ תשובה: ${answer} ס״מ²`,
    ],
  };
}

// ── 3-digit × 2-digit (Level 5) ──────────────────────────────────────────────

function makeMult3x2(difficulty: Difficulty): MathQuestion {
  const a = randInt(101, 299);
  const b = randInt(11, 19);
  const answer = a * b;
  const bT = Math.floor(b / 10) * 10;
  const bO = b % 10;
  return {
    id: uid(), difficulty,
    text: `${a} × ${b} = ?`,
    answer, hint: `פרק: ${a} × ${bT} + ${a} × ${bO}`,
    unit: "",
    fullSolution: [
      `שלב 1: ${a} × ${bT} = ${a * bT}`,
      `שלב 2: ${a} × ${bO} = ${a * bO}`,
      `שלב 3: ${a * bT} + ${a * bO} = ${answer}`,
      `✅ תשובה: ${answer}`,
    ],
  };
}

// ── Combined area+perimeter word problem (Level 5) ────────────────────────────

function makeAreaPeriWord(difficulty: Difficulty): MathQuestion {
  const a = randInt(5, 12);
  const b = randInt(3, a - 1);
  const area  = a * b;
  const perim = 2 * (a + b);
  const which = randInt(0, 1);
  if (which === 0) {
    return {
      id: uid(), difficulty,
      text: `שדה בצורת מלבן: ${a} מ' × ${b} מ'.\nכמה מטרים גידור צריך להקיף אותו?`,
      answer: perim, hint: `היקף = 2 × (אורך + רוחב)`, unit: "מ'",
      fullSolution: [
        `2 × (${a} + ${b}) = 2 × ${a + b} = ${perim}`,
        `✅ תשובה: ${perim} מ'`,
      ],
    };
  }
  return {
    id: uid(), difficulty,
    text: `שדה בצורת מלבן: ${a} מ' × ${b} מ'.\nכמה מ"ר שטח יש?`,
    answer: area, hint: `שטח = אורך × רוחב`, unit: "מ\"ר",
    fullSolution: [
      `${a} × ${b} = ${area}`,
      `✅ תשובה: ${area} מ"ר`,
    ],
  };
}

// ── Main generator ────────────────────────────────────────────────────────────

type QType = "mult" | "area" | "peri";

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 1) {
    const type = pick<QType>(["mult", "mult", "area"]);
    if (type === "mult") return makeMult2x1(1);
    return makeRectArea(2, 9, 2, 9, 1);
  }

  if (difficulty === 2) {
    const type = pick<QType>(["mult", "area", "peri"]);
    if (type === "mult") return makeMult3x1(2);
    if (type === "area") return makeRectArea(4, 15, 3, 12, 2);
    return makeRectPerimeter(4, 15, 3, 12, 2);
  }

  if (difficulty === 3) {
    const type = pick<QType>(["mult", "area", "peri"]);
    if (type === "mult") return makeMult2x2(3);
    if (type === "area") return makeRectArea(6, 20, 5, 18, 3);
    return makeRectPerimeter(6, 20, 5, 18, 3);
  }

  if (difficulty === 4) {
    const type = pick<QType>(["mult", "area", "peri"]);
    if (type === "mult") return makeMult2x2(4);
    if (type === "area") return makeRectArea(8, 25, 6, 20, 4);
    return makeAreaFromPerim(4);
  }

  // difficulty === 5
  const type = pick<QType>(["mult", "area", "peri"]);
  if (type === "mult") return makeMult3x2(5);
  return makeAreaPeriWord(5);
}
