"use client";

// Shared document preview for the review screens (detail + review-queue).
// Renders the PDF/image inline filling its cell, with a "הגדל" button that
// opens a near-fullscreen overlay for comfortable reading of dense or
// multi-page documents. The overlay closes on X, ESC, or a backdrop click;
// the inner area stops propagation so clicks inside (incl. PDF scrolling)
// don't dismiss it.

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

export default function DocumentPreview({ fileUrl, isPdf }: { fileUrl: string; isPdf: boolean }) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);

  const Enlarge = (
    <button
      type="button"
      onClick={() => setFull(true)}
      title="הגדל למסך מלא"
      className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded bg-white/90 border border-[#2D2926]/15 px-2 py-1 text-xs font-semibold text-[#2D2926] shadow-sm hover:bg-white"
    >
      <Maximize2 size={13} /> הגדל
    </button>
  );

  return (
    <>
      <div className="relative">
        {Enlarge}
        {isPdf
          ? <iframe src={fileUrl} title="מסמך" className="w-full h-[62vh] lg:h-[82vh]" />
          : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="מסמך" className="w-full h-auto object-contain max-h-[62vh] lg:max-h-[82vh]" />
          )}
      </div>

      {full && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setFull(false)}
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setFull(false)}
            title="סגור (Esc)"
            className="absolute top-3 left-3 z-10 flex items-center justify-center rounded-full bg-white/90 w-9 h-9 text-[#2D2926] shadow hover:bg-white"
          >
            <X size={20} />
          </button>
          <div className="w-full max-w-6xl h-[92vh]" onClick={(e) => e.stopPropagation()}>
            {isPdf
              ? <iframe src={fileUrl} title="מסמך — מסך מלא" className="w-full h-full bg-white rounded" />
              : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt="מסמך — מסך מלא" className="w-full h-full object-contain" />
              )}
          </div>
        </div>
      )}
    </>
  );
}
