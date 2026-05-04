"use client";

import type {
  TestAttempt,
  TestProgress,
  Answers,
  TopicBreakdown,
  AttemptStatus,
} from "@/src/types/math-test";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const TABLE = "math_test_attempts";

/** Device-local UUID that identifies this browser for test attempts */
const SYNC_KEY_STORAGE = "bi_sync_key";

export function getSyncKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(SYNC_KEY_STORAGE);
  if (!key) {
    key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(SYNC_KEY_STORAGE, key);
  }
  return key;
}

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

// ── Create ────────────────────────────────────────────────────────────────────

export async function startAttempt(params: {
  syncKey: string;
  testSlug: string;
  testName: string;
  questionIds: string[];
  isSimulation: boolean;
}): Promise<TestAttempt | null> {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        sync_key: params.syncKey,
        test_slug: params.testSlug,
        test_name: params.testName,
        question_ids: params.questionIds,
        total_questions: params.questionIds.length,
        is_simulation: params.isSimulation,
        status: "in_progress" satisfies AttemptStatus,
      }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as TestAttempt[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAttempt(attemptId: string): Promise<TestAttempt | null> {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(attemptId)}&limit=1`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as TestAttempt[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getInProgressAttempt(
  syncKey: string,
  testSlug: string,
): Promise<TestAttempt | null> {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}?sync_key=eq.${encodeURIComponent(syncKey)}&test_slug=eq.${encodeURIComponent(testSlug)}&status=eq.in_progress&order=started_at.desc&limit=1`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as TestAttempt[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getHistory(
  syncKey: string,
  testSlug: string,
  limit = 10,
): Promise<TestAttempt[]> {
  if (!isConfigured()) return [];
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}?sync_key=eq.${encodeURIComponent(syncKey)}&test_slug=eq.${encodeURIComponent(testSlug)}&status=eq.completed&order=completed_at.desc&limit=${limit}`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return [];
    return (await res.json()) as TestAttempt[];
  } catch {
    return [];
  }
}

export async function getProgress(
  syncKey: string,
  testSlug: string,
): Promise<TestProgress | null> {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/math_test_progress?sync_key=eq.${encodeURIComponent(syncKey)}&test_slug=eq.${encodeURIComponent(testSlug)}&limit=1`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as TestProgress[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function saveAnswers(
  attemptId: string,
  answers: Answers,
): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(attemptId)}`,
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          answers,
          answered_count: Object.keys(answers).length,
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function completeAttempt(params: {
  attemptId: string;
  answers: Answers;
  correctCount: number;
  scorePercentage: number;
  durationSeconds: number;
  topicBreakdown: TopicBreakdown;
}): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(params.attemptId)}`,
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          status: "completed" satisfies AttemptStatus,
          answers: params.answers,
          answered_count: Object.keys(params.answers).length,
          correct_count: params.correctCount,
          score_percentage: params.scorePercentage,
          duration_seconds: params.durationSeconds,
          topic_breakdown: params.topicBreakdown,
          completed_at: new Date().toISOString(),
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
