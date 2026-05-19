import Link from "next/link";
import { QUIZZES } from "../../../data/quizzes";

export default function QuizzesHub() {
  const visible = QUIZZES.filter(q => !q.hidden);

  return (
    <div className="min-h-screen bg-bone text-charcoal" dir="rtl">
      <main className="max-w-3xl mx-auto px-6 py-24 md:py-32">
        <header className="mb-12">
          <p className="font-body text-xs tracking-[0.28em] uppercase text-accent mb-3">בניין איתן</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight">חידונים</h1>
          <p className="font-body text-base text-charcoal/60 mt-4 max-w-xl leading-relaxed">
            חידונים תורניים ועונתיים מבית בניין איתן. בחרו חידון והתחילו לשחק.
          </p>
        </header>

        {visible.length === 0 ? (
          <p className="text-charcoal/40 text-sm">אין כרגע חידונים זמינים.</p>
        ) : (
          <ul className="space-y-4">
            {visible.map(q => (
              <li key={q.slug}>
                <Link
                  href={`/he/quizzes/${q.slug}`}
                  className="block border border-warm-gray-light bg-white p-6 hover:border-accent transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-heading text-xl font-bold text-charcoal group-hover:text-accent transition-colors">
                        {q.title}
                      </h2>
                      <p className="text-sm text-charcoal/60 mt-1.5 leading-relaxed">{q.description}</p>
                    </div>
                    {q.season && (
                      <span className="shrink-0 text-[0.65rem] tracking-widest uppercase text-accent border border-accent/40 px-2.5 py-1">
                        {q.season}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs tracking-[0.22em] uppercase text-accent mt-4 inline-flex items-center gap-1">
                    התחל חידון <span aria-hidden>←</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
