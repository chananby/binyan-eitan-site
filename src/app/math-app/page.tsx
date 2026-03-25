"use client";

import Link from "next/link";

export default function MathAppGate() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center justify-center py-10 px-4"
      dir="rtl"
    >
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-5">
            🎓 תוכנית המחוננים — אוניברסיטת בר-אילן
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 mb-2">בחר רמת לימוד</h1>
          <p className="text-slate-400 text-sm">כל רמה היא סביבה עצמאית עם פרופיל ומעקב התקדמות</p>
        </div>

        {/* Selection cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Junior card */}
          <Link
            href="/math-app/junior"
            className="group rounded-3xl border border-cyan-500/30 bg-[#050d1f] p-8 text-right flex flex-col gap-4 shadow-lg hover:border-cyan-400 hover:shadow-cyan-500/25 hover:shadow-xl transition-all duration-200"
          >
            <span className="text-5xl select-none">🚀</span>
            <div>
              <p className="text-xl font-extrabold text-cyan-200 mb-0.5">Junior</p>
              <p className="text-sm font-bold text-cyan-400/80 mb-2">כיתות ג׳–ד׳</p>
              <p className="text-xs text-cyan-500/50 leading-relaxed">
                חיבור, חיסור, לוחות כפל,<br />שברים בסיסיים והיקף ריבוע
              </p>
            </div>
            <span className="text-xs text-cyan-400/50 group-hover:text-cyan-300 transition-colors font-semibold mt-auto tracking-wide">
              כניסה ←
            </span>
          </Link>

          {/* Senior card */}
          <Link
            href="/math-app/senior"
            className="group rounded-3xl border border-slate-200 bg-white p-8 text-right flex flex-col gap-4 shadow-sm hover:border-brand-400 hover:shadow-md transition-all duration-200"
          >
            <span className="text-5xl select-none">🧮</span>
            <div>
              <p className="text-xl font-extrabold text-slate-800 mb-0.5">Senior</p>
              <p className="text-sm font-bold text-brand-600 mb-2">כיתות ה׳–ו׳</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                אחוזים ושברים מורכבים —<br />מציאה, הפוך ושיעור אחוזים
              </p>
            </div>
            <span className="text-xs text-brand-400 group-hover:text-brand-600 transition-colors font-semibold mt-auto tracking-wide">
              כניסה ←
            </span>
          </Link>

        </div>
      </div>
    </div>
  );
}
