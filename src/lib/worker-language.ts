// Pure helper for the admin-side language badge.
//
// Worker-facing translations + autonyms live in
// src/app/components/attendance/i18n.ts and are CLIENT-SIDE only — we
// don't import that into the admin tabs because we want a tiny, server-
// or client-safe lookup with a flag glyph and a 2-letter code (the
// autonym strings in i18n.ts are useful in the worker picker but too
// long for a row-level chip).
//
// The set of codes here MUST stay in lockstep with SUPPORTED_LANGS in
// i18n.ts and the VALID_LANGS allow-list in /api/worker/lang-pref +
// /api/admin/staff/[id] PATCH.

export type WorkerLangCode = "he" | "en" | "ru" | "si" | "zh" | "hi";

export const WORKER_LANG_FLAGS: Record<WorkerLangCode, string> = {
  he: "🇮🇱",
  en: "🇬🇧",
  ru: "🇷🇺",
  si: "🇱🇰",
  zh: "🇨🇳",
  hi: "🇮🇳",
};

// Hebrew name for each language — used as the title attr / tooltip so the
// admin doesn't have to memorise codes. Kept here (and not in i18n.ts) so
// the admin chrome is fully Hebrew regardless of any worker-side state.
export const WORKER_LANG_LABEL_HE: Record<WorkerLangCode, string> = {
  he: "עברית",
  en: "אנגלית",
  ru: "רוסית",
  si: "סינהלה",
  zh: "סינית",
  hi: "הינדי",
};

export const WORKER_LANG_CODES: WorkerLangCode[] = [
  "he", "en", "ru", "si", "zh", "hi",
];

export function isWorkerLangCode(s: unknown): s is WorkerLangCode {
  return typeof s === "string"
    && (WORKER_LANG_CODES as string[]).includes(s);
}
