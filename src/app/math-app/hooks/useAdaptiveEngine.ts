"use client";

/**
 * useAdaptiveEngine
 * -----------------
 * Adaptive difficulty logic for a single practice session.
 *
 * Rules:
 *   • 3 consecutive correct  → level UP   (max 3)
 *   • 2 consecutive wrong    → show hint + level DOWN (min 1)
 *
 * Persistence key: "barilan_math_stats"
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  type Difficulty,
  type PercentQuestion,
  generateQuestion,
} from "../lib/engines/percentages";

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
  question: PercentQuestion;
  stats: SessionStats;
  stored: StoredStats;
  submit: (raw: string) => boolean;
  next: () => void;
  reset: () => void;
}

// ── constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "barilan_math_stats";
const POINTS_BY_LEVEL: Record<Difficulty, number> = { 1: 5, 2: 10, 3: 20 };

const EMPTY_STORED: StoredStats = {
  totalCorrect: 0,
  totalWrong: 0,
  highestLevel: 1,
  sessionsPlayed: 0,
  pointsTotal: 0,
  lastPlayed: "",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function loadStored(): StoredStats {
  if (typeof window === "undefined") return { ...EMPTY_STORED };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STORED };
    return { ...EMPTY_STORED, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_STORED };
  }
}

function saveStored(s: StoredStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* storage full — ignore */ }
}

function clampLevel(val: number): Difficulty {
  return Math.min(3, Math.max(1, val)) as Difficulty;
}

function freshSession(level: Difficulty): SessionStats {
  return {
    correct: 0, wrong: 0,
    streak: 0, wrongStreak: 0,
    points: 0, level,
    showHint: false,
    lastAnswerCorrect: null,
  };
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useAdaptiveEngine(startLevel: Difficulty = 1): AdaptiveEngine {
  const [stored, setStored]     = useState<StoredStats>(EMPTY_STORED);
  const [stats, setStats]       = useState<SessionStats>(() => freshSession(startLevel));
  const [question, setQuestion] = useState<PercentQuestion>(() => generateQuestion(startLevel));

  const statsRef    = useRef(stats);
  const storedRef   = useRef(stored);
  const questionRef = useRef(question);

  useEffect(() => { statsRef.current    = stats;    }, [stats]);
  useEffect(() => { storedRef.current   = stored;   }, [stored]);
  useEffect(() => { questionRef.current = question; }, [question]);

  // Load localStorage on client mount
  useEffect(() => { setStored(loadStored()); }, []);

  const advanceTo = useCallback((level: Difficulty) => {
    setQuestion(generateQuestion(level));
    setStats((prev) => ({ ...prev, level, showHint: false, lastAnswerCorrect: null }));
  }, []);

  const submit = useCallback((raw: string): boolean => {
    const parsed = parseFloat(raw.trim().replace(",", "."));
    if (isNaN(parsed)) return false;

    const prev = statsRef.current;
    const q    = questionRef.current;
    const isCorrect = Math.abs(parsed - q.answer) < 0.001;

    let newStreak      = prev.streak;
    let newWrongStreak = prev.wrongStreak;
    let newLevel       = prev.level;
    let showHint       = false;

    if (isCorrect) {
      newStreak      = prev.streak + 1;
      newWrongStreak = 0;
      if (newStreak >= 3) {
        newLevel  = clampLevel(prev.level + 1);
        newStreak = 0;
      }
    } else {
      newWrongStreak = prev.wrongStreak + 1;
      newStreak      = 0;
      if (newWrongStreak >= 2) {
        showHint       = true;
        newLevel       = clampLevel(prev.level - 1);
        newWrongStreak = 0;
      }
    }

    const earned = isCorrect ? POINTS_BY_LEVEL[prev.level] : 0;

    setStats({
      correct:           prev.correct + (isCorrect ? 1 : 0),
      wrong:             prev.wrong   + (isCorrect ? 0 : 1),
      streak:            newStreak,
      wrongStreak:       newWrongStreak,
      points:            prev.points + earned,
      level:             newLevel,
      showHint,
      lastAnswerCorrect: isCorrect,
    });

    const s = storedRef.current;
    const updated: StoredStats = {
      totalCorrect:   s.totalCorrect  + (isCorrect ? 1 : 0),
      totalWrong:     s.totalWrong    + (isCorrect ? 0 : 1),
      highestLevel:   Math.max(s.highestLevel, newLevel) as Difficulty,
      sessionsPlayed: s.sessionsPlayed,
      pointsTotal:    s.pointsTotal   + earned,
      lastPlayed:     new Date().toISOString(),
    };
    saveStored(updated);
    setStored(updated);

    if (isCorrect) {
      setTimeout(() => advanceTo(newLevel), 700);
    }

    return isCorrect;
  }, [advanceTo]);

  const next = useCallback(() => {
    advanceTo(statsRef.current.level);
  }, [advanceTo]);

  const reset = useCallback(() => {
    const s = loadStored();
    const updated: StoredStats = { ...s, sessionsPlayed: s.sessionsPlayed + 1 };
    saveStored(updated);
    setStored(updated);
    setStats(freshSession(startLevel));
    setQuestion(generateQuestion(startLevel));
  }, [startLevel]);

  return { question, stats, stored, submit, next, reset };
}
