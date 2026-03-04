"use client";

import { motion } from "framer-motion";

interface JuniorKeypadProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["C", "0", "✓"],
];

export default function JuniorKeypad({ value, onChange, onSubmit, disabled }: JuniorKeypadProps) {
  function handleKey(key: string) {
    if (disabled) return;
    if (key === "C") { onChange(""); return; }
    if (key === "✓") { onSubmit(); return; }
    // Max 4 digits
    if (value.length >= 4) return;
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {ROWS.flat().map((key) => {
        const isSubmit = key === "✓";
        const isClear  = key === "C";
        return (
          <motion.button
            key={key}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={() => handleKey(key)}
            disabled={disabled}
            className={[
              "h-16 rounded-2xl text-xl font-bold border transition-colors select-none",
              "active:shadow-inner focus:outline-none",
              isSubmit
                ? "bg-emerald-400 hover:bg-emerald-300 border-emerald-300 text-white shadow-md shadow-emerald-400/40 text-2xl"
                : isClear
                ? "bg-red-100 hover:bg-red-200 border-red-200 text-red-500"
                : "bg-white hover:bg-blue-50 border-slate-200 text-slate-700 shadow-sm",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            aria-label={isSubmit ? "אישור" : isClear ? "מחק" : key}
          >
            {key}
          </motion.button>
        );
      })}
    </div>
  );
}
