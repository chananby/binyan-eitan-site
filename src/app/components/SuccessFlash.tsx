"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  show: boolean;
  /** Called after the animation completes so the parent can reset state */
  onDone: () => void;
  /** "in" = green, "out" = red, default = green */
  variant?: "in" | "out";
}

/** Full-screen overlay that flashes a checkmark for ~1.4 s then auto-dismisses */
export default function SuccessFlash({ show, onDone, variant = "in" }: Props) {
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(onDone, 1400);
    return () => clearTimeout(id);
  }, [show, onDone]);

  const bg   = variant === "out" ? "bg-red-500"   : "bg-green-500";
  const ring = variant === "out" ? "ring-red-300"  : "ring-green-300";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="success-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-[2px] pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.35, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{ scale: 1.15,   opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className={`rounded-full p-7 ${bg} ring-8 ${ring} ring-opacity-40 shadow-2xl`}
          >
            {/* SVG checkmark drawn with stroke-dashoffset animation */}
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M14 38 L30 54 L58 22"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.38, delay: 0.08, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
