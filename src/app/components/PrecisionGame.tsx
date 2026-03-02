"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "./LangContext";
import { X } from "lucide-react";

type Lang  = "en" | "he";
type State = "idle" | "playing" | "done";
type Level = 1 | 2 | 3;

const ROUNDS = 3;
const LS_KEY = "precision_highscore";

const LEVELS: Record<Level, { max: number; hz: number; jitter: number; label: string; labelHe: string }> = {
  1: { max: 22, hz: 0.50, jitter: 0,   label: "Journeyman", labelHe: "טירון" },
  2: { max: 28, hz: 1.55, jitter: 1.2, label: "Foreman",    labelHe: "אומן" },
  3: { max: 25, hz: 0.90, jitter: 0.5, label: "Engineer",   labelHe: "מהנדס" },
};

const TITLES = [
  { max: 0.05, t_en: "Master Engineer", s_en: "Perfect calibration. Are you human?",  t_he: "מהנדס על",      s_he: "כיול מושלם. האם אתה אנושי?" },
  { max: 1.00, t_en: "Field Engineer",  s_en: "Precision on site. Impressive.",        t_he: "מהנדס ביצוע",   s_he: "דיוק שדה. מרשים." },
  { max: 5.00, t_en: "Site Manager",    s_en: "Good eye. Practice makes perfect.",     t_he: "מנהל עבודה",    s_he: "עין טובה. תרגול עושה מושלם." },
  { max: Infinity, t_en: "Apprentice",  s_en: "The bubble has left the level.",        t_he: "שוליית קבלן",   s_he: "הבועה עזבה את הפלס." },
];

function getTitle(avg: number, lang: Lang) {
  const td = TITLES.find(t => avg < t.max) ?? TITLES[TITLES.length - 1];
  return { title: lang === "he" ? td.t_he : td.t_en, sub: lang === "he" ? td.s_he : td.s_en };
}

