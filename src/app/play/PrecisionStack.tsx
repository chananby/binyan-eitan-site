"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "start" | "playing" | "over";

interface Block {
  x: number;
  width: number;
  isPerfect: boolean;
}

interface FallingChunk {
  x: number;
  y: number;
  width: number;
  vy: number;
  vx: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface GS {
  phase: Phase;
  score: number;
  blocks: Block[];
  beamX: number;
  beamWidth: number;
  beamVel: number;
  cameraY: number;
  targetCameraY: number;
  falling: FallingChunk[];
  particles: Particle[];
  perfectFlash: number;
}

export interface PrecisionStackProps {
  /** When provided: shows X close button, removes back-to-site link, uses modal height */
  onClose?: () => void;
  /** Compact inline mode: auto-starts, smaller height, no start screen */
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BH         = 32;    // block height px
const INIT_W     = 200;   // initial beam width px
const PERFECT_PX = 8;     // perfect-zone tolerance px
const BASE_SPD   = 2.4;   // starting beam speed px/frame
const SPD_GAIN   = 0.045; // speed increase per placed block
const GROUND_PAD = 80;    // px from canvas bottom to ground line
const TARGET_Y   = 0.38;  // beam target: fraction from top of canvas

// Brand colours
const BG1      = "#0d0b09";
const BG2      = "#1f1a14";
const BONE     = "rgba(243,242,238,";
const BRONZE   = "rgba(141,119,95,";
const GOLD     = "rgba(201,169,110,";

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO — Web Audio API (respects system silent mode automatically)
// ─────────────────────────────────────────────────────────────────────────────

function playDrop(ctx: AudioContext) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(210, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(88, ctx.currentTime + 0.11);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
  o.start(); o.stop(ctx.currentTime + 0.15);
}

function playPerfect(ctx: AudioContext) {
  // Three-note ascending arpeggio: C5 → E5 → G5
  ([523, 659, 784] as const).forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.085;
    g.gain.setValueAtTime(0.13, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.start(t); o.stop(t + 0.42);
  });
}

function playGameOver(ctx: AudioContext) {
  // Two descending notes
  ([220, 165] as const).forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.27;
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.start(t); o.stop(t + 0.48);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function groundY(H: number)  { return H - GROUND_PAD; }
function blockTopY(i: number, H: number, camY: number) {
  return groundY(H) - (i + 1) * BH + camY;
}
function beamTopY(numBlocks: number, H: number, camY: number) {
  return groundY(H) - numBlocks * BH + camY;
}
function calcTargetCam(numBlocks: number, H: number): number {
  const natY = groundY(H) - numBlocks * BH;
  return Math.max(0, H * TARGET_Y - natY);
}

function spawnParticles(gs: GS, cx: number, cy: number) {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 4.5 + 0.8;
    gs.particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2.2,
      radius: Math.random() * 3 + 1,
      life: 55 + Math.random() * 20,
      maxLife: 75,
    });
  }
}

function freshGS(W: number, H: number): GS {
  return {
    phase: "start",
    score: 0,
    blocks: [{ x: (W - INIT_W) / 2, width: INIT_W, isPerfect: false }],
    beamX: 0, beamWidth: INIT_W, beamVel: BASE_SPD,
    cameraY: 0, targetCameraY: 0,
    falling: [], particles: [], perfectFlash: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS DRAW
// ─────────────────────────────────────────────────────────────────────────────

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  { beam = false, perfect = false, flash = false } = {},
) {
  if (w <= 1) return;
  const gold  = perfect || flash;
  const alive = beam || perfect;

  ctx.shadowBlur  = alive ? 18 : 8;
  ctx.shadowColor = gold   ? `${GOLD}0.5)` : beam ? `${BONE}0.12)` : "rgba(0,0,0,0.4)";

  // Fill
  ctx.fillStyle = gold  ? `${BRONZE}0.44)`
    : beam  ? `${BONE}0.11)`
    : `${BONE}0.08)`;
  ctx.fillRect(x, y, w, BH);

  // Border
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = gold  ? `${GOLD}0.92)` : beam ? `${BONE}0.36)` : `${BONE}0.21)`;
  ctx.lineWidth   = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, BH - 1);

  // Top highlight strip
  ctx.fillStyle = gold ? `${GOLD}0.32)` : `${BONE}0.07)`;
  ctx.fillRect(x + 2, y + 1, w - 4, 2);
}

