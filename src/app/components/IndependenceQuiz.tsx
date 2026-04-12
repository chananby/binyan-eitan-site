'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, ChevronLeft, RotateCcw, Share2 } from 'lucide-react';
import {
  ALL_QUESTIONS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DIFFICULTY_LABELS,
  type IndependenceQuestion,
} from '../../lib/independence-quiz-data';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUIZ_URL  = 'https://binyaneitan.com/he/independence-quiz';
const Q_PER_RUN = 15; // questions per session

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(): IndependenceQuestion[] {
  // Stratified: take a proportional mix of easy/medium/hard
  const easy   = shuffle(ALL_QUESTIONS.filter(q => q.difficulty === 'easy'));
  const medium = shuffle(ALL_QUESTIONS.filter(q => q.difficulty === 'medium'));
  const hard   = shuffle(ALL_QUESTIONS.filter(q => q.difficulty === 'hard'));
  return [...easy.slice(0, 5), ...medium.slice(0, 6), ...hard.slice(0, 4)].slice(0, Q_PER_RUN);
}

function scoreEmoji(pct: number): string {
  if (pct === 100) return '🏆';
  if (pct >= 80)  return '🌟';
  if (pct >= 60)  return '✡️';
  if (pct >= 40)  return '📖';
  return '💪';
}

