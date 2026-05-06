"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useLang } from "../LangContext";
import Navbar from "../Navbar";

type Lang      = "en" | "he";
type GameState = "idle" | "playing" | "dead";
type ObsType   = "bricks_low" | "bricks_high" | "cone" | "folder";

interface Obs { x: number; type: ObsType; w: number; h: number }
interface Rect { x: number; y: number; w: number; h: number }

// ── Canvas geometry ──────────────────────────────────────────────────────────
const CW = 800;
const CH = 220;
const GY = 175;   // ground surface Y
const WX = 90;    // worker fixed X
const WW = 28;    // worker width
const WH = 52;    // worker height (feet → crown)

// ── Physics ──────────────────────────────────────────────────────────────────
const GRAVITY    = 0.72;
const JUMP_VEL   = -15.5;
const BASE_SPD   = 4.8;
const MAX_SPD    = 9.5;
const ACCEL      = 0.0012;  // per frame

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  sky0: "#141210", sky1: "#2D2926",
  gnd:  "#2e2720", gndLine: "#8D775F",
  gndTick: "rgba(141,119,95,0.22)",
  // worker
  hat:   "#eab308", hatBrim: "#ca9c00",
  vest:  "#ea580c", stripe: "#fbbf24",
  skin:  "#cc9966", pants: "#2a2520", boots: "#1a1512",
  // obstacles
  brkA: "#b45309", brkB: "#7c3f18", brkMrt: "#5a2e0e",
  coneA: "#f97316", coneB: "#ea580c", coneW: "#f3f2ee",
  fldA: "#d97706", fldB: "#b45309", fldTxt: "#78350f",
  // UI
  star:  "rgba(243,242,238,0.3)",
  bldg:  "rgba(141,119,95,0.06)",
  bldgW: "rgba(141,119,95,0.13)",
  scoreA: "rgba(243,242,238,0.3)",
  scoreB: "#8D775F",
};

const LS_KEY = "crane_run_hs";

