/**
 * Ratios & Proportions Engine — Bar-Ilan Math App (Senior)
 * ──────────────────────────────────────────────────────────
 * Level 1 — Unit rate: "X items cost Y ₪, how much do Z items cost?"
 * Level 2 — Direct proportion: "For every A of X there are B of Y; if C of X, how many Y?"
 * Level 3 — Scale maps: "Scale 1:N, map distance M cm → real distance in meters?"
 * Level 4 — Three-part ratio: "Ratio A:B, total N — how many of A?"
 * Level 5 — Inverse proportion: "X workers finish in Y days — how many days for Z workers?"
 *
 * All answers are integers.
 */

import type { Difficulty, MathQuestion } from "../types";

function uid(): string { return Math.random().toString(36).slice(2, 9); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Level 1: Unit rate ────────────────────────────────────────────────────────

const ITEMS = ["עוגיות", "תפוחים", "בקבוקי מים", "ספרים", "עטים", "שקיות", "אורנג׳ים", "לחמניות"];

function makeUnitRate(difficulty: Difficulty): MathQuestion {
  const item  = pick(ITEMS);
  const qty1  = randInt(2, 8);
  const price = randInt(2, 9) * qty1;
  const qty2  = randInt(2, 9) * qty1;
  const unitP = price / qty1;
  const answer = unitP * qty2;

  return {
    id: uid(), difficulty,
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
  const a  = randInt(2, 6);
  const b  = randInt(2, 8);
  const k  = randInt(2, 7);
  const bigA  = a * k;
  const answer = b * k;

  return {
    id: uid(), difficulty,
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
  const scales = [100, 200, 500, 1000];
  const N      = pick(scales);
  const mapCm  = randInt(2, 10);
  const realCm = mapCm * N;
  const answer = realCm / 100;

  return {
    id: uid(), difficulty,
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

// ── Level 4: Three-part ratio ─────────────────────────────────────────────────

const CLASS_CONTEXTS: Array<{ label: string; partA: string; partB: string }> = [
  { label: "תלמידים", partA: "בנים", partB: "בנות" },
  { label: "פרחים", partA: "אדומים", partB: "צהובים" },
  { label: "כדורים", partA: "כחולים", partB: "ירוקים" },
  { label: "מיצים", partA: "תפוז", partB: "תפוח" },
];

function makeThreePartRatio(difficulty: Difficulty): MathQuestion {
  const ctx  = pick(CLASS_CONTEXTS);
  const a    = randInt(1, 5);   // ratio A parts
  const b    = randInt(1, 5);   // ratio B parts
  const k    = randInt(2, 6);   // multiplier
  const total = (a + b) * k;
  const answerA = a * k;

  return {
    id: uid(), difficulty,
    text: `יחס ${ctx.partA} ל${ctx.partB} הוא ${a}:${b}.\nיש בסך הכל ${total} ${ctx.label}.\nכמה ${ctx.partA} יש?`,
    answer: answerA,
    hint: `חלק ${total} ל-${a + b} חלקים שווים, ואז קח ${a} חלקים`,
    unit: ctx.partA,
    fullSolution: [
      `שלב 1: סה"כ חלקי יחס: ${a} + ${b} = ${a + b}`,
      `שלב 2: גודל חלק אחד: ${total} ÷ ${a + b} = ${k}`,
      `שלב 3: מספר ${ctx.partA}: ${a} × ${k} = ${answerA}`,
      `✅ תשובה: ${answerA} ${ctx.partA}`,
    ],
  };
}

// ── Level 5: Inverse proportion ───────────────────────────────────────────────

const WORK_CONTEXTS = [
  { workers: "פועלים", task: "לבנות גדר" },
  { workers: "עובדים", task: "לצבוע חדר" },
  { workers: "חברות", task: "לסיים פרויקט" },
  { workers: "מכונות", task: "לייצר אצווה" },
];

function makeInverseProportion(difficulty: Difficulty): MathQuestion {
  const ctx = pick(WORK_CONTEXTS);
  // Choose x1,y1 such that x1*y1 has several integer divisors for z
  const pairs: [number, number][] = [
    [2, 6], [3, 4], [4, 6], [2, 8], [3, 6], [4, 8], [6, 4], [3, 8],
  ];
  const [x1, y1] = pick(pairs);
  const product = x1 * y1; // total work units
  // Pick z ≠ x1 that divides product
  const divisors = [];
  for (let d = 1; d <= product; d++) {
    if (product % d === 0 && d !== x1 && d >= 2 && d <= 12) divisors.push(d);
  }
  if (divisors.length === 0) {
    // fallback
    return makeThreePartRatio(difficulty);
  }
  const z  = pick(divisors);
  const answer = product / z;

  return {
    id: uid(), difficulty,
    text: `${x1} ${ctx.workers} יכולים ${ctx.task} ב-${y1} ימים.\nבכמה ימים יסיימו ${z} ${ctx.workers}?`,
    answer,
    hint: `חשב כמה "ימי-עבודה" יש בסך הכל (${x1} × ${y1}), וחלק ב-${z}`,
    unit: "ימים",
    fullSolution: [
      `שלב 1: סה"כ ימי-עבודה: ${x1} × ${y1} = ${product}`,
      `שלב 2: עם ${z} ${ctx.workers}: ${product} ÷ ${z} = ${answer} ימים`,
      `✅ תשובה: ${answer} ימים`,
    ],
  };
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateQuestion(difficulty: Difficulty): MathQuestion {
  if (difficulty === 1) return makeUnitRate(1);
  if (difficulty === 2) return makeProportion(2);
  if (difficulty === 3) return makeScale(3);
  if (difficulty === 4) return makeThreePartRatio(4);
  return makeInverseProportion(5);
}