function render(ctx: CanvasRenderingContext2D, gs: GS, W: number, H: number) {
  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, BG1);
  bg.addColorStop(1, BG2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Giant score watermark
  if (gs.score > 0) {
    ctx.save();
    const fs = Math.min(260, 52 + gs.score * 12);
    ctx.font          = `900 ${fs}px "Inter", system-ui, sans-serif`;
    ctx.textAlign     = "center";
    ctx.textBaseline  = "middle";
    ctx.fillStyle     = `${BONE}0.042)`;
    ctx.fillText(String(gs.score), W / 2, H * 0.5);
    ctx.restore();
  }

  // Ground line
  ctx.strokeStyle = `${BONE}0.07)`;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY(H));
  ctx.lineTo(W, groundY(H));
  ctx.stroke();

  // Stacked blocks
  for (let i = 0; i < gs.blocks.length; i++) {
    const b = gs.blocks[i];
    const y = blockTopY(i, H, gs.cameraY);
    if (y + BH < 0 || y > H + BH) continue;
    drawBlock(ctx, b.x, y, b.width, { perfect: b.isPerfect });
  }

  // Moving beam
  if (gs.phase === "playing") {
    const by = beamTopY(gs.blocks.length, H, gs.cameraY);
    drawBlock(ctx, gs.beamX, by, gs.beamWidth, {
      beam: true,
      flash: gs.perfectFlash > 0,
    });
    if (gs.perfectFlash > 0) gs.perfectFlash--;
  }

  // Falling chunks
  ctx.shadowBlur = 0;
  for (const p of gs.falling) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = `${BONE}0.05)`;
    ctx.fillRect(p.x, p.y, p.width, BH);
    ctx.strokeStyle = `${BONE}0.12)`;
    ctx.lineWidth   = 1;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, BH - 1);
  }
  ctx.globalAlpha = 1;

  // Particles
  ctx.save();
  for (const p of gs.particles) {
    const t = p.life / p.maxLife;
    ctx.globalAlpha = t * t;
    ctx.fillStyle   = "#C9A96E";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (0.3 + t * 0.7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PrecisionStack({ onClose, compact }: PrecisionStackProps = {}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const gsRef       = useRef<GS | null>(null);
  const rafRef      = useRef(0);
  const dimRef      = useRef({ W: 360, H: 600 });
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [phase,   setPhase]   = useState<Phase>(compact ? "playing" : "start");
  const [score,   setScore]   = useState(0);
  const [best,    setBest]    = useState(0);
  const [perfect, setPerfect] = useState(false);

  // Lazy AudioContext — created on first user gesture to satisfy browser policy
  const getAudio = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      return audioCtxRef.current;
    } catch { return null; }
  }, []);

  // Container height
  const containerH = onClose ? "580px" : compact ? "400px" : "100dvh";

  // ── Resize ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = canvas.parentElement!;
      const W = p.clientWidth;
      const H = p.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width        = W * dpr;
      canvas.height       = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      const ctx = canvas.getContext("2d");
      ctx?.scale(dpr, dpr);
      dimRef.current = { W, H };
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Drop ────────────────────────────────────────────────────────────────
  const handleDrop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || gs.phase !== "playing") return;
    const { W, H } = dimRef.current;
    const audio = getAudio();

    const prev = gs.blocks[gs.blocks.length - 1];
    const bL   = gs.beamX,            bR = gs.beamX + gs.beamWidth;
    const pL   = prev.x,              pR = prev.x + prev.width;
    const oL   = Math.max(bL, pL),    oR = Math.min(bR, pR);
    const ow   = oR - oL;

    const by = beamTopY(gs.blocks.length, H, gs.cameraY);

    if (ow <= 0) {
      // Complete miss
      gs.falling.push({ x: bL, y: by, width: gs.beamWidth, vy: 0, vx: gs.beamVel * 0.3, alpha: 1 });
      gs.phase = "over";
      setPhase("over");
      setScore(gs.score);
      setBest(b => Math.max(b, gs.score));
      if (audio) playGameOver(audio);
      return;
    }

    const isPerfect = Math.abs(bL - pL) <= PERFECT_PX && Math.abs(bR - pR) <= PERFECT_PX;
    const finalX    = isPerfect ? pL : oL;
    const finalW    = isPerfect ? prev.width : ow;

    if (isPerfect) {
      spawnParticles(gs, finalX + finalW / 2, by + BH / 2);
      gs.perfectFlash = 22;
      setPerfect(true);
      setTimeout(() => setPerfect(false), 900);
      if (audio) playPerfect(audio);
    } else {
      if (bL < oL) gs.falling.push({ x: bL, y: by, width: oL - bL, vy: 0, vx: -0.9, alpha: 1 });
      if (bR > oR) gs.falling.push({ x: oR, y: by, width: bR - oR, vy: 0, vx:  0.9, alpha: 1 });
      if (audio) playDrop(audio);
    }

    gs.blocks.push({ x: finalX, width: finalW, isPerfect });
    gs.score += 1;

    // Camera: keep the new beam at TARGET_Y
    gs.targetCameraY = calcTargetCam(gs.blocks.length + 1, H);

    // Next beam: flip direction, emerge from the far edge
    const speed    = BASE_SPD + gs.score * SPD_GAIN;
    const nextVel  = gs.beamVel > 0 ? -speed : speed;
    gs.beamWidth   = finalW;
    gs.beamVel     = nextVel;
    gs.beamX       = nextVel > 0 ? 0 : W - finalW;

    setScore(gs.score);
  }, [getAudio]);

  // ── Game loop ────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop);
    const canvas = canvasRef.current;
    const gs     = gsRef.current;
    if (!canvas || !gs) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = dimRef.current;

    // Beam movement
    if (gs.phase === "playing") {
      gs.beamX += gs.beamVel;
      if (gs.beamX <= 0)                   { gs.beamX = 0;               gs.beamVel =  Math.abs(gs.beamVel); }
      if (gs.beamX + gs.beamWidth >= W)    { gs.beamX = W - gs.beamWidth; gs.beamVel = -Math.abs(gs.beamVel); }
    }

    // Smooth camera
    gs.cameraY += (gs.targetCameraY - gs.cameraY) * 0.09;

    // Falling physics
    for (const p of gs.falling) {
      p.vy += 0.45; p.y += p.vy;
      p.x  += p.vx; p.alpha -= 0.017;
    }
    gs.falling = gs.falling.filter(p => p.alpha > 0);

    // Particle physics
    for (const p of gs.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.14; p.life--;
    }
    gs.particles = gs.particles.filter(p => p.life > 0);

    render(ctx, gs, W, H);
  }, []);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { W, H } = dimRef.current;
    const gs = freshGS(W, H);
    if (compact) gs.phase = "playing";
    gsRef.current  = gs;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop, compact]);

  // ── Start / restart ──────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const { W, H } = dimRef.current;
    const gs = freshGS(W, H);
    gs.phase    = "playing";
    gsRef.current = gs;
    setPhase("playing");
    setScore(0);
    setPerfect(false);
    getAudio(); // init AudioContext on user gesture
  }, [getAudio]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") { e.preventDefault(); handleDrop(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [handleDrop]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="relative w-full select-none overflow-hidden"
      style={{ height: containerH, background: BG1 }}
    >
      {/* ── X close button (modal mode) ─────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/10"
          style={{ color: "rgba(243,242,238,0.45)" }}
          aria-label="סגור"
        >
          <X size={18} />
        </button>
      )}

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ touchAction: "none", cursor: phase === "playing" ? "pointer" : "default" }}
        onClick={phase === "playing" ? handleDrop : undefined}
        onTouchStart={phase === "playing"
          ? (e) => { e.preventDefault(); handleDrop(); }
          : undefined}
      />

      {/* ── PERFECT! toast ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {perfect && (
          <motion.div
            key="perfect"
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0,  scale: 1   }}
            exit   ={{ opacity: 0, y: -24, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="absolute inset-x-0 pointer-events-none"
            style={{ top: "30%" }}
          >
            <p
              className="text-center text-2xl font-bold tracking-[0.4em] uppercase"
              style={{ color: "#C9A96E", textShadow: "0 0 40px rgba(201,169,110,0.9)" }}
            >
              PERFECT
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live score ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "playing" && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0  }}
            exit   ={{ opacity: 0 }}
            className="absolute top-6 left-6 text-left"
          >
            <p className="text-[0.6rem] tracking-[0.3em] uppercase mb-0.5"
              style={{ color: "rgba(243,242,238,0.35)" }}>גובה</p>
            <p className={`font-black tabular-nums leading-none ${compact ? "text-3xl" : "text-5xl"}`}
              style={{ color: "rgba(243,242,238,0.92)" }}>{score}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          START SCREEN — not shown in compact mode
      ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "start" && !compact && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit   ={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
            style={{ background: "rgba(13,11,9,0.60)", backdropFilter: "blur(3px)" }}
          >
            {/* Overline */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: 0.2 }}
              className="text-xs tracking-[0.4em] uppercase mb-10"
              style={{ color: "#8D775F" }}
            >
              בנין איתן — הנדסה ובנייה
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: 0.3 }}
              className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-5"
              style={{ color: "rgba(243,242,238,0.96)" }}
            >
              דיוק הוא
              <br />
              <span style={{ color: "#C9A96E" }}>היסוד שלנו</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: 0.4 }}
              className="text-base leading-relaxed mb-8 max-w-xs"
              style={{ color: "rgba(243,242,238,0.42)" }}
            >
              כמה גבוה תצליח לבנות?
            </motion.p>

            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: 0.48 }}
              className="mb-10 w-full max-w-xs text-right space-y-3"
            >
              {([
                { num: "01", he: "הקש, לחץ או Space להנחת הבלוק", en: "Tap, click, or press Space to drop" },
                { num: "02", he: "כוון בדיוק מעל הערימה — דיוק מושלם = בונוס", en: "Align perfectly above the stack — a perfect drop earns a bonus" },
                { num: "03", he: "החטאה מוחלטת? המשחק נגמר", en: "A full miss ends the game" },
              ] as const).map(({ num, he, en }) => (
                <div key={num} className="flex items-start gap-3">
                  <span
                    className="text-[0.55rem] font-bold tracking-widest mt-0.5 shrink-0"
                    style={{ color: "#8D775F" }}
                  >
                    {num}
                  </span>
                  <div>
                    <p className="text-sm leading-snug" style={{ color: "rgba(243,242,238,0.75)" }}>{he}</p>
                    <p className="text-[0.65rem] leading-snug mt-0.5" style={{ color: "rgba(243,242,238,0.28)" }}>{en}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* CTA button */}
            <motion.button
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.04 }}
              whileTap  ={{ scale: 0.97 }}
              onClick={startGame}
              className="px-12 py-4 text-sm font-bold tracking-[0.32em] uppercase"
              style={{ background: "#8D775F", color: "#F3F2EE" }}
            >
              התחל לבנות
            </motion.button>

            {/* Back link — only in standalone page mode */}
            {!onClose && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-8"
              >
                <Link
                  href="/he"
                  className="text-xs tracking-[0.22em] uppercase transition-opacity hover:opacity-60"
                  style={{ color: "rgba(243,242,238,0.28)" }}
                >
                  → חזרה לאתר
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          GAME OVER SCREEN
      ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "over" && (
          <motion.div
            key="over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit   ={{ opacity: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
            style={{ background: "rgba(13,11,9,0.75)", backdropFilter: "blur(8px)" }}
          >
            {/* Score reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.65 }}
              animate={{ opacity: 1, scale: 1    }}
              transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 18 }}
            >
              <p className="text-xs tracking-[0.35em] uppercase mb-4"
                style={{ color: "#8D775F" }}>הגובה שלך</p>
              <p
                className="font-heading font-black tabular-nums leading-none"
                style={{ fontSize: compact ? "clamp(3.5rem,14vw,5rem)" : "clamp(5rem,20vw,7rem)", color: "rgba(243,242,238,0.96)" }}
              >
                {score}
              </p>

              {/* Record badge */}
              <AnimatePresence>
                {score > 0 && score === best && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-3 text-xs tracking-[0.3em] uppercase font-semibold"
                    style={{ color: "#C9A96E" }}
                  >
                    ✦ שיא חדש
                  </motion.p>
                )}
                {score > 0 && score < best && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-2 text-xs"
                    style={{ color: "rgba(243,242,238,0.30)" }}
                  >
                    שיא: {best}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Brand message — only in full / modal mode */}
            {!compact && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0  }}
                transition={{ delay: 0.85 }}
                className="mt-10 mb-10 max-w-sm"
              >
                <p className="text-sm leading-relaxed"
                  style={{ color: "rgba(243,242,238,0.45)" }}>
                  בבנייה אמיתית אין מקום לטעויות.
                </p>
                <p className="text-sm leading-relaxed mt-2 font-semibold"
                  style={{ color: "rgba(243,242,238,0.82)" }}>
                  בבנין איתן — אנחנו מדייקים בכל פעם.
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: compact ? 0.7 : 1.05 }}
              className={`flex flex-col sm:flex-row gap-4 items-center ${compact ? "mt-6" : ""}`}
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap  ={{ scale: 0.97 }}
                onClick={startGame}
                className={`px-10 py-3 text-sm font-bold tracking-[0.3em] uppercase`}
                style={{ background: "#8D775F", color: "#F3F2EE" }}
              >
                שחק שוב
              </motion.button>

              {/* Site link — only in standalone mode */}
              {!onClose && !compact && (
                <Link
                  href="/he"
                  className="px-8 py-4 text-sm font-semibold tracking-[0.22em] uppercase border transition-opacity hover:opacity-70"
                  style={{
                    borderColor: "rgba(243,242,238,0.20)",
                    color: "rgba(243,242,238,0.58)",
                  }}
                >
                  לאתר בנין איתן ←
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
