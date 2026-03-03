"use client";

interface KeypadProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const KEYS = ["7","8","9","4","5","6","1","2","3",".","0","⌫"];

export default function Keypad({ value, onChange, onSubmit, disabled = false }: KeypadProps) {
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

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      {/* digit + backspace grid */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            disabled={disabled}
            aria-label={key === "⌫" ? "מחק ספרה" : key}
            className={[
              "h-14 rounded-xl font-bold text-xl select-none transition-all duration-100",
              "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
              key === "⌫"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200",
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
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
          canSubmit
            ? "bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-md"
            : "bg-slate-200 text-slate-400 cursor-not-allowed",
        ].join(" ")}
      >
        בדוק ✓
      </button>
    </div>
  );
}
