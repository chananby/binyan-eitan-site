/**
 * Percentages Question Engine
 * Bar-Ilan Math Program — Gifted Students (Grades 5–6)
 *
 * Level 1 — Direct:       "כמה זה X% מ-Y?"              (find X% of Y)
 * Level 2 — Reverse:      "Y הוא X% מ-כמה?"             (find the whole)
 * Level 3 — Rate:         "כמה אחוז זה X מתוך Y?"        (find the percent)
 * Level 4 — Change:       "Y עלה ב-X%. מה הוא עכשיו?"    (percentage increase/decrease)
 * Level 5 — Find original:"אחרי הנחה/עלייה של X% המחיר הוא Z. מה המחיר המקורי?"
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
  4: [10, 20, 25, 50],
  5: [20, 25, 50],
};

// pct-aware: ensures (pct/100)*whole is always a whole number
function pickWhole(level: Difficulty, pct: number): number {
  if (level === 1) {
    if (pct === 25 || pct === 75) {
      const pool = [20, 40, 60, 80];
      return pool[rand(0, pool.length - 1)];
    }
    return rand(1, 9) * 10;
  }
  if (level === 2) return rand(1, 8) * 20;
  if (level === 3) {
    if (pct === 25 || pct === 75) {
      const pool = [20, 40, 60, 80, 100, 120, 200];
      return pool[rand(0, pool.length - 1)];
    }
    if (pct === 50) return rand(1, 10) * 20;
    return rand(1, 10) * 10;
  }
  // level 4/5: pick whole that gives integer result after pct/100
  if (pct === 25) {
    const pool = [40, 60, 80, 100, 120, 200];
    return pool[rand(0, pool.length - 1)];
  }
  if (pct === 50) return rand(2, 10) * 20;
  if (pct === 20) return rand(1, 9) * 5 * 2;  // mult-of-5
  return rand(1, 10) * 10;
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

function genLevel4(): MathQuestion {
  const pct   = NICE_PERCENTS[4][rand(0, NICE_PERCENTS[4].length - 1)];
  const whole = pickWhole(4, pct);
  const change = (pct / 100) * whole;
  const isIncrease = rand(0, 1) === 1;
  const answer = isIncrease ? whole + change : whole - change;
  const verb   = isIncrease ? "עלה" : "ירד";
  const dir    = isIncrease ? "+" : "−";

  return {
    id: uid(), difficulty: 4,
    text: `ערך של ${whole} ₪ ${verb} ב-${pct}%.\nמה הערך החדש?`,
    answer,
    hint: `מצא ${pct}% מ-${whole} ואז ${dir}`,
    unit: "₪",
    fullSolution: [
      `שלב 1: חשב ${pct}% מ-${whole} — ${whole} × ${pct} ÷ 100 = ${fmt(change)}`,
      `שלב 2: הוסף/חסר — ${whole} ${dir} ${fmt(change)} = ${fmt(answer)}`,
      `✅ תשובה: ${fmt(answer)} ₪`,
    ],
  };
}

function genLevel5(): MathQuestion {
  const pct = NICE_PERCENTS[5][rand(0, NICE_PERCENTS[5].length - 1)];
  // Build from original price → discounted price, ask to find original
  // Ensure integer answers: pct=20→mult-of-5; pct=25→mult-of-4; pct=50→any
  let original: number;
  if (pct === 20) original = rand(2, 10) * 5;       // 10..50
  else if (pct === 25) original = rand(2, 8) * 4;   // 8..32 → * 10 for realism
  else original = rand(2, 10) * 10;                 // pct=50

  if (pct === 25) original *= 10;  // scale up (e.g. 40→400 → unrealistic), let's use 20..80
  if (pct === 20) original = rand(1, 9) * 10;       // 10..90
  if (pct === 25) original = rand(2, 8) * 20;       // 40..160

  const discounted = original * (1 - pct / 100);
  const isDiscount = rand(0, 1) === 1;

  if (isDiscount) {
    return {
      id: uid(), difficulty: 5,
      text: `לאחר הנחה של ${pct}% המחיר הוא ${fmt(discounted)} ₪.\nמה היה המחיר המקורי?`,
      answer: original,
      hint: `אם ${pct}% הנחה נשארים ${100 - pct}% מהמחיר המקורי`,
      unit: "₪",
      fullSolution: [
        `לאחר הנחה של ${pct}% נשאר ${100 - pct}% מהמחיר המקורי`,
        `${100 - pct}% = ${fmt(discounted)} ₪`,
        `1% = ${fmt(discounted)} ÷ ${100 - pct} = ${fmt(discounted / (100 - pct))}`,
        `100% (מחיר מקורי) = ${fmt(discounted / (100 - pct))} × 100 = ${fmt(original)} ₪`,
        `✅ תשובה: ${fmt(original)} ₪`,
      ],
    };
  } else {
    // Find original before increase
    const increased = original * (1 + pct / 100);
    return {
      id: uid(), difficulty: 5,
      text: `לאחר עלייה של ${pct}% הערך הוא ${fmt(increased)} ₪.\nמה היה הערך המקורי?`,
      answer: original,
      hint: `אם ${pct}% עלייה, הערך החדש הוא ${100 + pct}% מהמקורי`,
      unit: "₪",
      fullSolution: [
        `לאחר עלייה של ${pct}% הערך החדש הוא ${100 + pct}% מהמקורי`,
        `${100 + pct}% = ${fmt(increased)} ₪`,
        `1% = ${fmt(increased)} ÷ ${100 + pct} = ${fmt(increased / (100 + pct))}`,
        `100% (ערך מקורי) = ${fmt(increased / (100 + pct))} × 100 = ${fmt(original)} ₪`,
        `✅ תשובה: ${fmt(original)} ₪`,
      ],
    };
  }
}

// ── public API ────────────────────────────────────────────────────────────────

const generators: Record<Difficulty, () => MathQuestion> = {
  1: genLevel1, 2: genLevel2, 3: genLevel3, 4: genLevel4, 5: genLevel5,
};

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  return generators[difficulty]();
}