function scoreMessage(pct: number): string {
  if (pct === 100) return 'מושלם! ידע מלא כ"מגיד"';
  if (pct >= 80)  return 'מעולה! ציוני אמיתי';
  if (pct >= 60)  return 'יפה! בסיס טוב של ידע';
  if (pct >= 40)  return 'לא רע — יש עוד מה ללמוד';
  return 'שווה לחזור ולקרוא — עם ישראל חי!';
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center gap-8 py-8"
    >
      {/* Flag stripe */}
      <div className="w-full h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #003F8C 0%, #4A8FE0 50%, #003F8C 100%)' }} />

      {/* Star of David decoration */}
      <div className="text-6xl">✡️</div>

      <div>
        <p className="text-sm font-semibold tracking-widest mb-2" style={{ color: '#4A8FE0' }}>
          יום העצמאות תשפ"ה
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#003F8C' }}>
          חידון עצמאות
        </h1>
        <p className="text-lg text-charcoal/70 max-w-md mx-auto leading-relaxed">
          {Q_PER_RUN} שאלות על ההיסטוריה, הציונות, המנהיגים והמלחמות שהולידו את מדינת ישראל
        </p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-sm">
        {(['history', 'zionism', 'wars', 'leaders', 'symbols', 'geography', 'culture'] as const).map(cat => (
          <span
            key={cat}
            className="text-xs px-3 py-1 rounded-full border font-medium"
            style={{ borderColor: '#003F8C33', color: '#003F8C', background: '#003F8C0D' }}
          >
            {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
        style={{ background: 'linear-gradient(135deg, #003F8C, #1B6FD8)' }}
      >
        התחל חידון
      </motion.button>

      {/* Bottom flag stripe */}
      <div className="w-full h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #003F8C 0%, #4A8FE0 50%, #003F8C 100%)' }} />
    </motion.div>
  );
}

// ─── Question Screen ──────────────────────────────────────────────────────────

function QuestionScreen({
  question,
  index,
  total,
  onAnswer,
}: {
  question: IndependenceQuestion;
  index: number;
  total: number;
  onAnswer: (i: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  function choose(i: number) {
    if (answered) return;
    setSelected(i);
  }

  function next() {
    if (!answered) return;
    onAnswer(selected!);
    setSelected(null);
  }

  const progress = ((index) / total) * 100;

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="flex flex-col gap-6"
    >
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs font-medium mb-2" style={{ color: '#003F8C' }}>
          <span>שאלה {index + 1} מתוך {total}</span>
          <span className="flex items-center gap-1">
            <span>{CATEGORY_ICONS[question.category]}</span>
            <span>{CATEGORY_LABELS[question.category]}</span>
            <span className="mx-1">·</span>
            <span>{DIFFICULTY_LABELS[question.difficulty]}</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #003F8C, #1B6FD8)', width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Image */}
      {question.image && (
        <div
          className="w-full flex items-center justify-center rounded-2xl overflow-hidden border"
          style={{ background: '#EEF3FB', borderColor: '#003F8C22', minHeight: '160px', maxHeight: '260px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.image}
            alt={`תמונה לשאלה: ${question.question}`}
            style={{ maxHeight: '260px', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Question */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: '#F0F5FF', borderColor: '#003F8C22' }}
      >
        <p className="text-lg font-semibold leading-relaxed text-charcoal text-right">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {question.options.map((opt, i) => {
          let bg    = 'white';
          let border = '#D1D5DB';
          let text  = '#1A1A2E';

          if (answered) {
            if (i === question.correctIndex) {
              bg = '#F0FFF4'; border = '#22C55E'; text = '#15803D';
            } else if (i === selected) {
              bg = '#FFF0F0'; border = '#EF4444'; text = '#DC2626';
            } else {
              bg = '#F9FAFB'; border = '#E5E7EB'; text = '#9CA3AF';
            }
          } else if (selected === i) {
            bg = '#EFF6FF'; border = '#3B82F6'; text = '#1D4ED8';
          }

          return (
            <motion.button
              key={i}
              whileHover={!answered ? { scale: 1.01 } : {}}
              whileTap={!answered ? { scale: 0.99 } : {}}
              onClick={() => choose(i)}
              className="w-full text-right p-4 rounded-xl border-2 font-medium transition-colors text-sm md:text-base"
              style={{ background: bg, borderColor: border, color: text }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{opt}</span>
                <span className="shrink-0">
                  {answered && i === question.correctIndex && <CheckCircle size={18} className="text-green-500" />}
                  {answered && i === selected && i !== question.correctIndex && <XCircle size={18} className="text-red-500" />}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-4 text-sm leading-relaxed text-right"
            style={{ background: '#EFF6FF', borderRight: '4px solid #3B82F6', color: '#1E3A5F' }}
          >
            {question.explanation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      {answered && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={next}
          className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-md"
          style={{ background: 'linear-gradient(135deg, #003F8C, #1B6FD8)' }}
        >
          <ChevronLeft size={18} />
          {index + 1 < total ? 'שאלה הבאה' : 'לתוצאות'}
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  questions,
  answers,
  onRestart,
}: {
  questions: IndependenceQuestion[];
  answers: number[];
  onRestart: () => void;
}) {
  const score   = answers.filter((a, i) => a === questions[i].correctIndex).length;
  const total   = questions.length;
  const pct     = Math.round((score / total) * 100);
  const [showReview, setShowReview] = useState(false);

  const shareText = `🇮🇱 חידון יום העצמאות\nקיבלתי ${score}/${total} (${pct}%)\n${scoreEmoji(pct)} ${scoreMessage(pct)}\n\nנסו גם אתם: ${QUIZ_URL}`;

  function handleShare() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8"
    >
      {/* Score card */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-center text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #003F8C, #1B6FD8)' }}
      >
        <div className="text-5xl mb-3">{scoreEmoji(pct)}</div>
        <div className="text-6xl font-bold mb-1">{score}<span className="text-3xl opacity-70">/{total}</span></div>
        <div className="text-xl opacity-90 mb-4">{pct}%</div>
        <p className="text-base opacity-80">{scoreMessage(pct)}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 font-semibold transition-colors hover:bg-blue-50"
          style={{ borderColor: '#003F8C', color: '#003F8C' }}
        >
          <RotateCcw size={16} />
          חידון נוסף
        </button>
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
          style={{ background: '#25D366' }}
        >
          <Share2 size={16} />
          שתף ב-WhatsApp
        </button>
      </div>

      {/* Wrong-answer review toggle */}
      {answers.some((a, i) => a !== questions[i].correctIndex) && (
        <div>
          <button
            onClick={() => setShowReview(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: '#D1D5DB', color: '#374151' }}
          >
            <Trophy size={16} />
            {showReview ? 'הסתר סקירת שגיאות' : 'סקירת שאלות שהחמצתי'}
          </button>

          <AnimatePresence>
            {showReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-4 mt-4 overflow-hidden"
              >
                {questions.map((q, i) => {
                  if (answers[i] === q.correctIndex) return null;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl p-4 border-2 text-right text-sm"
                      style={{ borderColor: '#EF4444', background: '#FFF5F5' }}
                    >
                      <p className="font-semibold text-charcoal mb-2">{q.question}</p>
                      <p className="text-red-600 mb-1 flex items-center gap-1 justify-end">
                        ענית: {q.options[answers[i]]}
                        <XCircle size={13} className="shrink-0" />
                      </p>
                      <p className="text-green-700 mb-2 flex items-center gap-1 justify-end">
                        נכון: {q.options[q.correctIndex]}
                        <CheckCircle size={13} className="shrink-0" />
                      </p>
                      <p className="text-charcoal/70 leading-relaxed border-t pt-2 mt-2" style={{ borderColor: '#FED7D7' }}>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IndependenceQuiz() {
  const [screen, setScreen]       = useState<'welcome' | 'quiz' | 'results'>('welcome');
  const [questions, setQuestions] = useState<IndependenceQuestion[]>([]);
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState<number[]>([]);

  const startQuiz = useCallback(() => {
    const qs = pickQuestions();
    setQuestions(qs);
    setCurrent(0);
    setAnswers([]);
    setScreen('quiz');
  }, []);

  function handleAnswer(chosen: number) {
    const next = [...answers, chosen];
    setAnswers(next);
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
    } else {
      setScreen('results');
    }
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Top flag bar */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #003F8C 0%, #4A8FE0 50%, #003F8C 100%)' }} />

      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {/* Header badge */}
        <div className="flex justify-center mb-8">
          <span
            className="text-xs font-bold tracking-widest px-4 py-1.5 rounded-full border"
            style={{ color: '#003F8C', borderColor: '#003F8C44', background: '#003F8C0D' }}
          >
            🇮🇱 עצמאות ישראל
          </span>
        </div>

        <AnimatePresence mode="wait">
          {screen === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WelcomeScreen onStart={startQuiz} />
            </motion.div>
          )}

          {screen === 'quiz' && questions.length > 0 && (
            <motion.div key={`q-${current}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuestionScreen
                question={questions[current]}
                index={current}
                total={questions.length}
                onAnswer={handleAnswer}
              />
            </motion.div>
          )}

          {screen === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultsScreen
                questions={questions}
                answers={answers}
                onRestart={startQuiz}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom flag bar */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #003F8C 0%, #4A8FE0 50%, #003F8C 100%)' }} />
    </div>
  );
}
