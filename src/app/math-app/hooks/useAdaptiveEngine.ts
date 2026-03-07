"use client";

/**
 * useAdaptiveEngine(generateFn, initialStats, onStatsUpdate, startLevel, streakToLevelUp, topicId)
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 * Topic-agnostic adaptive practice engine.
 * Storage is the caller's responsibility — handled via onStatsUpdate callback.
 *
 * Grace-period rules
 * ──────────────────
 *   • streakToLevelUp consecutive correct answers → level UP   (max 3)
 *   • 2 CONSECUTIVE wrong answers    → fullSolution shown + level DOWN (min 1)
 *   • 1 wrong answer                 → correctStreak resets, stays at current level
 *   • timeout()                      → counts as wrong, same adaptive logic
 *
 * Per-topic stats
 * ───────────────
 *   When topicId is provided, every flush also updates StoredStats.topicStats[topicId].
 *   This lets each topic maintain its own highestLevel, so starting level is topic-specific.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { Difficulty, MathQuestion, StoredStats, TopicStats } from "../lib/types";
import { EMPTY_STATS, EMPTY_TOPIC_STATS } from "../lib/types";

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
  justLeveledUp: boolean;
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
    justLeveledUp: false,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdaptiveEngine(
  generateFn: (d: Difficulty) => MathQuestion,
  initialStats: StoredStats = EMPTY_STATS,
  onStatsUpdate: (s: StoredStats) => void = () => {},
  startLevel: Difficulty = 1,
  streakToLevelUp: number = 3,
  topicId?: string,
): AdaptiveEngine {
  // Keep callbacks in refs so they're never stale inside memoized callbacks
  const generateFnRef    = useRef(generateFn);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  useEffect(() => { generateFnRef.current    = generateFn;    }, [generateFn]);
  useEffect(() => { onStatsUpdateRef.current = onStatsUpdate; }, [onStatsUpdate]);

  // storedRef mirrors the caller's initialStats prop and accumulates mid-session
  const storedRef = useRef<StoredStats>(initialStats);
  useEffect(() => { storedRef.current = initialStats; }, [initialStats]);

  // topicStatsRef mirrors the per-topic slice for the active topic
  const topicStatsRef = useRef<TopicStats>(
    (topicId && initialStats.topicStats?.[topicId])
      ? initialStats.topicStats[topicId]
      : { ...EMPTY_TOPIC_STATS },
  );
  useEffect(() => {
    if (topicId) {
      topicStatsRef.current = initialStats.topicStats?.[topicId] ?? { ...EMPTY_TOPIC_STATS };
    }
  // topicId is stable per session — intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStats]);

  const [stats, setStats]       = useState<SessionStats>(() => freshSession(startLevel));
  const [question, setQuestion] = useState<MathQuestion>(() => generateFn(startLevel));

  const statsRef    = useRef(stats);
  const questionRef = useRef(question);
  useEffect(() => { statsRef.current    = stats;    }, [stats]);
  useEffect(() => { questionRef.current = question; }, [question]);

  // ── Flush a patch to cumulative stored stats ──────────────────────────────
  const flushStored = useCallback((
    patch: Partial<StoredStats>,
    topicPatch?: Partial<TopicStats>,
  ) => {
    const now = new Date().toISOString();
    const next: StoredStats = {
      ...storedRef.current,
      ...patch,
      lastPlayed: now,
    };

    if (topicId && topicPatch) {
      const updatedTopic: TopicStats = {
        ...topicStatsRef.current,
        ...topicPatch,
        lastPlayed: now,
      };
      topicStatsRef.current = updatedTopic;
      next.topicStats = {
        ...storedRef.current.topicStats,
        [topicId]: updatedTopic,
      };
    }

    storedRef.current = next;
    onStatsUpdateRef.current(next);
  }, [topicId]);

  // ── Advance to next question ──────────────────────────────────────────────
  const advanceTo = useCallback((level: Difficulty) => {
    setQuestion(generateFnRef.current(level));
    setStats((prev) => ({
      ...prev,
      level,
      showHint: false,
      lastAnswerCorrect: null,
      justLeveledUp: false,
    }));
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
    const showHint       = newWrongStreak >= 2;
    const newLevel       = showHint ? clampLevel(prev.level - 1) : prev.level;

    return {
      newStats: {
        ...prev,
        wrong:         prev.wrong + 1,
        streak:        0,
        wrongStreak:   showHint ? 0 : newWrongStreak,
        level:         newLevel,
        showHint,
        lastAnswerCorrect: false,
        justLeveledUp: false,
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
        justLeveledUp: levelUp,
      });

      flushStored(
        {
          totalCorrect: storedRef.current.totalCorrect + 1,
          highestLevel: Math.max(storedRef.current.highestLevel, newLevel) as Difficulty,
          pointsTotal:  storedRef.current.pointsTotal + earned,
        },
        topicId ? {
          totalCorrect: topicStatsRef.current.totalCorrect + 1,
          highestLevel: Math.max(topicStatsRef.current.highestLevel, newLevel) as Difficulty,
          pointsTotal:  topicStatsRef.current.pointsTotal + earned,
        } : undefined,
      );

      setTimeout(() => advanceTo(newLevel), 700);
      return true;
    }

    // Wrong answer — apply grace-period logic
    const { newStats, showHint } = applyWrong(prev);
    setStats(newStats);
    flushStored(
      { totalWrong: storedRef.current.totalWrong + 1 },
      topicId ? { totalWrong: topicStatsRef.current.totalWrong + 1 } : undefined,
    );

    if (showHint) {
      // advanceTo is called by the `next` callback when user dismisses hint
    }
    return false;
  }, [advanceTo, flushStored, streakToLevelUp, topicId]);

  // ── Timeout (timer ran out — counts as wrong) ─────────────────────────────
  const timeout = useCallback(() => {
    const prev = statsRef.current;
    const { newStats, newLevel, showHint } = applyWrong(prev);
    setStats(newStats);
    flushStored(
      { totalWrong: storedRef.current.totalWrong + 1 },
      topicId ? { totalWrong: topicStatsRef.current.totalWrong + 1 } : undefined,
    );
    if (!showHint) setTimeout(() => advanceTo(newLevel), 500);
  }, [advanceTo, flushStored, topicId]);

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
