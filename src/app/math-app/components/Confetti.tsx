"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  /** Increment this value to trigger a new burst */
  burst: number;
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];
const PIECES = 28;

export default function Confetti({ burst }: ConfettiProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: PIECES }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,       // vw offset from center
      rotate: Math.random() * 720 - 360,
      scale: 0.5 + Math.random() * 0.8,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.15,
      size: 8 + Math.random() * 8,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  return (
    <AnimatePresence>
      {burst > 0 && (
        <div
          key={burst}
          className="pointer-events-none fixed inset-0 flex items-start justify-center z-50 overflow-hidden"
          aria-hidden="true"
        >
          {pieces.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: -20, x: `${p.x}vw`, rotate: 0, scale: p.scale }}
              animate={{ opacity: 0, y: "80vh", rotate: p.rotate, scale: p.scale * 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 + Math.random() * 0.4, delay: p.delay, ease: "easeIn" }}
              style={{
                position: "absolute",
                top: "10%",
                width: p.size,
                height: p.size,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
