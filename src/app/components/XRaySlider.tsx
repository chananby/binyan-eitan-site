"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";

interface XRaySliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  dir?: "ltr" | "rtl";
}

// ── Handle icon ───────────────────────────────────────────────────────────────
function HandleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M6 10H2M2 10L4.5 7.5M2 10L4.5 12.5"
        stroke="#8D775F"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 10H18M18 10L15.5 7.5M18 10L15.5 12.5"
        stroke="#8D775F"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="10" y1="1" x2="10" y2="19" stroke="#8D775F" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function XRaySlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
  dir = "ltr",
}: XRaySliderProps) {
  // position: 0–100, always measured from the left edge of the container.
  // Left of handle → "before" (infrastructure); right of handle → "after" (final result).
  // In RTL the labels swap sides so the copy reads naturally in both languages.
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const calcPosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    setPosition(Math.min(100, Math.max(0, ((clientX - left) / width) * 100)));
  }, []);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      calcPosition(e.clientX);
    },
    [calcPosition]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) calcPosition(e.clientX); };
    const onUp   = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [calcPosition]);

  // ── Touch (passive:false to allow preventDefault on the container) ─────────
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      dragging.current = true;
      calcPosition(e.touches[0].clientX);
    },
    [calcPosition]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault(); // prevents page scroll while dragging
      calcPosition(e.touches[0].clientX);
    };
    const onEnd = () => { dragging.current = false; };
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend",  onEnd);
    return () => {
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend",  onEnd);
    };
  }, [calcPosition]);

  // ── Label positions: swap sides in RTL ─────────────────────────────────────
  // LTR: before=left,  after=right
  // RTL: before=right, after=left
  const beforeCorner = dir === "rtl" ? "right-3 bottom-3" : "left-3 bottom-3";
  const afterCorner  = dir === "rtl" ? "left-3 bottom-3"  : "right-3 bottom-3";

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none cursor-col-resize rounded-sm bg-charcoal"
      style={{ aspectRatio: "16/9", touchAction: "pan-y" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      aria-label="X-Ray comparison slider"
      role="slider"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* ── After image — full width baseline (final result) ── */}
      <div className="absolute inset-0">
        <Image
          src={afterUrl}
          alt={afterLabel}
          fill
          draggable={false}
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* ── Before image — clipped to left `position`% (infrastructure) ── */}
      <div
        className="absolute inset-0 will-change-[clip-path]"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeUrl}
          alt={beforeLabel}
          fill
          draggable={false}
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {/* Subtle dark veil on the infrastructure side — emphasises rawness */}
        <div className="absolute inset-0 bg-charcoal/20 pointer-events-none" />
      </div>

      {/* ── Separator line ── */}
      <div
        className="absolute inset-y-0 w-px pointer-events-none"
        style={{
          left: `${position}%`,
          background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.9) 20%, rgba(255,255,255,0.9) 80%, transparent)",
          boxShadow: "0 0 12px rgba(0,0,0,0.35)",
        }}
      />

      {/* ── Drag handle circle ── */}
      <div
        className="absolute top-1/2 pointer-events-none"
        style={{
          left: `${position}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center"
          style={{ boxShadow: "0 0 0 2px rgba(141,119,95,0.35), 0 4px 20px rgba(0,0,0,0.25)" }}
        >
          <HandleIcon />
        </div>
      </div>

      {/* ── Before label ── */}
      <div className={`absolute ${beforeCorner} pointer-events-none`}>
        <span className="inline-block bg-charcoal/70 backdrop-blur-sm text-bone text-[10px] font-semibold tracking-[0.18em] uppercase px-2.5 py-1">
          {beforeLabel}
        </span>
      </div>

      {/* ── After label ── */}
      <div className={`absolute ${afterCorner} pointer-events-none`}>
        <span className="inline-block bg-accent/80 backdrop-blur-sm text-bone text-[10px] font-semibold tracking-[0.18em] uppercase px-2.5 py-1">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
