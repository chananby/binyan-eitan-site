"use client";

/**
 * useAdaptiveEngine(generateFn, startLevel)
 * ------------------------------------------
 * Topic-agnostic adaptive practice engine.
 * Pass any engine's generateQuestion function to drive a session.
 *
 * Rules:
 *   • 3 consecutive correct  → level UP   (max 3)
 *   • 2 consecutive wrong    → show fullSolution + level DOWN (min 1)
 *   • timeout()              → counts as wrong, same adaptive logic
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { Difficulty, MathQuestion } from "../lib/types";

// ── types ─────────────────────────────────────────────────────────────────────

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

export interface StoredStats {
  totalCorrect: number;
  totalWrong: number;
  highestLevel: Difficulty;
  sessionsPlayed: number;
  pointsTotal: number;
  lastPlayed: string;
}

export interface AdaptiveEngine {
  question: MathQuestion;
  stats: SessionStats;
  stored: StoredStats;
  submit:  (raw: string) => boolean;
  next:    () => void;
  reset:   () => void;
  timeout: () => void;          // call when timer expires (counts as wrong)
}

// ── constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "barilan_math_stats";
const POINTS_BY_LEVEL: Record<Difficulty, number> = { 1: 5, 2: 10, 3: 20 };

const EMPTY_STORED: StoredStats = {
  totalCorrect: 0, totalWrong: 0,
  highestLevel: 1, sessionsPlayed: 0,
  pointsTotal: 0, lastPlayed: "",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function loadStored(): StoredStats {
  if (typeof window === "undefined") return { ...EMPTY_STORED };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STORED };
    return { ...EMPTY_STORED, ...JSON.parse(raw) };
  } catch { return { ...EMPTY_STORED }; }
}

function saveStored(s: StoredStats): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function clampLevel(n: number): Difficulty {
  return Math.min(3, Math.max(1, n)) as Difficulty;
}

function freshSession(level: Difficulty): SessionStats {
  return {
    correct: 0, wrong: 0, streak: 0, wrongStreak: 0,
    points: 0, level, showHint: false, lastAnswerCorrect: null,
  };
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useAdaptiveEngine(
  generateFn: (d: Difficulty) => MathQuestion,
  startLevel: Difficulty = 1,
): AdaptiveEngine {
  // Keep generateFn in a ref so callbacks never go stale even if caller re-renders
  const generateFnRef = useRef(generateFn);
  useEffect(() => { generateFnRef.current = generateFn; }, [generateFn]);

  const [stored, setStored]     = useState<StoredStats>(EMPTY_STORED);
  const [stats, setStats]       = useState<SessionStats>(() => freshSession(startLevel));
  const [question, setQuestion] = useState<MathQuestion>(() => generateFn(startLevel));

  const statsRef    = useRef(stats);
  const storedRef   = useRef(stored);
  const questionRef = useRef(question);

  useEffect(() => { statsRef.current    = stats;    }, [stats]);
  useEffect(() => { storedRef.current   = stored;   }, [stored]);
  useEffect(() => { questionRef.current = question; }, [question]);

  useEffect(() => { setStored(loadStored()); }, []);

  // ── advance to next question ──────────────────────────────────────────────
  const advanceTo = useCallback((level: Difficulty) => {
    setQuestion(generateFnRef.current(level));
    setStats(prev => ({ ...prev, level, showHint: false, lastAnswerCorrect: null }));
  }, []);

  // ── shared wrong-answer logic ─────────────────────────────────────────────
  function applyWrong(prev: SessionStats): {
    newStats: SessionStats;
    newLevel: Difficulty;
    showHint: boolean;
  } {
    const newWrongStreak = prev.wrongStreak + 1;
    const showHint       = newWrongStreak >= 2;
    const newLevel       = showHint ? clampLevel(prev.level - 1) : prev.level;

    const newStats: SessionStats = {
      ...prev,
      wrong:        prev.wrong + 1,
      streak:       0,
      wrongStreak:  showHint ? 0 : newWrongStreak,
      level:        newLevel,
      showHint,
      lastAnswerCorrect: false,
    };
    return { newStats, newLevel, showHint };
  }

  // ── submit ────────────────────────────────────────────────────────────────
  const submit = useCallback((raw: string): boolean => {
    const parsed = parseFloat(raw.trim().replace(",", "."));
    if (isNaN(parsed)) return false;

    const prev = statsRef.current;
    const q    = questionRef.current;
    const isCorrect = Math.abs(parsed - q.answer) < 0.001;

    if (isCorrect) {
      const newStreak = prev.streak + 1;
      const levelUp   = newStreak >= 3;
      const newLevel  = levelUp ? clampLevel(prev.level + 1) : prev.level;
      const earned    = POINTS_BY_LEVEL[prev.level];

      setStats({
        ...prev,
        correct:  prev.correct + 1,
        streak:   levelUp ? 0 : newStreak,
        wrongStreak: 0,
        points:   prev.points + earned,
        level:    newLevel,
        showHint: false,
        lastAnswerCorrect: true,
      });

      const s = storedRef.current;
      const updated: StoredStats = {
        ...s,
        totalCorrect: s.totalCorrect + 1,
        highestLevel: Math.max(s.highestLevel, newLevel) as Difficulty,
        pointsTotal:  s.pointsTotal + earned,
        lastPlayed:   new Date().toISOString(),
      };
      saveStored(updated);
      setStored(updated);

      setTimeout(() => advanceTo(newLevel), 700);
      return true;
    }

    // Wrong answer
    const { newStats, newLevel, showHint } = applyWrong(prev);
    setStats(newStats);

    const s = storedRef.current;
    const updated: StoredStats = {
      ...s,
      totalWrong:  s.totalWrong + 1,
      lastPlayed:  new Date().toISOString(),
    };
    saveStored(updated);
    setStored(updated);

    if (!showHint) {
      // Don't auto-advance on wrong — let user retry
    }
    return false;
  }, [advanceTo]);

  // ── timeout (timer ran out — counts as wrong) ─────────────────────────────
  const timeout = useCallback(() => {
    const prev = statsRef.current;
    const { newStats, newLevel, showHint } = applyWrong(prev);
    setStats(newStats);

    const s = storedRef.current;
    const updated: StoredStats = {
      ...s,
      totalWrong:  s.totalWrong + 1,
      lastPlayed:  new Date().toISOString(),
    };
    saveStored(updated);
    setStored(updated);

    if (!showHint) {
      setTimeout(() => advanceTo(newLevel), 500);
    }
  }, [advanceTo]);

  // ── dismiss hint / advance ────────────────────────────────────────────────
  const next = useCallback(() => {
    advanceTo(statsRef.current.level);
  }, [advanceTo]);

  // ── reset session ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    const s = loadStored();
    const updated: StoredStats = { ...s, sessionsPlayed: s.sessionsPlayed + 1 };
    saveStored(updated);
    setStored(updated);
    setStats(freshSession(startLevel));
    setQuestion(generateFnRef.current(startLevel));
  }, [startLevel]);

  return { question, stats, stored, submit, next, reset, timeout };
}
