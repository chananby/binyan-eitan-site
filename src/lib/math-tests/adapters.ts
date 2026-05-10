import type { PracticeQuestion, TestQuestion } from "@/src/types/math-test";

/** Wraps a PracticeQuestion with a display index so it satisfies TestQuestion for QuestionCard. */
export function toTestQuestion(q: PracticeQuestion, displayIndex: number): TestQuestion {
  return { ...q, number: displayIndex + 1 };
}
