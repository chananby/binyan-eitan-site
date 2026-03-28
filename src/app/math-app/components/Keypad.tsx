"use client";

interface KeypadProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  spaceMode?: boolean;
}

const KEYS = ["1","2","3","4","5","6","7","8","9","⌫","0","."];

export default function Keypad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  spaceMode = false,
}: KeypadProps) {
  const press = (key: string) => {
    if (disabled) return;
    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else if (key === ".") {
      if (!value.includes(".") && value.length < 7) onChange(value + ".");
    } else {
      if (value.length < 7) onChange(value + key);
    }
  };

  const canSubmit = value.trim().length > 0 && !disabled;

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const numKey = spaceMode
    ? "bg-[#0d1b4e] border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 focus-visible:ring-cyan-500"
    : "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-brand-400";

  const delKey = spaceMode
    ? "bg-red-950/60 border border-red-500/30 text-red-400 hover:bg-red-500/20 focus-visible:ring-red-400"
    : "bg-red-100 text-red-700 hover:bg-red-200 focus-visible:ring-brand-400";

  const submitActive = spaceMode
    ? "bg-cyan-400 text-[#050d1f] hover:bg-cyan-300 active:scale-[0.98] shadow-lg shadow-cyan-500/20 focus-visible:ring-cyan-400"
    : "bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-md focus-visible:ring-brand-400";

  const submitIdle = spaceMode
    ? "bg-[#0d1b4e] text-slate-600 border border-cyan-500/10 cursor-not-allowed"
    : "bg-slate-200 text-slate-400 cursor-not-allowed";

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      {/* digit + backspace grid */}
      <div className="grid grid-cols-3 gap-2" dir="ltr">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            disabled={disabled}
            aria-label={key === "⌫" ? "מחק ספרה" : key}
            className={[
              "h-14 rounded-xl font-bold text-xl select-none transition-all duration-100",
              "active:scale-95 focus:outline-none focus-visible:ring-2",
              key === "⌫" ? delKey : numKey,
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {key}
          </button>
        ))}
      </div>

      {/* submit button */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className={[
          "w-full h-14 rounded-xl font-bold text-lg transition-all duration-150",
          "focus:outline-none focus-visible:ring-2",
          canSubmit ? submitActive : submitIdle,
        ].join(" ")}
      >
        בדוק ✓
      </button>
    </div>
  );
}
