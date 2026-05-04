import type { TestDefinition, TestQuestion, TestFile } from "@/src/types/math-test";
import testData from "@/src/data/math/bar-ilan-test-questions.json";

const def: TestDefinition = (testData as TestFile).test;

export function getTestDefinition(): TestDefinition {
  return def;
}

export function getAllQuestions(): TestQuestion[] {
  return def.sections.flatMap((s) => s.questions);
}

export function getQuestionsByIds(ids: string[]): TestQuestion[] {
  const all = getAllQuestions();
  const map = new Map(all.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter(Boolean) as TestQuestion[];
}

/** Fisher-Yates shuffle — returns a new array, does not mutate input */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns `count` randomly selected question IDs from each section,
 * proportional to section size. Preserves section order within result.
 * For Bar-Ilan: 30-question bank → 24 selected (12 from each section of 15).
 */
export function pickSimulationQuestions(count: number): string[] {
  const sections = def.sections;
  const totalBank = def.bank_question_count;
  const result: string[] = [];

  for (const section of sections) {
    const sectionFraction = section.questions.length / totalBank;
    const pick = Math.round(count * sectionFraction);
    const selected = shuffle(section.questions).slice(0, pick);
    result.push(...selected.map((q) => q.id));
  }

  // Edge: rounding may give count±1 — trim or pad from last section
  while (result.length > count) result.pop();

  return result;
}
