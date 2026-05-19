// Single source of truth for the quizzes hub.
// To add a new quiz: drop a new entry below + create the matching route at
// src/app/he/quizzes/<slug>/page.tsx. The hub picks it up automatically.

export interface QuizEntry {
  slug:        string;   // URL fragment under /he/quizzes/
  title:       string;
  description: string;
  /** Free-form season label shown as a chip (e.g. "פורים", "פסח", "כל השנה"). */
  season?:     string;
  /** Hide from the hub list without deleting the data — useful for off-season. */
  hidden?:     boolean;
}

export const QUIZZES: QuizEntry[] = [
  {
    slug:        "purim",
    title:       "חידון פורים הגדול",
    description: "חידון בשני שלבים — מהבסיס ועד למדרשים העמוקים.",
    season:      "פורים",
  },
];
