"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "be_a11y";

interface Prefs {
  highContrast: boolean;
  fontSize: number; // 1 = 100%, 1.1 = 110%, etc.
}

const DEFAULT: Prefs = { highContrast: false, fontSize: 1 };

function applyPrefs(p: Prefs) {
  const html = document.documentElement;
  p.highContrast ? html.classList.add("hc") : html.classList.remove("hc");
  html.style.fontSize = p.fontSize === 1 ? "" : `${Math.round(p.fontSize * 100)}%`;
}

function A11yIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <path d="M6 8l6 2 6-2" />
      <path d="M12 10v5" />
      <path d="M9 21l3-6 3 6" />
    </svg>
  );
}

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p: Prefs = JSON.parse(saved);
        applyPrefs(p);
        setPrefs(p);
      }
    } catch {}
  }, []);

  function update(patch: Partial<Prefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyPrefs(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function reset() {
    applyPrefs(DEFAULT);
    setPrefs(DEFAULT);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Don't render on server to avoid hydration mismatch
  if (!mounted) return null;

  const canIncrease = prefs.fontSize < 1.4;
  const canDecrease = prefs.fontSize > 0.8;

  return (
    <div
      className="fixed bottom-[5.5rem] left-6 z-[200] flex flex-col items-start gap-3 print:hidden"
      role="complementary"
      aria-label="Accessibility menu"
    >
      {/* Panel — region rather than dialog: it's a floating settings panel with
          no focus trap and no modal behavior. role=dialog+aria-modal=false
          sent contradictory signals to screen readers. */}
      {open && (
        <div
          id="a11y-panel"
          className="bg-charcoal/90 text-bone border border-bone/10 shadow-xl w-52 p-4 flex flex-col gap-3"
          role="region"
          aria-label="Accessibility options"
        >
          <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-warm-gray">
            Accessibility / נגישות
          </p>

          {/* High contrast toggle */}
          <button
            onClick={() => update({ highContrast: !prefs.highContrast })}
            className="flex items-center gap-3 font-body text-xs font-medium text-start transition-colors hover:text-accent"
            aria-pressed={prefs.highContrast}
          >
            <span
              className={`size-4 flex-shrink-0 border transition-colors ${
                prefs.highContrast
                  ? "bg-accent border-accent"
                  : "border-bone/40 hover:border-accent"
              }`}
              aria-hidden="true"
            />
            <span>
              High Contrast<br />
              <span className="text-bone/50">ניגודיות גבוהה</span>
            </span>
          </button>

          {/* Font size */}
          <div>
            <p className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-bone/40 mb-2">
              Font Size / גודל גופן
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => canDecrease && update({ fontSize: +(prefs.fontSize - 0.1).toFixed(1) })}
                disabled={!canDecrease}
                className="flex-1 py-2 font-body text-sm font-bold border border-bone/20 hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease font size"
              >
                A−
              </button>
              <span className="font-body text-xs text-bone/40 w-8 text-center tabular-nums">
                {Math.round(prefs.fontSize * 100)}%
              </span>
              <button
                onClick={() => canIncrease && update({ fontSize: +(prefs.fontSize + 0.1).toFixed(1) })}
                disabled={!canIncrease}
                className="flex-1 py-2 font-body text-sm font-bold border border-bone/20 hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-bone/30 hover:text-accent transition-colors text-start"
          >
            Reset / איפוס
          </button>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`size-10 flex items-center justify-center border shadow-lg transition-all duration-300 opacity-60 hover:opacity-100 ${
          open
            ? "bg-accent border-accent text-charcoal opacity-100"
            : "bg-charcoal border-bone/20 text-bone/70 hover:border-accent hover:text-accent"
        }`}
        aria-label="Toggle accessibility menu"
        aria-expanded={open}
        aria-controls="a11y-panel"
      >
        <A11yIcon />
      </button>
    </div>
  );
}
