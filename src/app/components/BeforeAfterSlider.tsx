"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useLang } from "./LangContext";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: string; // e.g. "4/5"
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  aspectRatio = "4/5",
}: Props) {
  const { lang } = useLang();
  const isRTL = lang === "he";

  const [position, setPosition] = useState(50); // 0–100
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const raw = ((clientX - rect.left) / rect.width) * 100;
      const pct = isRTL ? clamp(100 - raw) : clamp(raw);
      setPosition(pct);
    },
    [isRTL]
  );

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    updateFromClientX(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    updateFromClientX(e.touches[0].clientX);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const onTouch = (e: TouchEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.touches[0].clientX);
    };
    const onUp = () => { dragging.current = false; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  // divider position from left edge (always LTR in CSS)
  const dividerLeft = isRTL ? 100 - position : position;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden cursor-col-resize"
      style={{ aspectRatio }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* After image (full width, behind) */}
      <Image
        src={afterSrc}
        alt={afterLabel ?? "After"}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        draggable={false}
      />

      {/* Before image (clipped to left side) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: isRTL
            ? `inset(0 0 0 ${100 - dividerLeft}%)`
            : `inset(0 ${100 - dividerLeft}% 0 0)`,
        }}
      >
        <Image
          src={beforeSrc}
          alt={beforeLabel ?? "Before"}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-px bg-white/80 shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
        style={{ left: `${dividerLeft}%` }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
        style={{ left: `${dividerLeft}%` }}
      >
        <div className="flex items-center justify-center size-10 rounded-full bg-white/90 shadow-lg border border-white/50">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M5.5 6L2 9l3.5 3M12.5 6L16 9l-3.5 3" stroke="#2D2926" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Before label */}
      <div
        className="absolute bottom-3 pointer-events-none"
        style={{ left: isRTL ? "auto" : "12px", right: isRTL ? "12px" : "auto" }}
      >
        <span className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-white bg-black/55 backdrop-blur-sm px-2.5 py-1.5">
          {beforeLabel ?? (lang === "he" ? "לפני" : "Before")}
        </span>
      </div>

      {/* After label */}
      <div
        className="absolute bottom-3 pointer-events-none"
        style={{ right: isRTL ? "auto" : "12px", left: isRTL ? "12px" : "auto" }}
      >
        <span className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-white bg-black/55 backdrop-blur-sm px-2.5 py-1.5">
          {afterLabel ?? (lang === "he" ? "בתהליך" : "During")}
        </span>
      </div>
    </div>
  );
}
