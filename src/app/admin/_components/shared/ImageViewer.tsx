"use client";

// Full-size image viewer for the admin gallery.
//
// Thumbnails are too small to judge an image on — whether it's the right cover,
// or whether an extracted video frame is sharp. This opens one large, with
// keyboard/arrow navigation and ONE contextual action supplied by the caller:
//
//   • the image grid  → "קבע כשער"  (star)
//   • extracted frames → "בחר"/"בטל בחירה" (check)
//
// The action is a prop rather than baked in, which is what lets both grids
// share this instead of growing a second viewer.
//
// Plain <img> on purpose: sources are Blob URLs or in-memory object URLs shown
// once at full size, so next/image optimisation buys nothing.

import React, { useEffect } from "react";
import { ChevronUp, X } from "lucide-react";

export interface ViewerAction {
  /** Button label while the item is NOT in the target state. */
  label: string;
  /** Button label once it is (button becomes inert unless `repeatable`). */
  activeLabel: string;
  icon: React.ReactNode;
  isActive: boolean;
  onAction: () => void;
  /** Badge shown in the top bar while active. */
  activeBadge?: string;
  /** Tailwind classes for the button. */
  className?: string;
  /** Allow clicking while active — used for toggles like select/deselect. */
  repeatable?: boolean;
}

export default function ImageViewer({
  urls,
  index,
  onIndexChange,
  onClose,
  action,
  alt = "",
}: {
  urls: string[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  action?: ViewerAction;
  alt?: string;
}) {
  const total = urls.length;

  // Esc closes; ←/→ step through. RTL: right key goes back, left goes forward.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index - 1 + total) % total);
      if (e.key === "ArrowLeft") onIndexChange((index + 1) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, onClose, onIndexChange]);

  if (total === 0 || !urls[index]) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      onClick={onClose} /* backdrop click closes */
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 text-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-caption tabular-nums">
            {index + 1} / {total}
          </span>
          {action?.isActive && action.activeBadge && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-caption font-bold rounded">
              {action.icon} {action.activeBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <button
              onClick={action.onAction}
              disabled={action.isActive && !action.repeatable}
              className={
                action.className ??
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-default transition-colors"
              }
            >
              {action.icon}
              {action.isActive ? action.activeLabel : action.label}
            </button>
          )}
          <button
            onClick={onClose}
            title="סגור (Esc)"
            className="p-1.5 text-white/70 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Image + arrows */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden px-14 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 && (
          <>
            <button
              onClick={() => onIndexChange((index - 1 + total) % total)}
              title="הקודם"
              aria-label="הקודם"
              className="absolute end-3 z-10 p-3 text-white/50 hover:text-white transition-colors"
            >
              <ChevronUp size={30} className="rotate-90" />
            </button>
            <button
              onClick={() => onIndexChange((index + 1) % total)}
              title="הבא"
              aria-label="הבא"
              className="absolute start-3 z-10 p-3 text-white/50 hover:text-white transition-colors"
            >
              <ChevronUp size={30} className="-rotate-90" />
            </button>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[index]} alt={alt} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
}
