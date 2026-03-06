"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "./LangContext";
import { X } from "lucide-react";

type Lang  = "en" | "he";
type State = "idle" | "playing" | "done";

const ROUNDS  = 3;
const LS_KEY  = "precision_highscore";
const HZ      = 0.28;   // slow, deliberate oscillation
const MAX_DEG = 10;     // ±10° range
const JITTER  = 0.25;   // subtle imperfection

const TITLES = [
  { max: 0.05, t_en: "Master Calibrator",  s_en: "Perfect. Are you even human?",         t_he: "מכייל אלוף",      s_he: "מושלם. אנושי אתה בכלל?" },
  { max: 0.30, t_en: "Licensed Engineer",  s_en: "Precision under pressure.",             t_he: "מהנדס מוסמך",     s_he: "דיוק תחת לחץ." },
  { max: 1.00, t_en: "Site Foreman",       s_en: "Good eye. Consistent.",                t_he: "מנהל עבודה",      s_he: "עין טובה. עקבי." },
  { max: 3.00, t_en: "Skilled Tradesman",  s_en: "Keep practicing.",                     t_he: "בעל מלאכה",       s_he: "תמשיך להתאמן." },
  { max: Infinity, t_en: "Apprentice",     s_en: "The bubble has left the level.",       t_he: "שוליית קבלן",     s_he: "הבועה עזבה את הפלס." },
];

function getTitle(avg: number, lang: Lang) {
  const td = TITLES.find(t => avg < t.max) ?? TITLES[TITLES.length - 1];
  return { title: lang === "he" ? td.t_he : td.t_en, sub: lang === "he" ? td.s_he : td.s_en };
}

function scoreColor(deg: number) {
  if (deg < 0.1)  return "#22d35a";
  if (deg < 0.5)  return "#4ade80";
  if (deg < 2.0)  return "#facc15";
  return "#f87171";
}

export interface PrecisionGameProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function PrecisionGame({ onClose, compact = false }: PrecisionGameProps) {
  const { lang } = useLang() as { lang: Lang };
  const isRTL = lang === "he";

