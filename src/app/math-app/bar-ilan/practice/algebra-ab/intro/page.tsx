"use client";

import Link from "next/link";
import { getPracticeModule } from "@/src/lib/math-tests/practice";

export default function AlgebraAbIntro() {
  const mod = getPracticeModule();
  const intro = mod.concept_intro_he;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        <Link
          href="/math-app/bar-ilan/practice/algebra-ab"
          className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium"
        >
          ← חזרה
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          <h1 className="text-xl font-extrabold text-slate-800 mb-6">{intro.title}</h1>

          <div className="space-y-4">
            {intro.sections.map((sec, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-brand-700 mb-1.5">{sec.heading}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{sec.body}</p>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/math-app/bar-ilan/practice/algebra-ab/level/level-1"
          className="block text-center bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors"
        >
          התחל/י לתרגל ←
        </Link>
      </div>
    </div>
  );
}
