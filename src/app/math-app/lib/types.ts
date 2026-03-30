/**
 * Shared types for all math engines and the profile/storage layer.
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface MathQuestion {
  id: string;
  difficulty: Difficulty;
  text: string;
  answer: number;
  hint: string;
  unit: string;
  fullSolution: string[];
}

/** Per-topic accumulated stats (stored inside StoredStats.topicStats) */
export interface TopicStats {
  highestLevel: Difficulty;
  totalCorrect: number;
  totalWrong: number;
  pointsTotal: number;
  lastPlayed: string; // ISO date string
}

export const EMPTY_TOPIC_STATS: TopicStats = {
  highestLevel: 1, totalCorrect: 0, totalWrong: 0,
  pointsTotal: 0, lastPlayed: "",
};

/** Cumulative stats for one user profile (persisted) */
export interface StoredStats {
  totalCorrect: number;
  totalWrong: number;
  highestLevel: Difficulty;
  sessionsPlayed: number;
  pointsTotal: number;
  lastPlayed: string;   // ISO date string
  /** Per-topic breakdown — keyed by topic.id */
  topicStats?: Record<string, TopicStats>;
}

export const EMPTY_STATS: StoredStats = {
  totalCorrect: 0, totalWrong: 0,
  highestLevel: 1, sessionsPlayed: 0,
  pointsTotal: 0, lastPlayed: "",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "בסיסי",
  2: "מתקדם",
  3: "מאתגר",
  4: "מומחה",
  5: "אלוף",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: "bg-green-100 text-green-700 border-green-300",
  2: "bg-amber-100 text-amber-700 border-amber-300",
  3: "bg-red-100 text-red-700 border-red-300",
  4: "bg-purple-100 text-purple-700 border-purple-300",
  5: "bg-yellow-100 text-yellow-800 border-yellow-400",
};