  const [state,     setState]     = useState<State>("idle");
  const [round,     setRound]     = useState(1);
  const [scores,    setScores]    = useState<number[]>([]);
  const [locked,    setLocked]    = useState(false);
  const [lockVal,   setLockVal]   = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number | null>(null);

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (lockTimerRef.current) clearTimeout(lockTimerRef.current); }, []);

  // DOM refs for RAF updates (no React state churn during animation)
  const readoutRef = useRef<HTMLSpanElement>(null);
  const needleRef  = useRef<HTMLDivElement>(null);
  const bubbleRef  = useRef<HTMLDivElement>(null);
  const tRef       = useRef(0);
  const angleRef   = useRef(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v !== null) setHighScore(parseFloat(v));
    } catch {}
  }, []);

  // Animation loop
  useEffect(() => {
    if (state !== "playing" || locked) return;
    let alive = true;
    let prev = 0;

    const tick = (ts: number) => {
      if (!alive) return;
      const dt = prev ? Math.min((ts - prev) / 1000, 0.05) : 0;
      prev = ts;
      tRef.current += dt;
      const t = tRef.current;

      let a = MAX_DEG * Math.sin(t * HZ * Math.PI * 2);
      a += (Math.random() - 0.5) * JITTER;
      angleRef.current = a;

      // Update readout
      if (readoutRef.current) {
        const sign = a >= 0 ? "+" : "−";
        readoutRef.current.textContent = `${sign}${Math.abs(a).toFixed(2)}°`;
        readoutRef.current.style.color = scoreColor(Math.abs(a));
      }

      // Update precision bar needle
      if (needleRef.current) {
        const pct = (a / MAX_DEG) * 44 + 50;
        needleRef.current.style.left = `${Math.min(94, Math.max(6, pct))}%`;
        needleRef.current.style.background = scoreColor(Math.abs(a));
        needleRef.current.style.boxShadow  = `0 0 6px ${scoreColor(Math.abs(a))}80`;
      }

      // Spirit level bubble
      if (bubbleRef.current) {
        const pct = (a / MAX_DEG) * 40 + 50;
        bubbleRef.current.style.left = `${Math.min(90, Math.max(10, pct))}%`;
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { alive = false; };
  }, [state, locked]);

  const lock = useCallback(() => {
    if (state !== "playing" || locked) return;
    const val = parseFloat(Math.abs(angleRef.current).toFixed(2));

    setLocked(true);
    setLockVal(val);

    const newScores = [...scores, val];

    lockTimerRef.current = setTimeout(() => {
      if (round < ROUNDS) {
        setRound(r => r + 1);
        setScores(newScores);
        setLockVal(null);
        tRef.current = Math.random() * 12 + 4;
        setLocked(false);
      } else {
        const avg = parseFloat((newScores.reduce((a, b) => a + b, 0) / newScores.length).toFixed(2));
        setScores(newScores);
        try {
          const prev = localStorage.getItem(LS_KEY);
          if (prev === null || avg < parseFloat(prev)) {
            localStorage.setItem(LS_KEY, avg.toString());
            setHighScore(avg);
          }
        } catch {}
        setLocked(false);
        setLockVal(null);
        setState("done");
      }
    }, 1000);
  }, [state, locked, round, scores]);

  // Spacebar to lock
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); lock(); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [lock]);

  const startGame = () => {
    setRound(1);
    setScores([]);
    setLocked(false);
    setLockVal(null);
    tRef.current = Math.random() * 8 + 2;
    setState("playing");
  };

  const reset = () => { setState("idle"); setRound(1); setScores([]); };

  const avg = scores.length
    ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
    : null;
  const titleData = avg !== null ? getTitle(avg, lang) : null;

  const T = {
    heading: isRTL ? "מעבדת הדיוק" : "Precision Lab",
    sub:     isRTL ? "בדקו את הכשרון ההנדסי שלכם" : "Test your engineering calibration",
    roundOf: isRTL ? `סיבוב ${round} מתוך ${ROUNDS}` : `Round ${round} of ${ROUNDS}`,
    start:   isRTL ? "התחל כיול" : "Begin Calibration",
    tap:     isRTL ? "נעל בדיוק ב-0.00°" : "Lock at exactly 0.00°",
    avgLbl:  isRTL ? "ממוצע" : "Average",
    bestLbl: isRTL ? "שיא אישי" : "Personal Best",
    again:   isRTL ? "נסה שוב" : "Try Again",
    newGame: isRTL ? "משחק חדש" : "New Game",
    rnd:     isRTL ? "ס׳" : "Rnd",
    target:  isRTL ? "יעד: 0.00°" : "Target: 0.00°",
  };

  const dir = isRTL ? "rtl" : "ltr";
  const pad = compact ? "p-6" : "p-8 md:p-12";

  return (
    <div dir={dir} className={`relative bg-charcoal text-bone ${pad} select-none`}>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 end-3 p-2 text-bone/25 hover:text-bone/60 transition-colors"
          aria-label={isRTL ? "סגור" : "Close"}
        >
          <X size={15} />
        </button>
      )}

      {/* Header */}
      <div className={`text-center ${compact ? "mb-6" : "mb-8"}`}>
        <p className="font-heading text-base font-bold tracking-[0.12em] text-accent mb-1">
          {T.heading}
        </p>
        <p className="font-body text-[0.7rem] text-bone/30 tracking-widest">
          {state === "idle"    ? T.sub :
           state === "playing" ? T.roundOf : ""}
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── IDLE ────────────────────────────────────────────────── */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Static preview */}
            <div className="w-full max-w-[260px] mx-auto text-center">
              <div
                className="font-mono font-bold mb-5"
                style={{
                  fontSize: compact ? "3rem" : "3.5rem",
                  color: "rgba(34,211,90,0.12)",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ±0.00°
              </div>
              <div className="relative" style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 9999 }}>
                <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ width: 1, height: 12, background: "rgba(34,211,90,0.15)" }} />
              </div>
            </div>

            {highScore !== null && (
              <p className="font-mono text-xs text-bone/18">
                {T.bestLbl}:{" "}
                <span style={{ color: scoreColor(highScore) }}>{highScore.toFixed(2)}°</span>
              </p>
            )}

            <button
              onClick={startGame}
              className="px-10 py-3.5 bg-accent text-bone font-body text-xs font-bold tracking-[0.22em] uppercase transition-colors hover:bg-accent-dark"
            >
              {T.start}
            </button>
          </motion.div>
        )}

        {/* ── PLAYING ─────────────────────────────────────────────── */}
        {state === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5"
            onClick={lock}
            style={{ cursor: "crosshair" }}
          >
            {/* Main readout */}
            <div className="text-center">
              <p className="font-body text-[0.58rem] uppercase tracking-[0.3em] text-bone/18 mb-2">{T.target}</p>
              <span
                ref={readoutRef}
                className="font-mono font-bold block"
                style={{
                  fontSize: compact ? "3.8rem" : "5rem",
                  fontVariantNumeric: "tabular-nums",
                  color: "#22d35a",
                  letterSpacing: "-0.03em",
                  textShadow: "0 0 28px rgba(34,211,90,0.2)",
                  minWidth: "7ch",
                  display: "inline-block",
                  textAlign: "center",
                }}
              >
                +0.00°
              </span>
            </div>

            {/* Precision bar */}
            <div
              className="relative w-full max-w-[260px] mx-auto"
              style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 9999 }}
            >
              {/* Center reference tick */}
              <div
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: 1, height: 14,
                  background: "rgba(34,211,90,0.3)",
                  transform: "translate(-50%, -50%)",
                }}
              />
              {/* Moving needle */}
              <div
                ref={needleRef}
                className="absolute top-1/2 pointer-events-none"
                style={{
                  left: "50%",
                  width: 2, height: 18,
                  background: "#22d35a",
                  borderRadius: 9999,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 6px rgba(34,211,90,0.5)",
                  willChange: "left",
                }}
              />
            </div>

            {/* Spirit level tube */}
            <div
              className="relative w-full max-w-[200px] mx-auto"
              style={{
                height: 14,
                background: "#070707",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: 9999,
              }}
            >
              <div
                className="absolute top-0 bottom-0 left-1/2 w-px pointer-events-none"
                style={{ background: "rgba(34,211,90,0.15)", marginLeft: "-0.5px" }}
              />
              <div
                ref={bubbleRef}
                className="absolute top-1/2 pointer-events-none"
                style={{
                  left: "50%",
                  width: 9, height: 9,
                  background: "linear-gradient(135deg, #22d35a, #16a34a)",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 5px rgba(34,211,90,0.45)",
                  willChange: "left",
                }}
              />
            </div>

            {/* Lock feedback */}
            <AnimatePresence>
              {locked && lockVal !== null && (
                <motion.div
                  key="lockval"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-center"
                >
                  <p className="font-body text-[0.58rem] uppercase tracking-[0.3em] text-bone/25 mb-1">
                    {isRTL ? "נעול" : "LOCKED"}
                  </p>
                  <p
                    className="font-mono text-2xl font-bold"
                    style={{ color: scoreColor(lockVal), textShadow: `0 0 14px ${scoreColor(lockVal)}50` }}
                  >
                    {lockVal.toFixed(2)}°
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!locked && (
              <p className="font-body text-[0.56rem] uppercase tracking-[0.26em] text-bone/16">
                {T.tap}
              </p>
            )}
          </motion.div>
        )}

        {/* ── DONE ────────────────────────────────────────────────── */}
        {state === "done" && avg !== null && titleData && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            {/* Per-round scores */}
            <div className="flex justify-center gap-8 mb-6">
              {scores.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-lg font-bold" style={{ color: scoreColor(s) }}>
                    {s.toFixed(2)}°
                  </span>
                  <span className="font-body text-[0.5rem] uppercase tracking-[0.22em] text-bone/20">
                    {T.rnd} {i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Average */}
            <div className="mb-5">
              <div
                className="font-mono font-bold"
                style={{
                  fontSize: compact ? "3.5rem" : "4.5rem",
                  color: scoreColor(avg),
                  textShadow: `0 0 30px ${scoreColor(avg)}45`,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {avg.toFixed(2)}°
              </div>
              <div className="font-body text-[0.56rem] uppercase tracking-[0.26em] text-bone/20 mt-1">
                {T.avgLbl}
              </div>
            </div>

            {/* Title */}
            <div className="py-5 border-y border-bone/[0.07] mb-5">
              <div className="font-heading text-xl font-bold mb-1.5" style={{ color: scoreColor(avg) }}>
                {titleData.title}
              </div>
              <div className="font-body text-xs text-bone/32 leading-relaxed">{titleData.sub}</div>
            </div>

            {/* Personal best */}
            {highScore !== null && (
              <p className="font-mono text-[0.58rem] text-bone/16 mb-6">
                {T.bestLbl}:{" "}
                <span style={{ color: scoreColor(highScore) }}>{highScore.toFixed(2)}°</span>
              </p>
            )}

            {/* Buttons */}
            <div className="flex justify-center gap-3">
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-accent text-bone font-body text-[0.6rem] font-bold tracking-[0.2em] uppercase transition-colors hover:bg-accent-dark"
              >
                {T.again}
              </button>
              <button
                onClick={reset}
                className="px-6 py-2.5 border border-bone/[0.1] text-bone/32 hover:text-bone/55 hover:border-bone/18 font-body text-[0.6rem] font-bold tracking-[0.2em] uppercase transition-colors"
              >
                {T.newGame}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
