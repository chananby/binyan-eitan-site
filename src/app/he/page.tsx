import ContactForm from "../components/ContactForm";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TechnicalAnatomy from "../components/TechnicalAnatomy";
import Pillars from "../components/Pillars";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "בניין איתן | הנדסה היא הבסיס. השקט שלכם הוא התוצאה.",
  description: "בבניין איתן אנחנו מאמינים שבית נמדד קודם כל במה שלא רואים. הנדסה, תכנון וביצוע תחת קורת גג אחת.",
};

export default function HebrewHome() {
  return (
    <main className="relative" dir="rtl">
      <Navbar />
      <Hero />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>

      {/* Philosophy Section */}
      <section id="about" className="relative bg-bone py-28 md:py-36">
        <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-x-4 px-6 md:grid-cols-12 md:gap-x-6 lg:px-12">
          <div className="col-span-4 mb-10 md:col-span-3 md:col-start-1 md:mb-0">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              הפילוסופיה שלנו
            </p>
          </div>
          <div className="col-span-4 md:col-span-6 md:col-start-4">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              הנדסה היא הבסיס. השקט שלכם הוא התוצאה.
            </h2>
            <p className="mt-6 font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-8 md:text-lg">
              בבניין איתן, אנחנו מאמינים שבית נמדד קודם כל במה שלא רואים – בתשתיות, בדיוק הקונסטרוקטיבי ובתכנון הנדסי ללא פשרות. אנחנו כאן כדי להפוך את החזון האדריכלי למציאות יציבה, בטוחה ומדויקת, תוך ליווי אישי וניהול מוקפד של כל שלב בדרך.
            </p>
          </div>
          <div className="col-span-4 mt-10 flex items-end justify-end md:col-span-2 md:col-start-11 md:mt-0">
            <span className="font-heading text-8xl font-bold text-charcoal/[0.04] md:text-9xl">
              01
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>
      <TechnicalAnatomy />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>
      <Pillars />

      {/* Expertise Section (Projects) */}
      <section id="projects" className="relative bg-charcoal py-28 text-bone md:py-36">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 text-start">
          <div className="mb-16 md:mb-24">
            <p className="overline-label !text-warm-gray">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              תחומי מומחיות
            </p>
            <h2 className="mt-5 max-w-2xl font-heading text-3xl leading-snug font-bold text-bone md:text-4xl lg:text-5xl">
              הנדסה, תכנון וביצוע — תחת קורת גג אחת.
            </h2>
          </div>
         <div className="grid grid-cols-1 gap-px bg-bone/[0.06] md:grid-cols-3">
            {[
              {
                num: "01",
                title: "הנדסת מבנים ושלד",
                desc: "תכנון וביצוע קונסטרוקטיבי מתקדם לפרויקטים מורכבים. יציקות מדוייקות, ביסוס איתן ופתרונות הנדסיים חכמים שמאפשרים אדריכלות נועזת וחסרת פשרות.",
              },
              {
                num: "02",
                title: "בניית וילות יוקרה",
                desc: "ניהול וביצוע פרויקטי פרימיום משלב היסודות ועד מפתח. עבודה עם חומרי גמר ברמה העולמית הגבוהה ביותר, הקפדה פנאטית על פרטים ופיקוח צמוד בכל רגע נתון.",
              },
              {
                num: "03",
                title: "השבחה ושיפוץ פרימיום",
                desc: "טרנספורמציה מוחלטת של נכסים קיימים. חיזוק מבני, שדרוג מערכות טכנולוגיות מתקדמות והתאמת המבנה לסטנדרט מגורים עכשווי ויוקרתי, תוך עמידה בתקני בטיחות מחמירים.",
              },
            ].map((service) => (
              <div
                key={service.num}
                className="group bg-charcoal p-8 transition-colors duration-500 hover:bg-charcoal-light md:p-12 text-start"
              >
                <span className="font-heading text-5xl font-bold text-accent/20 transition-colors duration-500 group-hover:text-accent/40 block">
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
      </section>

      <ContactForm />
      <Footer />
    </main>
  );
}
