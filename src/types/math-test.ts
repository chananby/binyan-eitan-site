// Types for Bar-Ilan (and future) math test definitions and attempts

// ── Test definition (from JSON) ───────────────────────────────────────────────

export interface TestOption {
  label: string; // "א" | "ב" | "ג" | "ד"
  text: string;
}

export interface TestQuestion {
  id: string;             // "q1" … "q30"
  number: number;
  topic: string;          // machine key, e.g. "order_of_operations"
  topic_he: string;       // "סדר פעולות חשבון"
  question_he: string;
  options: TestOption[];
  correct_answer: string; // "א" | "ב" | "ג" | "ד"
  explanation_he: string;
}

export interface TestSection {
  id: string;
  name_he: string;
  questions: TestQuestion[];
}

export interface TestDefinition {
  id: string;
  slug: string;
  name_he: string;
  name_en: string;
  description_he: string;
  duration_seconds: number;
  official_question_count: number;
  bank_question_count: number;
  passing_threshold_percentage: number;
  instructions_he: string[];
  topics_covered_he: string[];
  sections: TestSection[];
}

export interface TestFile {
  test: TestDefinition;
}

// ── Attempt (matches DB schema) ───────────────────────────────────────────────

export type AttemptStatus = "in_progress" | "completed" | "abandoned";

export type Answers = Record<string, string>; // { "q1": "א", "q16": "ג" }

export interface TopicBreakdown {
  [topic: string]: { correct: number; total: number };
}

export interface TestAttempt {
  id: string;
  sync_key: string;
  test_slug: string;
  test_name?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  total_questions: number;
  answered_count: number;
  correct_count?: number;
  score_percentage?: number;
  status: AttemptStatus;
  answers: Answers;
  topic_breakdown?: TopicBreakdown;
  question_ids: string[];
  is_simulation: boolean;
  created_at: string;
  updated_at: string;
}

// ── Progress summary (matches DB view) ───────────────────────────────────────

export interface TestProgress {
  sync_key: string;
  test_slug: string;
  attempts_completed: number;
  attempts_in_progress: number;
  best_score: number | null;
  avg_score: number | null;
  last_attempt_at: string | null;
  first_attempt_at: string | null;
}