// ── Draw: sky + stars ────────────────────────────────────────────────────────
function drawSky(ctx: CanvasRenderingContext2D, sx: number) {
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, C.sky0); g.addColorStop(1, C.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, GY);

  const STARS = [[80,22],[210,14],[340,38],[490,18],[620,44],[740,10],[160,50],[530,28]];
  ctx.fillStyle = C.star;
  for (const [ox, oy] of STARS) {
    const px = ((ox - sx * 0.015) % CW + CW) % CW;
    ctx.beginPath(); ctx.arc(px, oy, 1, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Draw: background skyline (parallax 0.08x) ────────────────────────────────
function drawSkyline(ctx: CanvasRenderingContext2D, sx: number) {
  const ox = -((sx * 0.08) % CW);
  ctx.save(); ctx.translate(ox, 0);

  ctx.fillStyle = C.bldg;
  ctx.fillRect(480, GY - 95, 50, 95);
  ctx.fillRect(555, GY - 70, 38, 70);
  ctx.fillRect(620, GY - 115, 58, 115);
  ctx.fillRect(720, GY - 55, 30, 55);

  ctx.fillStyle = C.bldgW;
  [[485,GY-82,9,11],[485,GY-60,9,11],[500,GY-82,9,11],[500,GY-60,9,11]].forEach(([x,y,w,h]) => ctx.fillRect(x,y,w,h));
  [[558,GY-57,8,10],[558,GY-40,8,10],[572,GY-57,8,10],[572,GY-40,8,10]].forEach(([x,y,w,h]) => ctx.fillRect(x,y,w,h));
  [[625,GY-100,10,12],[625,GY-78,10,12],[625,GY-56,10,12],
   [642,GY-100,10,12],[642,GY-78,10,12],[642,GY-56,10,12],
   [659,GY-100,10,12],[659,GY-78,10,12],[659,GY-56,10,12]].forEach(([x,y,w,h]) => ctx.fillRect(x,y,w,h));

  // Crane silhouette
  ctx.fillStyle = "rgba(141,119,95,0.1)";
  ctx.fillRect(644, GY - 160, 8, 47);          // mast
  ctx.fillRect(614, GY - 157, 72, 5);           // boom arm
  ctx.fillRect(680, GY - 157, 3, 32);           // lifting cable
  ctx.fillRect(624, GY - 157, 3, 16);           // counter cable

  ctx.restore();
}

// ── Draw: ground ─────────────────────────────────────────────────────────────
function drawGround(ctx: CanvasRenderingContext2D, sx: number) {
  ctx.fillStyle = C.gnd;
  ctx.fillRect(0, GY, CW, CH - GY);

  ctx.strokeStyle = C.gndLine;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(CW, GY); ctx.stroke();

  ctx.strokeStyle = C.gndTick;
  ctx.lineWidth = 1;
  const sp = 40, off = sx % sp;
  for (let x = -off; x < CW + sp; x += sp) {
    ctx.beginPath(); ctx.moveTo(x, GY + 1); ctx.lineTo(x, GY + 7); ctx.stroke();
  }
}

// ── Draw: worker ─────────────────────────────────────────────────────────────
function drawWorker(ctx: CanvasRenderingContext2D, fy: number, phase: number, jumping: boolean, dead: boolean) {
  const cx = WX + WW / 2;
  ctx.globalAlpha = dead ? 0.45 : 1;

  const sw = jumping ? 0 : Math.sin(phase) * 9;

  // Pants + boots
  ctx.fillStyle = C.pants;
  ctx.fillRect(cx - 10, fy - 26 + sw * 0.35, 9, 26);
  ctx.fillRect(cx + 1,  fy - 26 - sw * 0.35, 9, 26);
  ctx.fillStyle = C.boots;
  ctx.fillRect(cx - 12, fy - 4 + sw * 0.35, 13, 5);
  ctx.fillRect(cx + 0,  fy - 4 - sw * 0.35, 13, 5);

  // Body / safety vest
  ctx.fillStyle = C.vest;
  ctx.fillRect(cx - 12, fy - WH + 16, 24, 24);
  ctx.fillStyle = C.stripe;
  ctx.fillRect(cx - 12, fy - WH + 26, 24, 5);

  // Arms (swing opposite to legs)
  ctx.fillStyle = C.vest;
  ctx.fillRect(cx - 17, fy - WH + 20 - sw * 0.45, 6, 15);
  ctx.fillRect(cx + 11,  fy - WH + 20 + sw * 0.45, 6, 15);

  // Head
  ctx.fillStyle = C.skin;
  ctx.fillRect(cx - 7, fy - WH + 6, 14, 12);

  // Hard hat dome
  ctx.fillStyle = C.hat;
  ctx.beginPath();
  ctx.ellipse(cx, fy - WH + 7, 12, 9, 0, Math.PI, 0);
  ctx.fill();
  // Brim
  ctx.fillStyle = C.hatBrim;
  ctx.fillRect(cx - 14, fy - WH + 6, 28, 5);

  ctx.globalAlpha = 1;
}

// ── Draw: brick stack ────────────────────────────────────────────────────────
function drawBricks(ctx: CanvasRenderingContext2D, obs: Obs) {
  const bh = 13, bw = obs.w;
  const rows = Math.max(1, Math.round(obs.h / bh));
  for (let r = 0; r < rows; r++) {
    const ry = GY - obs.h + r * bh;
    ctx.fillStyle = C.brkMrt;
    ctx.fillRect(obs.x, ry, bw, bh);
    ctx.fillStyle = r % 2 === 0 ? C.brkA : C.brkB;
    ctx.fillRect(obs.x + 1, ry + 1, bw - 2, bh - 2);
    const mx = obs.x + (r % 2 === 0 ? bw * 0.5 : bw * 0.33);
    if (mx > obs.x && mx < obs.x + bw) {
      ctx.fillStyle = C.brkMrt;
      ctx.fillRect(mx, ry + 1, 2, bh - 2);
    }
  }
}

// ── Draw: traffic cone ───────────────────────────────────────────────────────
function drawCone(ctx: CanvasRenderingContext2D, obs: Obs) {
  const bx = obs.x + obs.w / 2;
  ctx.fillStyle = C.coneA;
  ctx.beginPath();
  ctx.moveTo(bx, GY - obs.h);
  ctx.lineTo(bx - obs.w / 2, GY - 6);
  ctx.lineTo(bx + obs.w / 2, GY - 6);
  ctx.closePath(); ctx.fill();

  // White stripe
  ctx.fillStyle = C.coneW;
  const sy = GY - obs.h * 0.52, sw2 = obs.w * 0.44;
  ctx.fillRect(bx - sw2 / 2, sy, sw2, 4);

  // Base
  ctx.fillStyle = C.coneB;
  ctx.fillRect(obs.x - 4, GY - 8, obs.w + 8, 8);
}

// ── Draw: bureaucracy folder ─────────────────────────────────────────────────
function drawFolder(ctx: CanvasRenderingContext2D, obs: Obs, lang: Lang) {
  const x = obs.x, y = GY - obs.h;
  ctx.fillStyle = C.fldA;
  ctx.fillRect(x, y, obs.w, obs.h);
  ctx.fillStyle = C.fldB;
  ctx.fillRect(x, y + obs.h - 5, obs.w, 5);
  // Tab
  ctx.fillStyle = C.fldB;
  ctx.fillRect(x + 5, y - 8, 18, 10);
  // Paper lines
  ctx.fillStyle = "rgba(243,242,238,0.65)";
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 5, y + 7 + i * 8, obs.w - 10, 2);
  // Stamp text
  ctx.fillStyle = C.fldTxt;
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(lang === "he" ? "עיריה" : "DMV", x + obs.w / 2, y + obs.h - 9);
  ctx.textAlign = "left";
}

// ── Draw: score HUD ──────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, score: number, hi: number | null) {
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = C.scoreA;
  ctx.fillText(String(score).padStart(5, "0"), CW - 18, 30);
  if (hi !== null && hi > 0) {
    ctx.fillStyle = C.scoreB;
    ctx.font = "bold 11px monospace";
    ctx.fillText(`HI  ${String(hi).padStart(5, "0")}`, CW - 18, 50);
  }
  ctx.textAlign = "left";
}