function scoreColor(deg: number) {
  if (deg < 0.1)  return "#22d35a";
  if (deg < 1.0)  return "#4ade80";
  if (deg < 5.0)  return "#facc15";
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
  const [level,     setLevel]     = useState<Level>(1);
  const [round,     setRound]     = useState(1);
  const [scores,    setScores]    = useState<number[]>([]);
  const [locked,    setLocked]    = useState(false);
  const [lockVal,   setLockVal]   = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number | null>(null);

  // Direct DOM refs — avoid 60fps React state updates during animation
  const laserRef   = useRef<HTMLDivElement>(null);
  const laser2Ref  = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const bubbleRef  = useRef<HTMLDivElement>(null);
  const tRef       = useRef(0);
  const angleRef   = useRef(0);
  const angle2Ref  = useRef(0);

  // Load high score once on client
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v !== null) setHighScore(parseFloat(v));
    } catch {}
  }, []);

  // RAF animation loop
  useEffect(() => {
    if (state !== "playing" || locked) return;
    const cfg = LEVELS[level];
    let alive = true;
    let prev = 0;

    const tick = (ts: number) => {
      if (!alive) return;
      const dt = prev ? Math.min((ts - prev) / 1000, 0.05) : 0;
      prev = ts;
      tRef.current += dt;
      const t = tRef.current;

      let a = cfg.max * Math.sin(t * cfg.hz * Math.PI * 2);
      if (cfg.jitter > 0) a += (Math.random() - 0.5) * cfg.jitter * 3;
      angleRef.current = a;

      if (laserRef.current)
        laserRef.current.style.transform = `rotate(${a}deg)`;

      if (readoutRef.current) {
        const sign = a >= 0 ? "+" : "−";
        readoutRef.current.textContent = `${sign}${Math.abs(a).toFixed(1)}°`;
      }

      // Spirit level bubble position
      if (bubbleRef.current) {
        const pct = (a / cfg.max) * 38 + 50;
        bubbleRef.current.style.left = `${Math.min(90, Math.max(10, pct))}%`;
      }

      // Second laser (level 3 dual-axis)
      if (level === 3) {
        const a2 = cfg.max * Math.sin(t * cfg.hz * 1.4 * Math.PI * 2 + 0.9);
        angle2Ref.current = a2;
        if (laser2Ref.current)
          laser2Ref.current.style.transform = `rotate(${90 + a2}deg)`;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => { alive = false; };
  }, [state, locked, level]);

  // Lock the laser on click/tap/spacebar
  const lock = useCallback(() => {
    if (state !== "playing" || locked) return;

    let val = Math.abs(angleRef.current);
    if (level === 3) val = (val + Math.abs(angle2Ref.current)) / 2;
    const rounded = parseFloat(val.toFixed(1));

    setLocked(true);
    setLockVal(rounded);

    const newScores = [...scores, rounded];

    setTimeout(() => {
      if (round < ROUNDS) {
        setRound(r => r + 1);
        setScores(newScores);
        setLockVal(null);
        tRef.current = Math.random() * 15 + 5; // randomise phase so it's not predictable
        setLocked(false);
      } else {
        const avg = parseFloat((newScores.reduce((a, b) => a + b, 0) / newScores.length).toFixed(1));
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
    }, 900);
  }, [state, locked, round, scores, level]);

  // Spacebar to lock
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); lock(); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [lock]);

  const startGame = (l: Level) => {
    setLevel(l);
    setRound(1);
    setScores([]);
    setLocked(false);
    setLockVal(null);
    tRef.current = Math.random() * 10 + 2;
    setState("playing");
  };

  const reset = () => { setState("idle"); setRound(1); setScores([]); };

  const avg = scores.length
    ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
    : null;
  const titleData = avg !== null ? getTitle(avg, lang) : null;

  const T = {
    heading:  isRTL ? "מעבדת הדיוק" : "Precision Lab",
    sub:      isRTL ? "בדקו את הכשרון ההנדסי שלכם" : "Test your engineering calibration",
    choose:   isRTL ? "בחר רמת קושי" : "Choose Difficulty",
    roundOf:  isRTL ? `סיבוב ${round}/${ROUNDS}` : `Round ${round}/${ROUNDS}`,
    tap:      isRTL ? "הקש לנעילה" : "Tap to Lock",
    space:    "SPACE",
    avgLbl:   isRTL ? "ממוצע" : "Avg.",
    bestLbl:  isRTL ? "שיא" : "Best",
    again:    isRTL ? "שחק שוב" : "Play Again",
    newGame:  isRTL ? "משחק חדש" : "New Game",
    rnd:      isRTL ? "ס׳" : "Rnd",
  };

  const dir = isRTL ? "rtl" : "ltr";
  const pad = compact ? "p-5" : "p-7 md:p-10";

  return (
    <div dir={dir} className={`relative bg-charcoal text-bone ${pad} select-none`}>

      {/* Close button (modal mode) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 end-3 p-2 text-bone/30 hover:text-bone transition-colors"
          aria-label={isRTL ? "סגור" : "Close"}
        >
          <X size={16} />
        </button>
      )}

      {/* Header */}
      <div className={`text-center ${compact ? "mb-4" : "mb-7"}`}>
        <p className="font-body text-[0.58rem] font-bold tracking-[0.28em] uppercase text-accent mb-1">
          {T.heading}
        </p>
        {state === "idle"    && <p className="font-body text-[0.68rem] text-bone/30 tracking-wider">{T.sub}</p>}
        {state === "playing" && <p className="font-body text-[0.68rem] text-bone/30 tracking-wider">{T.roundOf}</p>}
      </div>

      <AnimatePresence mode="wait">

        {/* ── IDLE: difficulty picker ───────────────────────────────────────── */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
          >
            <p className="text-center font-body text-[0.55rem] uppercase tracking-[0.24em] text-bone/25 mb-4">
              {T.choose}
            </p>

            <div className={`grid grid-cols-3 gap-3 mx-auto mb-5 ${compact ? "max-w-[280px]" : "max-w-xs"}`}>
              {([1, 2, 3] as Level[]).map(l => (
                <button
                  key={l}
                  onClick={() => startGame(l)}
                  className="flex flex-col items-center gap-2 py-4 border border-bone/[0.07] hover:border-accent/50 hover:bg-accent/[0.04] transition-all duration-200 group"
                >
                  <span className="text-xs tracking-widest" style={{ color: "#22d35a" }}>
                    {"●".repeat(l)}{"○".repeat(3 - l)}
                  </span>
                  <span className="font-body text-[0.53rem] tracking-[0.16em] uppercase text-bone/35 group-hover:text-bone/65 transition-colors">
                    {isRTL ? LEVELS[l].labelHe : LEVELS[l].label}
                  </span>
                </button>
              ))}
            </div>

            {highScore !== null && (
              <p className="text-center font-mono text-[0.62rem] text-bone/18">
                {T.bestLbl}:{" "}
                <span style={{ color: scoreColor(highScore) }}>{highScore.toFixed(1)}°</span>
              </p>
            )}
          </motion.div>
        )}

        {/* ── PLAYING ──────────────────────────────────────────────────────── */}
        {state === "playing" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Laser Instrument viewport */}
            <div
              className="relative mx-auto overflow-hidden cursor-crosshair mb-4"
              style={{
                background: "#080808",
                border: "1px solid rgba(255,255,255,0.05)",
                aspectRatio: level === 3 ? "1 / 1" : "16 / 5",
                maxWidth: compact ? "300px" : "440px",
                boxShadow: "inset 0 0 60px rgba(0,0,0,0.7)",
              }}
              onClick={lock}
            >
              {/* Corner accent marks */}
              {(["top-0 start-0 border-t border-s", "top-0 end-0 border-t border-e",
                 "bottom-0 start-0 border-b border-s", "bottom-0 end-0 border-b border-e"] as const
              ).map((cls, i) => (
                <div key={i} className={`absolute ${cls} border-bone/[0.1] w-4 h-4 pointer-events-none`} />
              ))}

              {/* Centre guide lines */}
              <div className="absolute inset-x-0 top-1/2 h-px pointer-events-none"
                style={{ background: "rgba(255,255,255,0.04)", marginTop: "-0.5px" }} />
              {level === 3 && (
                <div className="absolute inset-y-0 left-1/2 w-px pointer-events-none"
                  style={{ background: "rgba(255,255,255,0.04)", marginLeft: "-0.5px" }} />
              )}

              {/* Target ring — shows where 0° lives */}
              <div
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: 30, height: 30,
                  border: "1px solid rgba(34,211,90,0.18)",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Primary laser line */}
              <div
                ref={laserRef}
                className="absolute pointer-events-none"
                style={{
                  top: "50%", left: "-40%", right: "-40%",
                  height: "1px", marginTop: "-0.5px",
                  transformOrigin: "center center",
                  willChange: "transform",
                  background: "linear-gradient(90deg, transparent 0%, rgba(34,211,90,0.5) 8%, #22d35a 28%, #22d35a 72%, rgba(34,211,90,0.5) 92%, transparent 100%)",
                  boxShadow: "0 0 4px #22d35a, 0 0 16px rgba(34,211,90,0.4), 0 0 40px rgba(34,211,90,0.12)",
                }}
              />

              {/* Secondary laser line — level 3 dual-axis */}
              {level === 3 && (
                <div
                  ref={laser2Ref}
                  className="absolute pointer-events-none"
                  style={{
                    top: "50%", left: "-40%", right: "-40%",
                    height: "1px", marginTop: "-0.5px",
                    transform: "rotate(90deg)",
                    transformOrigin: "center center",
                    willChange: "transform",
                    background: "linear-gradient(90deg, transparent 0%, rgba(34,211,90,0.35) 8%, rgba(34,211,90,0.85) 28%, rgba(34,211,90,0.85) 72%, rgba(34,211,90,0.35) 92%, transparent 100%)",
                    boxShadow: "0 0 4px rgba(34,211,90,0.6), 0 0 14px rgba(34,211,90,0.25)",
                  }}
                />
              )}

              {/* Centre pivot dot */}
              <div
                className="absolute top-1/2 left-1/2 pointer-events-none"
                style={{
                  width: 7, height: 7,
                  background: "#f3f2ee",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 0 2px #080808, 0 0 0 3.5px rgba(255,255,255,0.18)",
                  zIndex: 3,
                }}
              />

              {/* Lock flash overlay */}
              <AnimatePresence>
                {locked && lockVal !== null && (
                  <motion.div
                    key="flash"
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0.22 }} animate={{ opacity: 0 }}
                    transition={{ duration: 0.85 }}
                    style={{ background: scoreColor(lockVal) }}
                  />
                )}
              </AnimatePresence>

              {/* Locked value splash */}
              <AnimatePresence>
                {locked && lockVal !== null && (
                  <motion.div
                    key="lockval"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ scale: 0.45, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span
                      className={`font-mono ${compact ? "text-3xl" : "text-4xl"} font-bold`}
                      style={{ color: scoreColor(lockVal), textShadow: `0 0 22px ${scoreColor(lockVal)}` }}
                    >
                      {lockVal.toFixed(1)}°
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live degree readout */}
            <div className="text-center mb-3">
              <span
                ref={readoutRef}
                className={`font-mono ${compact ? "text-2xl" : "text-3xl"} font-bold`}
                style={{
                  color: "#22d35a",
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 0 14px rgba(34,211,90,0.4)",
                }}
              >
                +0.0°
              </span>
            </div>

            {/* Spirit level bubble track */}
            <div
              className={`relative mx-auto mb-4 ${compact ? "max-w-[220px]" : "max-w-[280px]"}`}
              style={{
                height: 18,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.055)",
                borderRadius: 9999,
              }}
            >
              <div
                className="absolute top-0 bottom-0 left-1/2 w-px pointer-events-none"
                style={{ background: "rgba(34,211,90,0.22)", marginLeft: "-0.5px" }}
              />
              <div
                ref={bubbleRef}
                className="absolute top-1/2 pointer-events-none"
                style={{
                  left: "50%",
                  width: 11, height: 11,
                  background: "linear-gradient(135deg, #22d35a, #16a34a)",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 7px rgba(34,211,90,0.55)",
                  willChange: "left",
                }}
              />
            </div>

            {/* Tap hint */}
            {!locked && (
              <p className="text-center font-body text-[0.55rem] uppercase tracking-[0.2em] text-bone/22">
                {T.tap}
                <kbd className="ms-2 px-1.5 py-0.5 border border-bone/[0.08] text-bone/18 text-[0.52rem] font-mono rounded-none">
                  {T.space}
                </kbd>
              </p>
            )}
          </motion.div>
        )}

        {/* ── DONE: results screen ─────────────────────────────────────────── */}
        {state === "done" && avg !== null && titleData && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            {/* Per-round scores */}
            <div className="flex justify-center gap-5 mb-5">
              {scores.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span
                    className={`font-mono ${compact ? "text-base" : "text-xl"} font-bold`}
                    style={{ color: scoreColor(s) }}
                  >
                    {s.toFixed(1)}°
                  </span>
                  <span className="font-body text-[0.52rem] uppercase tracking-widest text-bone/22">
                    {T.rnd} {i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Average */}
            <div className="mb-4">
              <div
                className={`font-mono ${compact ? "text-4xl" : "text-5xl"} font-bold`}
                style={{ color: scoreColor(avg), textShadow: `0 0 28px ${scoreColor(avg)}70` }}
              >
                {avg.toFixed(1)}°
              </div>
              <div className="font-body text-[0.55rem] uppercase tracking-[0.22em] text-bone/22 mt-1">
                {T.avgLbl}
              </div>
            </div>

            {/* Title */}
            <div className="py-4 border-y border-bone/[0.06] mb-4">
              <div
                className={`font-heading ${compact ? "text-xl" : "text-2xl"} font-bold mb-1`}
                style={{ color: scoreColor(avg) }}
              >
                {titleData.title}
              </div>
              <div className="font-body text-xs text-bone/38">{titleData.sub}</div>
            </div>

            {/* Personal best */}
            {highScore !== null && (
              <p className="font-mono text-[0.58rem] text-bone/18 mb-5">
                {T.bestLbl}:{" "}
                <span style={{ color: scoreColor(highScore) }}>{highScore.toFixed(1)}°</span>
              </p>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => startGame(level)}
                className="px-5 py-2 bg-accent text-bone font-body text-[0.58rem] font-semibold tracking-[0.18em] uppercase transition-colors hover:bg-accent-dark"
              >
                {T.again}
              </button>
              <button
                onClick={reset}
                className="px-5 py-2 border border-bone/[0.1] text-bone/38 hover:text-bone hover:border-bone/22 font-body text-[0.58rem] font-semibold tracking-[0.18em] uppercase transition-colors"
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
