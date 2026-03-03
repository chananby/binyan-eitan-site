/**
 * Percentages Question Engine
 * Bar-Ilan Math Program — Gifted Students (Grades 5–6)
 *
 * Level 1 — Direct:   "כמה זה X% מ-Y?"              (find X% of Y)
 * Level 2 — Reverse:  "Y הוא X% מ-כמה?"             (find the whole)
 * Level 3 — Rate:     "כמה אחוז זה X מתוך Y?"        (find the percent)
 */

export type Difficulty = 1 | 2 | 3;

export interface PercentQuestion {
  id: string;
  difficulty: Difficulty;
  /** Full Hebrew question string */
  text: string;
  /** Correct numerical answer */
  answer: number;
  /** Short Hebrew hint shown after 2 wrong answers */
  hint: string;
  /** Unit label shown next to the answer box ("" | "%") */
  unit: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const NICE_PERCENTS: Record<Difficulty, number[]> = {
  1: [10, 20, 25, 50, 75, 100],
  2: [10, 20, 25, 50],
  3: [10, 20, 25, 50, 75],
};

function pickWhole(level: Difficulty): number {
  if (level === 1) return rand(1, 9) * 10;   // 10–90, multiples of 10
  if (level === 2) return rand(1, 8) * 20;   // 20–160, multiples of 20
  return rand(2, 20) * 5;                     // 10–100, multiples of 5
}

let _seq = 0;
function uid(): string {
  return `q-${Date.now()}-${++_seq}`;
}

// ── level generators ─────────────────────────────────────────────────────────

function genLevel1(): PercentQuestion {
  const pct = NICE_PERCENTS[1][rand(0, NICE_PERCENTS[1].length - 1)];
  const whole = pickWhole(1);
  const answer = (pct / 100) * whole;
  return {
    id: uid(),
    difficulty: 1,
    text: `כמה זה ${pct}% מ-${whole}?`,
    answer,
    hint: `כדי למצוא ${pct}% מ-${whole}, חשב: ${whole} × ${pct} ÷ 100`,
    unit: "",
  };
}

function genLevel2(): PercentQuestion {
  const pct = NICE_PERCENTS[2][rand(0, NICE_PERCENTS[2].length - 1)];
  const whole = pickWhole(2);
  const part = (pct / 100) * whole;
  return {
    id: uid(),
    difficulty: 2,
    text: `${part} הוא ${pct}% מ-כמה?`,
    answer: whole,
    hint: `אם ${part} הוא ${pct}%, אז השלם הוא: ${part} ÷ ${pct} × 100`,
    unit: "",
  };
}

function genLevel3(): PercentQuestion {
  const pct = NICE_PERCENTS[3][rand(0, NICE_PERCENTS[3].length - 1)];
  const whole = pickWhole(3);
  const part = (pct / 100) * whole;
  return {
    id: uid(),
    difficulty: 3,
    text: `כמה אחוזים זה ${part} מתוך ${whole}?`,
    answer: pct,
    hint: `חשב: (${part} ÷ ${whole}) × 100`,
    unit: "%",
  };
}

// ── public API ────────────────────────────────────────────────────────────────

const generators: Record<Difficulty, () => PercentQuestion> = {
  1: genLevel1,
  2: genLevel2,
  3: genLevel3,
};

export function generateQuestion(difficulty: Difficulty): PercentQuestion {
  return generators[difficulty]();
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "בסיסי",
  2: "מתקדם",
  3: "מאתגר",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: "bg-green-100 text-green-700 border-green-300",
  2: "bg-amber-100 text-amber-700 border-amber-300",
  3: "bg-red-100 text-red-700 border-red-300",
};
