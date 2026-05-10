"use client";

import type {
  PracticeModule,
  PracticeLevel,
  PracticeProgress,
  PracticeStatus,
  QuestionDetail,
  PracticeFile,
} from "@/src/types/math-test";
import practiceData from "@/src/data/math/bar-ilan-practice-ab.json";

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const TABLE = "math_practice_progress";

function headers() {
  return {
    apikey: SUPA_ANON,
    Authorization: `Bearer ${SUPA_ANON}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function isConfigured(): boolean {
  return Boolean(SUPA_URL && SUPA_ANON);
}

// ── Data loaders (from JSON — no network) ─────────────────────────────────────

const mod: PracticeModule = (practiceData as PracticeFile).practice_module;

export function getPracticeModule(): PracticeModule {
  return mod;
}

export function getPracticeLevel(levelId: string): PracticeLevel | null {
  return mod.levels.find((l) => l.id === levelId) ?? null;
}

// ── DB: read ──────────────────────────────────────────────────────────────────

/** Returns progress rows for all levels of a module, ordered by level_id. */
export async function getModuleProgress(
  syncKey: string,
  moduleSlug: string,
): Promise<{ rows: PracticeProgress[]; error: boolean }> {
  if (!isConfigured()) return { rows: [], error: false };
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}` +
        `?sync_key=eq.${encodeURIComponent(syncKey)}` +
        `&module_slug=eq.${encodeURIComponent(moduleSlug)}` +
        `&order=level_id.asc`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return { rows: [], error: true };
    return { rows: (await res.json()) as PracticeProgress[], error: false };
  } catch {
    return { rows: [], error: true };
  }
}

/** Returns the progress row for a single level, or null if not started. */
export async function getLevelProgress(
  syncKey: string,
  moduleSlug: string,
  levelId: string,
): Promise<{ progress: PracticeProgress | null; error: boolean }> {
  if (!isConfigured()) return { progress: null, error: false };
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}` +
        `?sync_key=eq.${encodeURIComponent(syncKey)}` +
        `&module_slug=eq.${encodeURIComponent(moduleSlug)}` +
        `&level_id=eq.${encodeURIComponent(levelId)}` +
        `&limit=1`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return { progress: null, error: true };
    const rows = (await res.json()) as PracticeProgress[];
    return { progress: rows[0] ?? null, error: false };
  } catch {
    return { progress: null, error: true };
  }
}

// ── DB: write ─────────────────────────────────────────────────────────────────

/** Deletes the progress row for a single level (hard reset). Returns true on success. */
export async function resetLevelProgress(
  syncKey: string,
  moduleSlug: string,
  levelId: string,
): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}` +
        `?sync_key=eq.${encodeURIComponent(syncKey)}` +
        `&module_slug=eq.${encodeURIComponent(moduleSlug)}` +
        `&level_id=eq.${encodeURIComponent(levelId)}`,
      { method: "DELETE", headers: headers() },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Upserts progress for a single level.
 * Uses Supabase merge-duplicates on the unique(sync_key, module_slug, level_id) constraint.
 * The sync_key comes from getSyncKey() in attempts.ts — passed in by the caller.
 */
export async function upsertLevelProgress(params: {
  syncKey: string;
  moduleSlug: string;
  levelId: string;
  questionsTotal: number;
  questionsCorrect: number;
  questionsAnswered: number;
  questionDetails: Record<string, QuestionDetail>;
  status: PracticeStatus;
  completedAt?: string;
}): Promise<{ progress: PracticeProgress | null; error: boolean }> {
  if (!isConfigured()) return { progress: null, error: false };
  try {
    const body: Record<string, unknown> = {
      sync_key:           params.syncKey,
      module_slug:        params.moduleSlug,
      level_id:           params.levelId,
      questions_total:    params.questionsTotal,
      questions_correct:  params.questionsCorrect,
      questions_answered: params.questionsAnswered,
      question_details:   params.questionDetails,
      status:             params.status,
    };
    if (params.completedAt) body.completed_at = params.completedAt;

    const res = await fetch(`${SUPA_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        ...headers(),
        // merge-duplicates: INSERT becomes UPDATE when unique constraint fires
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { progress: null, error: true };
    const rows = (await res.json()) as PracticeProgress[];
    return { progress: rows[0] ?? null, error: false };
  } catch {
    return { progress: null, error: true };
  }
}
