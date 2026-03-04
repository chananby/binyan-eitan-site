"use client";

/**
 * useAdaptiveEngine(generateFn, initialStats, onStatsUpdate, startLevel)
 * ────────────────────────────────────────────────────────────────────────
 * Topic-agnostic adaptive practice engine.
 * Storage is the caller's responsibility — handled via onStatsUpdate callback.
 *
 * Grace-period rules
 * ──────────────────
 *   • streakToLevelUp consecutive correct answers → level UP   (max 3)
 *   • 2 CONSECUTIVE wrong answers    → fullSolution shown + level DOWN (min 1)
 *   • 1 wrong answer                 → correctStreak resets, stays at current level
 *   • timeout()                      → counts as wrong, same adaptive logic
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { Difficulty, MathQuestion, StoredStats } from "../lib/types";
import { EMPTY_STATS } from "../lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionStats {
  correct: number;
  wrong: number;
  streak: number;
  wrongStreak: number;
  points: number;
  level: Difficulty;
  showHint: boolean;
  lastAnswerCorrect: boolean | null;
}

export interface AdaptiveEngine {
  question: MathQuestion;
  stats: SessionStats;
  submit:  (raw: string) => boolean;
  next:    () => void;
  reset:   () => void;
  timeout: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POINTS_BY_LEVEL: Record<Difficulty, number> = { 1: 5, 2: 10, 3: 20 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampLevel(n: number): Difficulty {
  return Math.min(3, Math.max(1, n)) as Difficulty;
}

function freshSession(level: Difficulty): SessionStats {
  return {
    correct: 0, wrong: 0, streak: 0, wrongStreak: 0,
    points: 0, level, showHint: false, lastAnswerCorrect: null,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdaptiveEngine(
  generateFn: (d: Difficulty) => MathQuestion,
  initialStats: StoredStats = EMPTY_STATS,
  onStatsUpdate: (s: StoredStats) => void = () => {},
  startLevel: Difficulty = 1,
  streakToLevelUp: number = 3,
): AdaptiveEngine {
  // Keep callbacks in refs so they're never stale inside memoized callbacks
  const generateFnRef    = useRef(generateFn);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => { generateFnRef.current    = generateFn;    }, [generateFn]);
  useEffect(() => { onStatsUpdateRef.current = onStatsUpdate; }, [onStatsUpdate]);

  // storedRef mirrors the caller's initialStats prop and accumulates mid-session
  const storedRef = useRef<StoredStats>(initialStats);
  useEffect(() => { storedRef.current = initialStats; }, [initialStats]);

  const [stats, setStats]       = useState<SessionStats>(() => freshSession(startLevel));
  const [question, setQuestion] = useState<MathQuestion>(() => generateFn(startLevel));

  const statsRef    = useRef(stats);
  const questionRef = useRef(question);
  useEffect(() => { statsRef.current    = stats;    }, [stats]);
  useEffect(() => { questionRef.current = question; }, [question]);

  // ── Flush a patch to cumulative stored stats ──────────────────────────────
  const flushStored = useCallback((patch: Partial<StoredStats>) => {
    const next: StoredStats = {
      ...storedRef.current,
      ...patch,
      lastPlayed: new Date().toISOString(),
    };
    storedRef.current = next;
    onStatsUpdateRef.current(next);
  }, []);

  // ── Advance to next question ──────────────────────────────────────────────
  const advanceTo = useCallback((level: Difficulty) => {
    setQuestion(generateFnRef.current(level));
    setStats((prev) => ({ ...prev, level, showHint: false, lastAnswerCorrect: null }));
  }, []);

  // ── Shared wrong-answer logic ─────────────────────────────────────────────
  //
  // Grace-period: a single wrong answer bumps wrongStreak to 1 but keeps the level.
  // Only on the 2nd consecutive wrong does the user drop a level and see the solution.
  //
  function applyWrong(prev: SessionStats): {
    newStats: SessionStats;
    newLevel: Difficulty;
    showHint: boolean;
  } {
    const newWrongStreak = prev.wrongStreak + 1;
    const showHint       = newWrongStreak >= 2;             // drop after 2 consecutive
    const newLevel       = showHint ? clampLevel(prev.level - 1) : prev.level;

    return {
      newStats: {
        ...prev,
        wrong:       prev.wrong + 1,
        streak:      0,                                     // correct streak always resets
        wrongStreak: showHint ? 0 : newWrongStreak,         // reset after penalty
        level:       newLevel,
        showHint,
        lastAnswerCorrect: false,
      },
      newLevel,
      showHint,
    };
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback((raw: string): boolean => {
    const parsed = parseFloat(raw.trim().replace(",", "."));
    if (isNaN(parsed)) return false;

    const prev      = statsRef.current;
    const q         = questionRef.current;
    const isCorrect = Math.abs(parsed - q.answer) < 0.001;

    if (isCorrect) {
      const newStreak = prev.streak + 1;
      const levelUp   = newStreak >= streakToLevelUp;
      const newLevel  = levelUp ? clampLevel(prev.level + 1) : prev.level;
      const earned    = POINTS_BY_LEVEL[prev.level];

      setStats({
        ...prev,
        correct:     prev.correct + 1,
        streak:      levelUp ? 0 : newStreak,
        wrongStreak: 0,
        points:      prev.points + earned,
        level:       newLevel,
        showHint:    false,
        lastAnswerCorrect: true,
      });

      flushStored({
        totalCorrect: storedRef.current.totalCorrect + 1,
        highestLevel: Math.max(storedRef.current.highestLevel, newLevel) as Difficulty,
        pointsTotal:  storedRef.current.pointsTotal + earned,
      });

      setTimeout(() => advanceTo(newLevel), 700);
      return true;
    }

    // Wrong answer — apply grace-period logic
    const { newStats, newLevel, showHint } = applyWrong(prev);
    setStats(newStats);
    flushStored({ totalWrong: storedRef.current.totalWrong + 1 });

    // If hint shown, user must click "next" manually.
    // If single wrong (no hint), let the user retry — do NOT auto-advance.
    if (showHint) {
      // advanceTo is called by the `next` callback when user dismisses hint
    }
    return false;
  }, [advanceTo, flushStored]);

  // ── Timeout (timer ran out — counts as wrong) ─────────────────────────────
  const timeout = useCallback(() => {
    const prev = statsRef.current;
    const { newStats, newLevel, showHint } = applyWrong(prev);
    setStats(newStats);
    flushStored({ totalWrong: storedRef.current.totalWrong + 1 });
    // Auto-advance only when no hint needs to be shown
    if (!showHint) setTimeout(() => advanceTo(newLevel), 500);
  }, [advanceTo, flushStored]);

  // ── Dismiss hint / advance ────────────────────────────────────────────────
  const next = useCallback(() => {
    advanceTo(statsRef.current.level);
  }, [advanceTo]);

  // ── Reset session ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    flushStored({ sessionsPlayed: storedRef.current.sessionsPlayed + 1 });
    setStats(freshSession(startLevel));
    setQuestion(generateFnRef.current(startLevel));
  }, [startLevel, flushStored]);

  return { question, stats, submit, next, reset, timeout };
}
