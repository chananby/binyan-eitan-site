import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import TechnicalAnatomy from '../components/TechnicalAnatomy';
import Pillars from '../components/Pillars';
 
export default function HebrewHome() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
 
      {/* ═══════════════════════════════════════════════
          SECTION DIVIDER — Architectural rule
          ═══════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>
 
      {/* ═══════════════════════════════════════════════
          PHILOSOPHY TEASER — Editorial layout
          Placeholder section that maintains the high-end
          architectural feel below the fold
          ═══════════════════════════════════════════════ */}
      <section className="relative bg-bone py-28 md:py-36">
        <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-x-4 px-6 md:grid-cols-12 md:gap-x-6 lg:px-12">
          {/* Label — leading columns */}
          <div className="col-span-4 mb-10 md:col-span-3 md:col-start-1 md:mb-0">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              הפילוסופיה שלנו
            </p>
          </div>
 
          {/* Body — middle columns */}
          <div className="col-span-4 md:col-span-6 md:col-start-4">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              כל פרויקט הוא עדות למצוינות הנדסית ולאומנות ללא פשרות.
            </h2>
            <p className="mt-6 font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-8 md:text-lg">
              בבנין איתן, אנו מאמינים שבנייה יוקרתית מתחילה בהבנה עמוקה של
              חזון הלקוח ומסתיימת בביצוע מדויק עד לפרט האחרון. כל קו, כל חומר,
              כל חיבור — משקפים את המחויבות שלנו לשלמות.
            </p>
          </div>
 
          {/* Accent number — trailing column */}
          <div className="col-span-4 mt-10 flex items-end justify-end md:col-span-2 md:col-start-11 md:mt-0">
            <span className="font-heading text-8xl font-bold text-charcoal/[0.04] md:text-9xl">
              01
            </span>
          </div>
        </div>
      </section>
 
      {/* ═══════════════════════════════════════════════
          SERVICES PREVIEW — Three-column tease
          ═══════════════════════════════════════════════ */}
      <section className="relative bg-charcoal py-28 text-bone md:py-36">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          {/* Section header */}
          <div className="mb-16 md:mb-24">
            <p className="overline-label !text-warm-gray">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              תחומי מומחיות
            </p>
            <h2 className="mt-5 max-w-2xl font-heading text-3xl leading-snug font-bold text-bone md:text-4xl lg:text-5xl">
              הנדסה, תכנון וביצוע — תחת קורת גג אחת.
            </h2>
          </div>
 
          {/* 3-column grid */}
          <div className="grid grid-cols-1 gap-px bg-bone/[0.06] md:grid-cols-3">
            {[
              {
                num: "01",
                title: "הנדסת מבנים",
                desc: "תכנון קונסטרוקטיבי מתקדם עם דגש על חדשנות, בטיחות ועמידות לאורך זמן.",
              },
              {
                num: "02",
                title: "בנייה יוקרתית",
                desc: "ביצוע ברמה הגבוהה ביותר עם חומרים משובחים ואומנות ייחודית.",
              },
              {
                num: "03",
                title: "שיפוצים ושדרוגים",
                desc: "טרנספורמציה של מבנים קיימים תוך שימור האופי המקורי והעלאת הסטנדרט.",
              },
            ].map((service) => (
              <div
                key={service.num}
                className="group bg-charcoal p-8 transition-colors duration-500 hover:bg-charcoal-light md:p-12"
              >
                <span className="font-heading text-5xl font-bold text-accent/20 transition-colors duration-500 group-hover:text-accent/40">
                  {service.num}
                </span>
                <h3 className="mt-6 font-heading text-xl font-bold text-bone md:text-2xl">
                  {service.title}
                </h3>
                <p className="mt-4 font-body text-sm leading-relaxed font-light text-bone/50">
                  {service.desc}
                </p>
                <div className="mt-8 h-px w-12 bg-accent/30 transition-all duration-500 group-hover:w-20 group-hover:bg-accent" />
              </div>
            ))}
          </div>
        </div>
      </section>
 
      {/* ═══════════════════════════════════════════════
          FOOTER TEASER — Minimal closer
          ═══════════════════════════════════════════════ */}
      <section className="bg-bone py-20 md:py-28" id="contact">
        <div className="mx-auto max-w-[1400px] px-6 text-center lg:px-12">
          <p className="overline-label mx-auto">
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            בואו נבנה יחד
            <span className="ms-3 inline-block h-px w-6 bg-accent align-middle" />
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
            מוכנים להתחיל את הפרויקט הבא שלכם?
          </h2>
          <a
            href={`mailto:info@binyan-eitan.co.il`}
            className="group mt-10 inline-flex items-center gap-3 border-b-2 border-charcoal/80 pb-2.5 font-body text-sm font-semibold tracking-wider uppercase text-charcoal transition-all duration-500 hover:gap-4 hover:border-accent hover:text-accent"
          >
            צרו קשר
            <ArrowDownLeftIcon />
          </a>
        </div>
      </section>
    </main>
  );
}
 
/* Small arrow component to avoid making the whole page a client component */
function ArrowDownLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-500 group-hover:translate-y-0.5"
    >
      <path d="M17 7 7 17" />
      <path d="M17 17H7V7" />
    </svg>
  );
}
