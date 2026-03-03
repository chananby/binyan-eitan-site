/**
 * Shared types for all math engines.
 * Both percentages and fractions engines return MathQuestion.
 */

export type Difficulty = 1 | 2 | 3;

export interface MathQuestion {
  id: string;
  difficulty: Difficulty;
  /** Full Hebrew question string */
  text: string;
  /** Correct numerical answer */
  answer: number;
  /** One-line Hebrew hint (shown on first reveal) */
  hint: string;
  /** Unit label beside the answer display ("" | "%" | …) */
  unit: string;
  /** Step-by-step Hebrew solution shown when hint is triggered */
  fullSolution: string[];
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
