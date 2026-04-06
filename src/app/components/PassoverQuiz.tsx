'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, BookOpen, ChevronLeft, RotateCcw, Layers, HelpCircle, Share2, Medal } from 'lucide-react';
import {
  ALL_QUESTIONS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  AGE_GROUP_LABELS,
  AGE_GROUP_ICONS,
  type QuizCategory,
  type AgeGroup,
  type QuizQuestion,
  type MultipleChoiceQuestion,
  type TrueFalseQuestion,
  type FillBlankQuestion,
  type OrderingQuestion,
  type MatchingQuestion,
  type WhoSaidQuestion,
} from '../../lib/passover-quiz-data';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUIZ_URL = 'https://binyaneitan.com/he/passover-quiz';
const LS_KEY   = 'passover-quiz-leaderboard';

// ─── Leaderboard types & helpers ──────────────────────────────────────────────

interface LeaderboardEntry {
  name:     string;
  score:    number;
  total:    number;
  pct:      number;
  ageGroup: AgeGroup;
  date:     string; // ISO
}

function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch { return []; }
}

function saveToLeaderboard(entry: LeaderboardEntry): void {
  const entries = getLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.pct - a.pct || new Date(b.date).getTime() - new Date(a.date).getTime());
  localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 50)));
}

// ─── Play counter (localStorage) ─────────────────────────────────────────────

const PLAY_COUNT_KEY = 'pq-total-plays';

function hitCounter(): void {
  try {
    const n = parseInt(localStorage.getItem(PLAY_COUNT_KEY) ?? '0', 10);
    localStorage.setItem(PLAY_COUNT_KEY, String(n + 1));
  } catch { /* silent */ }
}

function getPlayCount(): number {
  try {
    return parseInt(localStorage.getItem(PLAY_COUNT_KEY) ?? '0', 10);
  } catch { return 0; }
}

// ─── Daily streak (localStorage) ──────────────────────────────────────────────

const STREAK_KEY = 'pq-streak';

interface StreakData {
  current: number;
  best:    number;
  lastDate: string; // YYYY-MM-DD
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as StreakData) : { current: 0, best: 0, lastDate: '' };
  } catch { return { current: 0, best: 0, lastDate: '' }; }
}