// ── Hitboxes (slightly inset for forgiveness) ─────────────────────────────────
function workerBox(fy: number): Rect { return { x: WX + 5, y: fy - WH + 12, w: WW - 10, h: WH - 16 }; }
function obsBox(o: Obs): Rect        { return { x: o.x + 3, y: GY - o.h + 3, w: o.w - 6, h: o.h - 3 }; }
function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnObs(): Obs {
  const roll = Math.random();
  if (roll < 0.30) return { x: CW + 60, type: "bricks_low",  w: 30, h: 30 };
  if (roll < 0.55) return { x: CW + 60, type: "bricks_high", w: 34, h: 56 };
  if (roll < 0.78) return { x: CW + 60, type: "cone",        w: 30, h: 46 };
                   return { x: CW + 60, type: "folder",      w: 40, h: 42 };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotFoundClient() {
  const { lang } = useLang() as { lang: Lang };
  const isRTL = lang === "he";

  // ── React state (UI only) ──────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score,     setScore]     = useState(0);
  const [highScore, setHighScore] = useState<number | null>(null);

  // ── Mutable refs (RAF loop — no re-renders) ────────────────────────────────
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const gsRef        = useRef<GameState>("idle");
  const wyRef        = useRef(GY);     // feet Y
  const wvyRef       = useRef(0);      // vertical velocity
  const obsRef       = useRef<Obs[]>([]);
  const scoreRef     = useRef(0);
  const spdRef       = useRef(BASE_SPD);
  const sxRef        = useRef(0);      // horizontal scroll (for ground/parallax)
  const phaseRef     = useRef(0);      // leg animation phase
  const nextORef     = useRef(80);     // frames until next obstacle
  const flashRef     = useRef(0);      // death flash timer
  const hsRef        = useRef<number | null>(null);
  const langRef      = useRef<Lang>(lang);

  // Sync refs that mirror React state/props
  useEffect(() => { hsRef.current = highScore; }, [highScore]);
  useEffect(() => { langRef.current = lang; },    [lang]);

  // Load stored high score
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v) { const n = parseInt(v, 10); setHighScore(n); hsRef.current = n; }
    } catch {}
  }, []);

  // ── jump / start ────────────────────────────────────────────────────────────
  const jump = useCallback(() => {
    if (gsRef.current === "dead") return;
    if (gsRef.current === "idle") {
      // initialise
      wyRef.current    = GY;
      wvyRef.current   = 0;
      obsRef.current   = [];
      scoreRef.current = 0;
      spdRef.current   = BASE_SPD;
      sxRef.current    = 0;
      phaseRef.current = 0;
      nextORef.current = 60;
      gsRef.current    = "playing";
      setScore(0);
      setGameState("playing");
    }
    if (wyRef.current >= GY - 2) wvyRef.current = JUMP_VEL;
  }, []);

  // ── restart ──────────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    gsRef.current = "idle";
    wyRef.current = GY; wvyRef.current = 0;
    obsRef.current = []; scoreRef.current = 0;
    spdRef.current = BASE_SPD; sxRef.current = 0;
    phaseRef.current = 0; nextORef.current = 80;
    setScore(0); setGameState("idle");
  }, []);

  // ── RAF game loop (mount once) ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      const gs = gsRef.current;

      // ── Physics + logic ──────────────────────────────────────────────────────
      if (gs === "playing") {
        // Gravity
        wvyRef.current  = Math.min(wvyRef.current + GRAVITY, 18);
        wyRef.current   = Math.min(GY, wyRef.current + wvyRef.current);
        if (wyRef.current >= GY) wvyRef.current = 0;

        spdRef.current  = Math.min(MAX_SPD, spdRef.current + ACCEL);
        sxRef.current  += spdRef.current;
        phaseRef.current += spdRef.current * 0.065;
        scoreRef.current = Math.floor(sxRef.current / 8);

        // Spawn obstacles
        nextORef.current--;
        if (nextORef.current <= 0) {
          obsRef.current.push(spawnObs());
          const gap = 100 + Math.random() * 130 - (spdRef.current - BASE_SPD) * 8;
          nextORef.current = Math.max(52, gap);
        }

        // Move & cull
        obsRef.current = obsRef.current
          .map(o => ({ ...o, x: o.x - spdRef.current }))
          .filter(o => o.x + o.w > -30);

        // Collision
        const wb = workerBox(wyRef.current);
        for (const o of obsRef.current) {
          if (overlaps(wb, obsBox(o))) {
            gsRef.current = "dead";
            flashRef.current = 14;
            const fs = scoreRef.current;
            setScore(fs); setGameState("dead");
            try {
              const prev = localStorage.getItem(LS_KEY);
              if (!prev || fs > parseInt(prev, 10)) {
                localStorage.setItem(LS_KEY, String(fs));
                setHighScore(fs); hsRef.current = fs;
              }
            } catch {}
            break;
          }
        }
      }

      // ── Render ───────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, CW, CH);
      drawSky(ctx, sxRef.current);
      drawSkyline(ctx, sxRef.current);
      drawGround(ctx, sxRef.current);

      // Obstacles
      for (const o of obsRef.current) {
        if (o.type === "cone")   drawCone(ctx, o);
        else if (o.type === "folder") drawFolder(ctx, o, langRef.current);
        else drawBricks(ctx, o);
      }

      // Worker
      const jumping = wyRef.current < GY - 2;
      drawWorker(ctx, wyRef.current, phaseRef.current, jumping, gs === "dead");

      // Death flash
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(141,119,95,${0.25 * (flashRef.current-- / 14)})`;
        ctx.fillRect(0, 0, CW, CH);
      }

      // HUD
      drawHUD(ctx, scoreRef.current, hsRef.current);

      // Idle prompt
      if (gs === "idle") {
        ctx.fillStyle = "rgba(243,242,238,0.16)";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          langRef.current === "he" ? "הקש SPACE או גע במסך להתחיל" : "Press SPACE or tap to start",
          CW / 2, GY - 22,
        );
        ctx.textAlign = "left";
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafId); };
  }, []); // runs once — all values accessed via refs

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [jump]);

  // ── Touch (native, passive:false to allow preventDefault) ────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const fn = (e: TouchEvent) => {
      e.preventDefault();
      if (gsRef.current !== "dead") jump();
    };
    el.addEventListener("touchstart", fn, { passive: false });
    return () => el.removeEventListener("touchstart", fn);
  }, [jump]);

  // ── Strings ──────────────────────────────────────────────────────────────────
  const T = {
    h1:       isRTL ? "הדף לא נמצא" : "Page Not Found",
    sub:      isRTL ? "ייתכן שהקישור שגוי, או שהדף הוסר." : "The link may be broken, or the page has been removed.",
    game:     isRTL ? "בינתיים — שחקו ב-Crane Run" : "Meanwhile — play Crane Run",
    gameOver: isRTL ? "!אוי" : "Oops!",
    scoreL:   isRTL ? "ניקוד" : "Score",
    bestL:    isRTL ? "שיא" : "Best",
    again:    isRTL ? "שחק שוב" : "Play Again",
    home:     isRTL ? "חזרה לדף הבית" : "Back to Home",
    projects: isRTL ? "פרויקטים" : "Projects",
    articles: isRTL ? "מאמרים" : "Articles",
    contact:  isRTL ? "צור קשר" : "Contact",
  };

  return (
    <main
      className="min-h-screen bg-charcoal text-bone flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-14 md:py-20">
        {/* ── 404 heading ── */}
        <div className="text-center mb-6 select-none">
          <h1 className="sr-only">{T.h1}</h1>
          <p
            aria-hidden
            className="font-heading font-bold leading-none mb-2"
            style={{
              fontSize: "clamp(4rem, 18vw, 8rem)",
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(141,119,95,0.3)",
            }}
          >
            404
          </p>
          <p className="font-body text-sm text-bone/50 tracking-widest">{T.h1}</p>
          <p className="font-body text-[0.68rem] text-bone/30 mt-1 tracking-wider">{T.sub}</p>
          <p className="font-body text-[0.6rem] text-bone/18 mt-1 tracking-wider">{T.game}</p>
        </div>

        {/* ── Game canvas + overlay wrapper ── */}
        <div className="relative w-full max-w-[800px]">
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="block w-full h-auto cursor-pointer"
            style={{
              border: "1px solid rgba(141,119,95,0.12)",
              imageRendering: "crisp-edges",
              touchAction: "none",
            }}
            onClick={() => { if (gameState !== "dead") jump(); }}
          />

          {/* ── Game-over overlay ── */}
          {gameState === "dead" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-charcoal/82 backdrop-blur-sm">
              <p className="font-heading text-2xl font-bold" style={{ color: "#8D775F" }}>
                {T.gameOver}
              </p>

              <div className="flex gap-10 text-center">
                <div>
                  <p className="font-mono text-3xl font-bold text-bone">{score}</p>
                  <p className="font-body text-[0.58rem] uppercase tracking-[0.2em] text-bone/30 mt-1">
                    {T.scoreL}
                  </p>
                </div>
                {highScore !== null && highScore > 0 && (
                  <div>
                    <p className="font-mono text-3xl font-bold" style={{ color: "#8D775F" }}>
                      {highScore}
                    </p>
                    <p className="font-body text-[0.58rem] uppercase tracking-[0.2em] text-bone/30 mt-1">
                      {T.bestL}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={restart}
                className="px-7 py-2.5 bg-accent text-bone font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase transition-colors hover:bg-accent-dark"
              >
                {T.again}
              </button>
            </div>
          )}
        </div>

        {/* ── Back to home + quick links ── */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href={`/${lang}`}
            className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent/45 hover:text-accent transition-colors border-b border-accent/15 pb-px"
          >
            {T.home}
          </Link>
          <div className="flex gap-5 flex-wrap justify-center">
            <Link href={`/${lang}/projects`} className="font-body text-[0.6rem] uppercase tracking-widest text-bone/25 hover:text-bone/60 transition-colors">{T.projects}</Link>
            <Link href={`/${lang}/expertise`} className="font-body text-[0.6rem] uppercase tracking-widest text-bone/25 hover:text-bone/60 transition-colors">{T.articles}</Link>
            <Link href={`/${lang}#contact`} className="font-body text-[0.6rem] uppercase tracking-widest text-bone/25 hover:text-bone/60 transition-colors">{T.contact}</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
