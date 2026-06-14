"use client";

// Bottom "approved · undo" toast. Auto-dismisses ~6s after mount (the parent
// remounts it per action via a key, so each action gets a fresh window).

import { useEffect, useRef } from "react";
import { Check, RotateCcw } from "lucide-react";

export default function UndoToast({ message, onUndo, onDismiss }: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    const t = setTimeout(() => dismissRef.current(), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div dir="rtl" className="fixed bottom-4 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#2D2926] text-white rounded-md shadow-lg px-4 py-2.5 flex items-center gap-3 text-sm">
        <Check size={16} className="text-emerald-400 shrink-0" />
        <span>{message}</span>
        <button onClick={onUndo} className="flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200">
          <RotateCcw size={14} /> בטל
        </button>
      </div>
    </div>
  );
}