function hitStreak(): StreakData {
  try {
    const today = todayStr();
    const data  = getStreak();
    if (data.lastDate === today) return data; // already played today
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const current   = data.lastDate === yesterday ? data.current + 1 : 1;
    const best      = Math.max(current, data.best);
    const next: StreakData = { current, best, lastDate: today };
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
    return next;
  } catch { return { current: 1, best: 1, lastDate: todayStr() }; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'start' | 'quiz' | 'results';

type Answer =
  | { type: 'multiple-choice'; selected: number | null }
  | { type: 'true-false'; selected: boolean | null }
  | { type: 'fill-blank'; text: string }
  | { type: 'ordering'; order: string[] }
  | { type: 'matching'; pairs: Array<{ left: string; right: string }> }
  | { type: 'who-said'; selected: number | null };

interface QuestionState {
  answer: Answer;
  revealed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPool(ageGroup: AgeGroup, category: QuizCategory | 'all'): QuizQuestion[] {
  let pool = ALL_QUESTIONS.filter((q) => q.ageGroup === ageGroup);
  if (category !== 'all') pool = pool.filter((q) => q.category === category);
  return pool;
}

function nextDifficulty(
  current: 'easy' | 'medium' | 'hard',
  wasCorrect: boolean,
): 'easy' | 'medium' | 'hard' {
  if (wasCorrect) return current === 'easy' ? 'medium' : 'hard';
  return current === 'hard' ? 'medium' : 'easy';
}

function initAnswer(q: QuizQuestion): Answer {
  switch (q.type) {
    case 'multiple-choice':
    case 'who-said':
      return { type: q.type, selected: null };
    case 'true-false':
      return { type: 'true-false', selected: null };
    case 'fill-blank':
      return { type: 'fill-blank', text: '' };
    case 'ordering':
      return { type: 'ordering', order: [] };
    case 'matching':
      return { type: 'matching', pairs: [] };
  }
}

function isCorrect(q: QuizQuestion, answer: Answer): boolean {
  switch (q.type) {
    case 'multiple-choice':
    case 'who-said':
      return (answer as { selected: number | null }).selected === q.correctIndex;
    case 'true-false':
      return (answer as { selected: boolean | null }).selected === q.isTrue;
    case 'fill-blank': {
      const text = (answer as { text: string }).text.trim();
      return text.toLowerCase() === q.answer.toLowerCase();
    }
    case 'ordering': {
      const order = (answer as { order: string[] }).order;
      return JSON.stringify(order) === JSON.stringify(q.items);
    }
    case 'matching': {
      const pairs = (answer as { pairs: Array<{ left: string; right: string }> }).pairs;
      if (pairs.length !== q.pairs.length) return false;
      return q.pairs.every((p) => pairs.some((a) => a.left === p.left && a.right === p.right));
    }
  }
}

function getQuestionText(q: QuizQuestion): string {
  switch (q.type) {
    case 'multiple-choice':
    case 'ordering':
    case 'matching':
      return q.question;
    case 'who-said':
      return q.context ?? q.quote;
    case 'true-false':
      return q.statement;
    case 'fill-blank':
      return q.questionWithBlank;
  }
}

function scoreMessage(score: number, total: number): { title: string; body: string } {
  const pct = score / total;
  if (pct === 1)
    return { title: 'מושלם! כתר תורה! 👑', body: 'ענית נכון על כל השאלות. אתה בקיא כסיני!' };
  if (pct >= 0.8)
    return { title: 'מצוין! ישר כוח! 🌟', body: 'שליטה נפלאה בחומר. עוד קצת ותגיע לשלמות.' };
  if (pct >= 0.6)
    return { title: 'טוב מאוד! 📖', body: 'יש לך בסיס מוצק. חזור על החומר וגדל.' };
  if (pct >= 0.4)
    return { title: 'לא רע, אבל אפשר יותר', body: '"עשה לך רב" — שוב על ההסברים ותתקדם.' };
  return { title: 'ניסיון ראשון? 🌱', body: '"הפוך בה והפוך בה דכולה בה" — נסה שוב!' };
}

function timerForQuestion(q: QuizQuestion): number {
  switch (q.type) {
    case 'ordering':
    case 'matching':
      return 90;
    case 'fill-blank':
      return 60;
    default:
      return 30;
  }
}

// ─── Small shared components ──────────────────────────────────────────────────

function Diamond() {
  return <span className="text-accent/60 mx-2 text-xs select-none">◆</span>;
}

function CategoryBadge({ category }: { category: QuizCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/30 bg-accent/[0.06] text-accent text-xs font-medium">
      <span>{CATEGORY_ICONS[category]}</span>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function TypeBadge({ type }: { type: QuizQuestion['type'] }) {
  const labels: Record<QuizQuestion['type'], string> = {
    'multiple-choice': 'רב-ברירה',
    'true-false': 'נכון/לא נכון',
    'fill-blank': 'השלמת משפט',
    'ordering': 'סידור',
    'matching': 'התאמה',
    'who-said': 'מי אמר?',
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-warm-gray-light text-charcoal/40 text-xs">
      {labels[type]}
    </span>
  );
}

function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const progress = seconds / total;
  const color = seconds <= 10 ? '#c0392b' : seconds <= 20 ? '#e67e22' : '#8D775F';
  return (
    <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E8E7E3" strokeWidth="3" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${circ * progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }}
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums" style={{ color }}>{seconds}</span>
    </div>
  );
}

// ─── Question renderers ───────────────────────────────────────────────────────

function MultipleChoiceRenderer({
  q, answer, revealed, onAnswer,
}: { q: MultipleChoiceQuestion | WhoSaidQuestion; answer: Answer; revealed: boolean; onAnswer: (a: Answer) => void }) {
  const selected = (answer as { selected: number | null }).selected;

  const buttonClass = (i: number) => {
    if (!revealed) {
      return selected === i
        ? 'border-accent bg-accent/[0.08] text-charcoal'
        : 'border-warm-gray-light bg-white text-charcoal hover:border-accent/60 hover:bg-accent/[0.04]';
    }
    if (i === q.correctIndex) return 'border-green-500 bg-green-50 text-green-800 font-semibold';
    if (i === selected && selected !== q.correctIndex) return 'border-red-400 bg-red-50 text-red-700';
    return 'border-warm-gray-light bg-white text-charcoal/40';
  };

  const isWhoSaid = q.type === 'who-said';
  const items = q.options;

  return (
    <div className="space-y-3">
      {isWhoSaid && (
        <div className="bg-accent/[0.04] border border-accent/20 rounded-xl px-5 py-4 mb-2">
          <p className="text-charcoal font-heading text-lg text-center leading-relaxed">
            {(q as WhoSaidQuestion).quote}
          </p>
          {(q as WhoSaidQuestion).context && (
            <p className="text-charcoal/50 text-sm text-center mt-1">{(q as WhoSaidQuestion).context}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              if (!revealed) {
                onAnswer(q.type === 'who-said'
                  ? { type: 'who-said', selected: i }
                  : { type: 'multiple-choice', selected: i });
              }
            }}
            disabled={revealed}
            className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all leading-snug ${buttonClass(i)}`}
          >
            <span className="text-accent/60 font-mono text-xs ml-2">{['א', 'ב', 'ג', 'ד'][i]}.</span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrueFalseRenderer({
  q, answer, revealed, onAnswer,
}: { q: TrueFalseQuestion; answer: Answer; revealed: boolean; onAnswer: (a: Answer) => void }) {
  const selected = (answer as { selected: boolean | null }).selected;

  const btnClass = (val: boolean) => {
    if (!revealed) {
      return selected === val
        ? 'border-accent bg-accent/[0.08] text-charcoal font-semibold'
        : 'border-warm-gray-light bg-white text-charcoal hover:border-accent/60';
    }
    if (val === q.isTrue) return 'border-green-500 bg-green-50 text-green-800 font-semibold';
    if (selected === val && val !== q.isTrue) return 'border-red-400 bg-red-50 text-red-700';
    return 'border-warm-gray-light bg-white text-charcoal/40';
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {[true, false].map((val) => (
        <button
          key={String(val)}
          onClick={() => !revealed && onAnswer({ type: 'true-false', selected: val })}
          disabled={revealed}
          className={`py-5 rounded-2xl border text-xl font-heading transition-all ${btnClass(val)}`}
        >
          {val ? '✓ נכון' : '✗ לא נכון'}
        </button>
      ))}
    </div>
  );
}

function FillBlankRenderer({
  q, answer, revealed, onAnswer,
}: { q: FillBlankQuestion; answer: Answer; revealed: boolean; onAnswer: (a: Answer) => void }) {
  const text = (answer as { text: string }).text;
  const correct = revealed && text.trim().toLowerCase() === q.answer.toLowerCase();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!revealed) inputRef.current?.focus();
  }, [revealed]);

  return (
    <div className="space-y-4">
      {q.hint && !revealed && (
        <p className="text-xs text-charcoal/40 flex items-center gap-1.5">
          <HelpCircle size={12} /> רמז: {q.hint}
        </p>
      )}
      <input
        ref={inputRef}
        type="text"
        dir="rtl"
        value={text}
        onChange={(e) => !revealed && onAnswer({ type: 'fill-blank', text: e.target.value })}
        disabled={revealed}
        placeholder="כתוב את תשובתך כאן..."
        className={`w-full px-4 py-3 rounded-xl border text-sm text-charcoal placeholder-charcoal/30 outline-none transition-all ${
          revealed
            ? correct
              ? 'border-green-500 bg-green-50'
              : 'border-red-400 bg-red-50'
            : 'border-warm-gray-light bg-white focus:border-accent'
        }`}
      />
      {revealed && !correct && (
        <p className="text-sm text-charcoal/60">
          תשובה נכונה: <span className="font-semibold text-green-700">{q.answer}</span>
        </p>
      )}
    </div>
  );
}

function OrderingRenderer({
  q, answer, revealed, onAnswer,
}: { q: OrderingQuestion; answer: Answer; revealed: boolean; onAnswer: (a: Answer) => void }) {
  const order = (answer as { order: string[] }).order;
  const [shuffledPool] = useState(() => shuffle(q.items));
  const remaining = shuffledPool.filter((item) => !order.includes(item));

  const addItem = (item: string) => {
    if (revealed) return;
    onAnswer({ type: 'ordering', order: [...order, item] });
  };

  const removeItem = (item: string) => {
    if (revealed) return;
    onAnswer({ type: 'ordering', order: order.filter((i) => i !== item) });
  };

  const itemClass = (item: string, idx: number) => {
    if (!revealed) return 'border-accent/30 bg-accent/[0.04] text-charcoal';
    const correctItem = q.items[idx];
    return item === correctItem
      ? 'border-green-500 bg-green-50 text-green-800'
      : 'border-red-400 bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-4">
      {/* Ordered (user's answer) */}
      <div>
        <p className="text-xs text-charcoal/40 uppercase tracking-widest mb-2">הסדר שלך:</p>
        <div className="space-y-1.5 min-h-[48px] p-2 bg-bone rounded-xl border border-dashed border-warm-gray-light">
          {order.length === 0 && (
            <p className="text-xs text-charcoal/30 text-center py-2">לחץ על פריט למטה להוסיפו</p>
          )}
          {order.map((item, idx) => (
            <button
              key={item}
              onClick={() => removeItem(item)}
              disabled={revealed}
              className={`w-full text-right px-3 py-3 rounded-lg border text-sm flex items-center gap-2 transition-all min-h-[48px] ${itemClass(item, idx)}`}
            >
              <span className="text-accent/60 font-mono text-xs w-5">{idx + 1}.</span>
              <span className="flex-1 leading-snug">{item}</span>
              {!revealed && <span className="text-charcoal/30 text-xs flex-shrink-0">הסר ✕</span>}
              {revealed && (item === q.items[idx] ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-400 flex-shrink-0" />)}
            </button>
          ))}
        </div>
      </div>

      {/* Remaining pool */}
      {!revealed && remaining.length > 0 && (
        <div>
          <p className="text-xs text-charcoal/40 uppercase tracking-widest mb-2">פריטים:</p>
          <div className="flex flex-wrap gap-2">
            {remaining.map((item) => (
              <button
                key={item}
                onClick={() => addItem(item)}
                className="px-4 py-2.5 rounded-lg border border-warm-gray-light bg-white text-charcoal text-sm hover:border-accent/60 hover:bg-accent/[0.04] transition-all min-h-[44px] leading-snug"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {revealed && (
        <div>
          <p className="text-xs text-charcoal/40 uppercase tracking-widest mb-2">הסדר הנכון:</p>
          <div className="space-y-1">
            {q.items.map((item, idx) => (
              <div key={item} className="flex items-center gap-2 text-sm text-charcoal/70">
                <span className="font-mono text-xs text-accent/60 w-5">{idx + 1}.</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchingRenderer({
  q, answer, revealed, onAnswer,
}: { q: MatchingQuestion; answer: Answer; revealed: boolean; onAnswer: (a: Answer) => void }) {
  const pairs = (answer as { pairs: Array<{ left: string; right: string }> }).pairs;
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [shuffledRight] = useState(() => shuffle(q.pairs.map((p) => p.right)));

  const matchedRights = pairs.map((p) => p.right);
  const matchedLefts = pairs.map((p) => p.left);

  const handleLeft = (left: string) => {
    if (revealed) return;
    if (matchedLefts.includes(left)) {
      onAnswer({ type: 'matching', pairs: pairs.filter((p) => p.left !== left) });
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(left === selectedLeft ? null : left);
  };

  const handleRight = (right: string) => {
    if (revealed || !selectedLeft) return;
    if (matchedRights.includes(right)) return;
    onAnswer({ type: 'matching', pairs: [...pairs, { left: selectedLeft, right }] });
    setSelectedLeft(null);
  };

  const matchColor = (left: string) => {
    if (!revealed) return '';
    const userPair = pairs.find((p) => p.left === left);
    if (!userPair) return 'border-warm-gray-light text-charcoal/40';
    const correct = q.pairs.find((p) => p.left === left)?.right === userPair.right;
    return correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-700';
  };

  const rightMatchColor = (right: string) => {
    if (!revealed) return '';
    const userPair = pairs.find((p) => p.right === right);
    if (!userPair) return 'border-warm-gray-light text-charcoal/40';
    const correct = q.pairs.find((p) => p.right === right && p.left === userPair.left);
    return correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-2">
      {!revealed && (
        <p className="text-xs text-charcoal/40 mb-3">
          בחר פריט בצד ימין, ואז את ההתאמה בצד שמאל
        </p>
      )}

      {/* Mobile: stacked — Left items first, then right items */}
      <div className="sm:hidden space-y-3">
        {/* Left items */}
        <div>
          <p className="text-xs text-charcoal/30 uppercase tracking-widest mb-2">התאם:</p>
          <div className="space-y-2">
            {q.pairs.map((p) => {
              const matched = pairs.find((a) => a.left === p.left);
              const isSelected = selectedLeft === p.left;
              return (
                <button
                  key={p.left}
                  onClick={() => handleLeft(p.left)}
                  disabled={revealed}
                  className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all leading-snug min-h-[48px] ${
                    revealed
                      ? matchColor(p.left)
                      : isSelected
                      ? 'border-accent bg-accent text-bone font-semibold'
                      : matched
                      ? 'border-accent/60 bg-accent/[0.06] text-charcoal'
                      : 'border-warm-gray-light bg-white text-charcoal hover:border-accent/40'
                  }`}
                >
                  {p.left}
                  {matched && !revealed && (
                    <span className="block text-xs text-accent/60 mt-0.5">← {matched.right}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right items */}
        {!revealed && (
          <div>
            <p className="text-xs text-charcoal/30 uppercase tracking-widest mb-2">אפשרויות:</p>
            <div className="space-y-2">
              {shuffledRight.map((right) => {
                const isMatched = matchedRights.includes(right);
                return (
                  <button
                    key={right}
                    onClick={() => handleRight(right)}
                    disabled={isMatched}
                    className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all leading-snug min-h-[48px] ${
                      isMatched
                        ? 'border-accent/30 bg-accent/[0.04] text-charcoal/40'
                        : selectedLeft
                        ? 'border-accent/50 bg-white text-charcoal hover:border-accent hover:bg-accent/[0.06] font-medium'
                        : 'border-warm-gray-light bg-white text-charcoal/60'
                    }`}
                  >
                    {right}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {revealed && (
          <div className="mt-2 pt-3 border-t border-warm-gray-light">
            <p className="text-xs text-charcoal/40 mb-2">ההתאמות הנכונות:</p>
            <div className="space-y-1">
              {q.pairs.map((p) => (
                <div key={p.left} className="flex items-center gap-2 text-xs text-charcoal/60">
                  <span className="font-semibold">{p.left}</span>
                  <span className="text-accent/40">←</span>
                  <span>{p.right}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* sm+: side-by-side grid */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-2 gap-3">
          {/* Left column */}
          <div className="space-y-2">
            {q.pairs.map((p) => {
              const matched = pairs.find((a) => a.left === p.left);
              const isSelected = selectedLeft === p.left;
              return (
                <button
                  key={p.left}
                  onClick={() => handleLeft(p.left)}
                  disabled={revealed}
                  className={`w-full text-right px-3 py-2.5 rounded-xl border text-sm transition-all leading-snug ${
                    revealed
                      ? matchColor(p.left)
                      : isSelected
                      ? 'border-accent bg-accent text-bone'
                      : matched
                      ? 'border-accent/60 bg-accent/[0.06] text-charcoal'
                      : 'border-warm-gray-light bg-white text-charcoal hover:border-accent/40'
                  }`}
                >
                  {p.left}
                  {matched && !revealed && (
                    <span className="block text-xs text-accent/60 mt-0.5 truncate">{matched.right}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right column */}
          <div className="space-y-2">
            {shuffledRight.map((right) => {
              const isMatched = matchedRights.includes(right);
              return (
                <button
                  key={right}
                  onClick={() => handleRight(right)}
                  disabled={revealed || isMatched}
                  className={`w-full text-right px-3 py-2.5 rounded-xl border text-sm transition-all leading-snug ${
                    revealed
                      ? rightMatchColor(right)
                      : isMatched
                      ? 'border-accent/40 bg-accent/[0.04] text-charcoal/50'
                      : selectedLeft
                      ? 'border-accent/40 bg-white text-charcoal hover:border-accent hover:bg-accent/[0.04]'
                      : 'border-warm-gray-light bg-white text-charcoal/50'
                  }`}
                >
                  {right}
                </button>
              );
            })}
          </div>
        </div>

        {revealed && (
          <div className="mt-3 pt-3 border-t border-warm-gray-light">
            <p className="text-xs text-charcoal/40 mb-2">ההתאמות הנכונות:</p>
            <div className="space-y-1">
              {q.pairs.map((p) => (
                <div key={p.left} className="flex items-center gap-2 text-xs text-charcoal/60">
                  <span className="font-semibold">{p.left}</span>
                  <span className="text-accent/40">←</span>
                  <span>{p.right}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>{/* end sm:hidden sm:block wrapper */}
    </div>
  );
}

// ─── Passover decorations ─────────────────────────────────────────────────────

const SEDER_ITEMS = [
  { emoji: '🍷', label: 'כוס' },
  { emoji: '🫓', label: 'מצה' },
  { emoji: '🌿', label: 'מרור' },
  { emoji: '🥚', label: 'ביצה' },
  { emoji: '🥬', label: 'כרפס' },
  { emoji: '🥜', label: 'חרוסת' },
] as const;

function SederItems() {
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5 py-4">
      {SEDER_ITEMS.map(({ emoji, label }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.4 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white border border-accent/25 shadow-sm text-xl sm:text-2xl">
            {emoji}
          </div>
          <span className="text-[9px] tracking-widest text-charcoal/35 uppercase font-medium">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function OrnamentalDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/30 to-accent/30" />
      <span className="text-accent/50 text-sm">✦</span>
      {label && (
        <>
          <span className="font-heading text-accent/40 text-xs tracking-[0.25em]">{label}</span>
          <span className="text-accent/50 text-sm">✦</span>
        </>
      )}
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-accent/30 to-accent/30" />
    </div>
  );
}

function HaggadahBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.04] to-accent/[0.08] px-5 py-4 text-center my-5"
    >
      {/* Decorative corner dots */}
      <span className="absolute top-2 right-3 text-accent/20 text-xs">✦</span>
      <span className="absolute bottom-2 left-3 text-accent/20 text-xs">✦</span>
      <p className="font-heading text-base sm:text-lg text-charcoal/75 leading-loose tracking-wide">
        "הָא לַחְמָא עַנְיָא דִּי אֲכָלוּ אַבְהָתָנָא בְּאַרְעָא דְמִצְרָיִם"
      </p>
      <p className="text-[10px] text-charcoal/35 mt-1.5 tracking-widest uppercase">הגדה של פסח — מגיד</p>
    </motion.div>
  );
}

// ─── Start screen ─────────────────────────────────────────────────────────────

const CATEGORIES: { key: QuizCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'כל הנושאים', icon: '✨' },
  { key: 'haggadah', label: CATEGORY_LABELS.haggadah, icon: CATEGORY_ICONS.haggadah },
  { key: 'halacha', label: CATEGORY_LABELS.halacha, icon: CATEGORY_ICONS.halacha },
  { key: 'minhagim', label: CATEGORY_LABELS.minhagim, icon: CATEGORY_ICONS.minhagim },
  { key: 'torah', label: CATEGORY_LABELS.torah, icon: CATEGORY_ICONS.torah },
  { key: 'chazal', label: CATEGORY_LABELS.chazal, icon: CATEGORY_ICONS.chazal },
  { key: 'zmanim', label: CATEGORY_LABELS.zmanim, icon: CATEGORY_ICONS.zmanim },
];

const AGE_GROUPS: AgeGroup[] = ['kids', 'teens', 'adults'];

function StartScreen({ onStart }: { onStart: (age: AgeGroup, cat: QuizCategory | 'all') => void }) {
  const [age, setAge] = useState<AgeGroup>('teens');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playCount, setPlayCount] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    setLeaderboard(getLeaderboard().slice(0, 10));
    setPlayCount(getPlayCount());
    setStreak(getStreak());
  }, []);

  const available = ALL_QUESTIONS.filter((q) => q.ageGroup === age).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      {/* Hero */}
      <div className="text-center mb-6">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-accent text-xs font-semibold uppercase tracking-[0.25em] mb-4"
        >
          חידון <Diamond /> פסח תשפ״ו
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-heading text-4xl md:text-5xl text-charcoal leading-tight mb-3"
        >
          ליל הסדר
          <br />
          <span className="text-accent">בשאלות ותשובות</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-charcoal/55 text-base max-w-md mx-auto"
        >
          תורה, הגדה, חז"ל, הלכות ומנהגים — לכל גיל ורמה
        </motion.p>
        <div className="flex items-center justify-center gap-4 mt-3">
          {playCount !== null && playCount > 0 && (
            <p className="text-charcoal/25 text-xs tracking-wide">
              ✦ {playCount.toLocaleString('he-IL')} פעמים שוחק עד כה
            </p>
          )}
          {streak !== null && streak.current > 0 && (
            <p className="text-xs font-semibold text-orange-400">
              🔥 {streak.current} {streak.current === 1 ? 'יום' : 'ימים'} ברצף
            </p>
          )}
        </div>
      </div>

      {/* Seder plate items */}
      <SederItems />

      {/* Haggadah quote */}
      <HaggadahBanner />

      <OrnamentalDivider label="בחר רמה" />

      {/* Age group */}
      <div className="mb-6">
        <p className="text-xs text-charcoal/50 uppercase tracking-widest mb-3 font-medium">
          בחר את הרמה שלך
        </p>
        <div className="grid grid-cols-3 gap-3">
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              onClick={() => setAge(a)}
              className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border text-sm transition-all ${
                age === a
                  ? 'border-accent bg-accent text-bone font-semibold shadow-md'
                  : 'border-warm-gray-light bg-white text-charcoal hover:border-accent/50 hover:bg-accent/[0.04]'
              }`}
            >
              <span className="text-2xl">{AGE_GROUP_ICONS[a]}</span>
              <span className="text-xs leading-tight text-center">{AGE_GROUP_LABELS[a]}</span>
            </button>
          ))}
        </div>
      </div>


      {/* Start */}
      <div className="text-center">
        {/* Bank size indicator */}
        <div className="inline-flex items-center gap-2 bg-accent/[0.07] border border-accent/20 rounded-full px-4 py-1.5 mb-4 text-xs text-charcoal/60">
          <span>🗂</span>
          <span>
            {available === 0
              ? 'אין שאלות בסינון זה'
              : <>בנק של <strong className="text-charcoal/80">{available} שאלות</strong> — כל משחק שואב 10 שאלות אקראיות</>}
          </span>
        </div>
        {available === 0 && (
          <p className="text-xs text-red-400 mb-3">בחר נושא אחר</p>
        )}
        <br />
        <button
          onClick={() => available > 0 && onStart(age, 'all')}
          disabled={available === 0}
          className="inline-flex items-center gap-2 bg-accent text-bone px-10 py-3.5 rounded-lg font-semibold text-base hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          התחל חידון
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Festive footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-charcoal/25 mt-8 tracking-[0.3em] font-medium"
      >
        ✦ חג כשר ושמח ✦
      </motion.p>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-warm-gray-light" />
            <p className="text-xs text-charcoal/40 uppercase tracking-widest flex items-center gap-1.5">
              <Medal size={12} /> טבלת שיאים
            </p>
            <div className="flex-1 h-px bg-warm-gray-light" />
          </div>
          <div className="space-y-1.5">
            {leaderboard.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-warm-gray-light text-sm"
              >
                <span className={`font-mono text-xs w-5 text-center font-bold ${
                  i === 0 ? 'text-yellow-500' : i === 1 ? 'text-charcoal/50' : i === 2 ? 'text-amber-600' : 'text-charcoal/30'
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-charcoal font-medium truncate">{e.name}</span>
                <span className="text-xs text-charcoal/40">{AGE_GROUP_ICONS[e.ageGroup]}</span>
                <span className="font-semibold text-accent tabular-nums">{e.score}/{e.total}</span>
                <span className="text-xs text-charcoal/40 w-10 text-left">{e.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Quiz screen ──────────────────────────────────────────────────────────────

function QuizScreen({
  pool,
  totalCount = 10,
  onFinish,
}: {
  pool: QuizQuestion[];
  totalCount: number;
  onFinish: (answers: Answer[], questions: QuizQuestion[]) => void;
}) {
  // ── Adaptive buckets (shuffled once per mount) ─────────────────────
  const bucketsRef = useRef<Record<'easy' | 'medium' | 'hard', QuizQuestion[]> | null>(null);
  if (!bucketsRef.current) {
    bucketsRef.current = {
      easy:   shuffle(pool.filter((q) => q.difficulty === 'easy')),
      medium: shuffle(pool.filter((q) => q.difficulty === 'medium')),
      hard:   shuffle(pool.filter((q) => q.difficulty === 'hard')),
    };
  }
  const usedIds = useRef(new Set<string>());

  function pickNextQ(diff: 'easy' | 'medium' | 'hard'): QuizQuestion | null {
    const order: ('easy' | 'medium' | 'hard')[] =
      diff === 'easy' ? ['easy', 'medium', 'hard'] :
      diff === 'hard' ? ['hard', 'medium', 'easy'] :
                        ['medium', 'hard', 'easy'];
    for (const d of order) {
      const found = bucketsRef.current![d].find((q) => !usedIds.current.has(q.id));
      if (found) { usedIds.current.add(found.id); return found; }
    }
    return null;
  }

  // Pick first question synchronously (medium difficulty)
  const initRef = useRef<QuizQuestion | null>(null);
  if (!initRef.current) initRef.current = pickNextQ('medium');
  const firstQ = initRef.current!;

  // ── State ──────────────────────────────────────────────────────────
  const [displayedQs, setDisplayedQs]           = useState<QuizQuestion[]>([firstQ]);
  const [completedAnswers, setCompletedAnswers]  = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer]        = useState<Answer>(() => initAnswer(firstQ));
  const [difficulty, setDifficulty]              = useState<'easy' | 'medium' | 'hard'>('medium');
  const [revealed, setRevealed]                  = useState(false);
  const [timer, setTimer]                        = useState(30);
  const [leaving, setLeaving]                    = useState(false);

  const index     = completedAnswers.length;
  const q         = displayedQs[index];
  const totalTime = timerForQuestion(q);
  const correct   = revealed && isCorrect(q, currentAnswer);

  // ── hasAnswer / isComplete ─────────────────────────────────────────
  const hasAnswer = (() => {
    switch (currentAnswer.type) {
      case 'multiple-choice':
      case 'who-said':
        return (currentAnswer as { selected: number | null }).selected !== null;
      case 'true-false':
        return (currentAnswer as { selected: boolean | null }).selected !== null;
      case 'fill-blank':
        return (currentAnswer as { text: string }).text.trim().length > 0;
      case 'ordering':
        return (currentAnswer as { order: string[] }).order.length > 0;
      case 'matching':
        return (currentAnswer as { pairs: Array<{ left: string; right: string }> }).pairs.length > 0;
    }
  })();

  const isComplete = (() => {
    if (q.type === 'ordering')
      return (currentAnswer as { order: string[] }).order.length === (q as OrderingQuestion).items.length;
    if (q.type === 'matching')
      return (currentAnswer as { pairs: Array<{ left: string; right: string }> }).pairs.length === (q as MatchingQuestion).pairs.length;
    return hasAnswer;
  })();

  // ── Feedback ───────────────────────────────────────────────────────
  const triggerFeedback = useCallback((wasCorrect: boolean) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(wasCorrect ? [60] : [80, 60, 80]);
    }
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (wasCorrect) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch { /* silent */ }
  }, []);

  // ── Reveal ─────────────────────────────────────────────────────────
  const reveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    triggerFeedback(isCorrect(q, currentAnswer));
  }, [revealed, triggerFeedback, q, currentAnswer]);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (revealed) return;
    setTimer(totalTime);
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { reveal(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [index, revealed, reveal, totalTime]);

  // ── Next question (adaptive) ───────────────────────────────────────
  const goNext = () => {
    const wasCorrect    = isCorrect(q, currentAnswer);
    const newCompleted  = [...completedAnswers, currentAnswer];
    const newDisplayed  = displayedQs;

    if (newCompleted.length >= totalCount) {
      setLeaving(true);
      setTimeout(() => onFinish(newCompleted, newDisplayed), 320);
      return;
    }

    const newDiff = nextDifficulty(difficulty, wasCorrect);
    const nextQ   = pickNextQ(newDiff);

    setLeaving(true);
    setTimeout(() => {
      setCompletedAnswers(newCompleted);
      if (nextQ) {
        setDisplayedQs([...newDisplayed, nextQ]);
        setCurrentAnswer(initAnswer(nextQ));
      }
      setDifficulty(newDiff);
      setRevealed(false);
      setLeaving(false);
    }, 320);
  };

  // ── JSX ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: leaving ? 0 : 1, x: leaving ? -40 : 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto px-4 py-6"
    >
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-charcoal/50 mb-2">
          <span>שאלה {index + 1} מתוך {totalCount}</span>
          <div className="flex items-center gap-2">
            <TypeBadge type={q.type} />
            <CategoryBadge category={q.category} />
          </div>
        </div>
        <div className="h-1.5 bg-bone-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: '#8D775F' }}
            initial={{ width: `${(index / totalCount) * 100}%` }}
            animate={{ width: `${((index + 1) / totalCount) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question card */}
      <motion.div
        key={`card-${index}`}
        animate={revealed && !correct ? { x: [0, -8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="bg-white rounded-2xl p-6 md:p-8 mb-5 shadow-sm"
        style={{ border: '1px solid #E8E7E3', borderTop: '2px solid #8D775F' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="text-xl md:text-2xl text-charcoal font-heading leading-snug flex-1">
            {getQuestionText(q)}
          </h2>
          {!revealed
            ? <TimerRing seconds={timer} total={totalTime} />
            : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                className="flex-shrink-0 mt-1"
              >
                {correct
                  ? <CheckCircle size={32} className="text-green-500" />
                  : <XCircle size={32} className="text-red-400" />}
              </motion.div>
            )
          }
        </div>

        {/* Renderer */}
        {(q.type === 'multiple-choice' || q.type === 'who-said') && (
          <MultipleChoiceRenderer
            q={q as MultipleChoiceQuestion | WhoSaidQuestion}
            answer={currentAnswer}
            revealed={revealed}
            onAnswer={setCurrentAnswer}
          />
        )}
        {q.type === 'true-false' && (
          <TrueFalseRenderer
            q={q as TrueFalseQuestion}
            answer={currentAnswer}
            revealed={revealed}
            onAnswer={setCurrentAnswer}
          />
        )}
        {q.type === 'fill-blank' && (
          <FillBlankRenderer
            q={q as FillBlankQuestion}
            answer={currentAnswer}
            revealed={revealed}
            onAnswer={setCurrentAnswer}
          />
        )}
        {q.type === 'ordering' && (
          <OrderingRenderer
            key={q.id}
            q={q as OrderingQuestion}
            answer={currentAnswer}
            revealed={revealed}
            onAnswer={setCurrentAnswer}
          />
        )}
        {q.type === 'matching' && (
          <MatchingRenderer
            key={q.id}
            q={q as MatchingQuestion}
            answer={currentAnswer}
            revealed={revealed}
            onAnswer={setCurrentAnswer}
          />
        )}

        {/* Explanation */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-5 pt-5 border-t border-warm-gray-light"
            >
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">הסבר</p>
              <p className="text-sm text-charcoal/70 leading-relaxed">{q.explanation}</p>
              {q.source && (
                <p className="text-[11px] text-charcoal/30 mt-2 font-mono tracking-wide">
                  מקור: {q.source}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Check / Next button */}
      <div className="text-center space-y-2">
        {!revealed && isComplete && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={reveal}
              className="inline-flex items-center gap-2 bg-charcoal text-bone px-8 py-3 rounded-lg font-semibold hover:bg-charcoal/80 transition-colors"
            >
              בדוק תשובה
            </button>
          </motion.div>
        )}
        <AnimatePresence>
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 bg-accent text-bone px-8 py-3 rounded-lg font-semibold hover:bg-accent-dark transition-colors"
              >
                {index + 1 < totalCount ? 'שאלה הבאה' : 'לתוצאות'}
                <ChevronLeft size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  questions,
  answers,
  onRestart,
  onChangeSettings,
}: {
  questions: QuizQuestion[];
  answers: Answer[];
  onRestart: () => void;
  onChangeSettings: () => void;
}) {
  const score    = answers.filter((a, i) => isCorrect(questions[i], a)).length;
  const pct      = Math.round((score / questions.length) * 100);
  const ageGroup = questions[0]?.ageGroup ?? 'adults';
  const { title, body } = scoreMessage(score, questions.length);

  const [name, setName]   = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!name.trim() || saved) return;
    saveToLeaderboard({
      name: name.trim(),
      score,
      total: questions.length,
      pct,
      ageGroup,
      date: new Date().toISOString(),
    });
    setSaved(true);
  };

  const handleWhatsApp = () => {
    const ageLabel = AGE_GROUP_LABELS[ageGroup];
    const text = `🍷 חידון פסח תשפ"ו — רמת ${ageLabel}\nענתי ${score}/${questions.length} (${pct}%) — ${title}\nנסה גם אתה: ${QUIZ_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const catStats = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const qs = questions.filter((q) => q.category === key);
    if (qs.length === 0) return null;
    const correct = qs.filter((q) => {
      const idx = questions.indexOf(q);
      return isCorrect(q, answers[idx]);
    }).length;
    return { key, label, correct, total: qs.length };
  }).filter(Boolean) as { key: string; label: string; correct: number; total: number }[];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      {/* Score hero */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-accent bg-accent/[0.06] mb-5"
        >
          <Trophy size={40} className="text-accent" />
        </motion.div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="font-heading text-6xl text-charcoal">{score}</span>
          <span className="text-2xl text-charcoal/40 mt-3">/ {questions.length}</span>
        </div>
        <h2 className="font-heading text-2xl text-charcoal mb-2">{title}</h2>
        <p className="text-charcoal/60 text-sm max-w-sm mx-auto">{body}</p>
        {score === questions.length && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="font-heading text-accent text-lg mt-3 tracking-wide"
          >
            🏛️ לשנה הבאה בירושלים!
          </motion.p>
        )}
      </div>

      {/* Category breakdown */}
      {catStats.length > 1 && (
        <div className="bg-white border border-warm-gray-light rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers size={13} />
            פירוט לפי נושא
          </p>
          <div className="space-y-3">
            {catStats.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-charcoal/70">{CATEGORY_ICONS[s.key as QuizCategory]} {s.label}</span>
                  <span className="font-semibold text-charcoal">{s.correct}/{s.total}</span>
                </div>
                <div className="h-1.5 bg-bone-dark rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.correct / s.total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.correct === s.total ? '#22c55e' : '#8D775F' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-question review */}
      <div className="bg-white border border-warm-gray-light rounded-2xl p-5 mb-6 shadow-sm">
        <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-4">
          סיכום שאלות
        </p>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const correct = isCorrect(q, answers[i]);
            return (
              <div key={q.id} className="flex items-start gap-3 text-sm">
                {correct
                  ? <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  : <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />}
                <span className="text-charcoal/70 leading-snug">{getQuestionText(q)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard save */}
      <div className="bg-white border border-warm-gray-light rounded-2xl p-5 mb-5 shadow-sm">
        <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Medal size={13} />
          שמור לטבלת השיאים
        </p>
        {saved ? (
          <p className="text-sm text-green-600 flex items-center gap-1.5">
            <CheckCircle size={15} /> נשמר! תוצאתך מופיעה בטבלה.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              dir="rtl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="השם שלך..."
              maxLength={20}
              className="flex-1 px-3 py-2 rounded-lg border border-warm-gray-light bg-bone text-sm text-charcoal placeholder-charcoal/30 outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-2 bg-accent text-bone text-sm font-semibold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-30"
            >
              שמור
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        <button
          onClick={handleWhatsApp}
          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1ebe5a] transition-colors"
        >
          <Share2 size={15} />
          שתף בוואטסאפ
        </button>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 bg-accent text-bone px-6 py-3 rounded-lg font-semibold hover:bg-accent-dark transition-colors"
        >
          <RotateCcw size={15} />
          שחק שוב
        </button>
        <button
          onClick={onChangeSettings}
          className="inline-flex items-center gap-2 border border-accent text-accent px-6 py-3 rounded-lg font-semibold hover:bg-accent/[0.06] transition-colors"
        >
          רמה אחרת
        </button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-xs text-charcoal/25 mt-6 tracking-[0.3em] font-medium"
      >
        ✦ חג כשר ושמח ✦
      </motion.p>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PassoverQuiz() {
  const [screen, setScreen]         = useState<Screen>('start');
  const [quizPool, setQuizPool]     = useState<QuizQuestion[]>([]);
  const [quizKey, setQuizKey]       = useState(0);
  const [questions, setQuestions]   = useState<QuizQuestion[]>([]);
  const [answers, setAnswers]       = useState<Answer[]>([]);
  const [currentAge, setCurrentAge] = useState<AgeGroup>('teens');
  const [currentCat, setCurrentCat] = useState<QuizCategory | 'all'>('all');

  const handleStart = (age: AgeGroup, cat: QuizCategory | 'all') => {
    setCurrentAge(age);
    setCurrentCat(cat);
    setQuizPool(buildPool(age, cat));
    setQuizKey((k) => k + 1);
    setAnswers([]);
    setScreen('quiz');
    hitCounter();
    hitStreak();
  };

  const handleFinish = (ans: Answer[], qs: QuizQuestion[]) => {
    setAnswers(ans);
    setQuestions(qs);
    setScreen('results');
  };

  const handleRestart = () => {
    setQuizPool(buildPool(currentAge, currentCat));
    setQuizKey((k) => k + 1);
    setAnswers([]);
    setScreen('quiz');
    hitCounter();
    hitStreak();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-bone" style={{
      backgroundImage: 'radial-gradient(circle, #c8b8a2 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #8D775F, #C8A04A, #8D775F)' }} />

      {/* Header */}
      <div className="border-b border-warm-gray-light bg-bone/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent text-sm font-semibold">
            <span>🍷</span>
            <span>חידון פסח תשפ"ו</span>
          </div>
          {screen !== 'start' && (
            <button
              onClick={() => setScreen('start')}
              className="text-xs text-charcoal/40 hover:text-charcoal transition-colors"
            >
              ← חזרה לתפריט
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'start' && (
          <StartScreen key="start" onStart={handleStart} />
        )}
        {screen === 'quiz' && (
          <QuizScreen key={`quiz-${quizKey}`} pool={quizPool} totalCount={10} onFinish={handleFinish} />
        )}
        {screen === 'results' && (
          <ResultsScreen
            key="results"
            questions={questions}
            answers={answers}
            onRestart={handleRestart}
            onChangeSettings={() => setScreen('start')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
