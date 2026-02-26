import ContactForm from "../components/ContactForm";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TechnicalAnatomy from "../components/TechnicalAnatomy";
import Pillars from "../components/Pillars";
import PortfolioGallery from "../components/PortfolioGallery";
import EngineeringExcellence from "../components/EngineeringExcellence";
import SectionReveal from "../components/SectionReveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "בניין איתן | קבלן רשום ג1 | הנדסה ובנייה יוקרתית בישראל",
  description: "קבלן רשום ג1. מעל 20 שנות ניסיון בבנייה פרטית וציבורית, הנדסת קונסטרוקציה ושיפוץ פרימיום. ירושלים ולוד.",
  keywords: [
    "קבלן רשום ג1",
    "בנייה פרטית וציבורית",
    "הנדסת קונסטרוקציה",
    "בנייה יוקרתית ישראל",
    "Construction Engineering Israel",
    "שיפוץ פרימיום ירושלים",
    "בניין איתן",
    "קבלן בנייה ירושלים",
  ],
  openGraph: {
    title: "בניין איתן | הנדסה מעבר לפני השטח",
    description: "קבלן רשום ג1. מעל 20 שנות ניסיון בבנייה פרטית וציבורית, הנדסת קונסטרוקציה ושיפוץ פרימיום בישראל.",
    url: "https://binyaneitan.com/he",
    siteName: "בניין איתן",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "בניין איתן — הנדסה ובנייה יוקרתית בישראל" }],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "בניין איתן | קבלן רשום ג1",
    description: "קבלן רשום ג1. מעל 20 שנות ניסיון בבנייה פרטית וציבורית בישראל.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://binyaneitan.com/he",
    languages: { en: "https://binyaneitan.com/en" },
  },
};

export default function HebrewHome() {
  return (
    <main className="relative" dir="rtl">
      <Navbar />
      <Hero />

      <div className="border-b border-warm-gray-light" />

      {/* היסודות שלנו Section */}
      <section id="about" className="relative bg-bone py-24 md:py-32">
        <div className="mx-auto grid max-w-[1440px] grid-cols-4 gap-x-4 px-8 md:grid-cols-12 md:gap-x-6">
          <SectionReveal className="col-span-4 mb-10 md:col-span-3 md:col-start-3 md:mb-0">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              היסודות שלנו
            </p>
          </SectionReveal>
          <SectionReveal delay={0.1} className="col-span-4 md:col-span-7 md:col-start-6">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              איכות כסטנדרט. השקט הנפשי שלכם הוא המטרה.
            </h2>
            <p className="mt-6 font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-8 md:text-lg">
              בבנין איתן, אנו יוצקים לתוך כל פרויקט תכנון קונסטרוקטיבי קפדני וניהול אישי מקיף, כדי להפוך חזון אדריכלי למציאות בטוחה ומדויקת.
            </p>
          </SectionReveal>
        </div>
      </section>

      <div className="border-b border-warm-gray-light" />
      <TechnicalAnatomy />

      <div className="border-b border-warm-gray-light" />
      <Pillars />

      {/* Expertise Section */}
      <section id="expertise" className="relative bg-charcoal py-24 text-bone md:py-32">
        <div className="mx-auto max-w-[1440px] px-8 text-start">
          <SectionReveal className="mb-10 md:mb-16">
            <p className="overline-label !text-warm-gray">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              תחומי מומחיות
            </p>
            <h2 className="mt-5 max-w-2xl font-heading text-3xl leading-snug font-bold text-bone md:text-4xl lg:text-5xl">
              הנדסה, תכנון וביצוע — תחת קורת גג אחת.
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 gap-px bg-bone/[0.06] md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: "01",
                title: "הנדסת קונסטרוקציה ושלד",
                desc: "ביצוע מורכב ומדויק המהווה את עמוד השדרה של הפרויקט.",
              },
              {
                num: "02",
                title: "בניית וילות פרימיום",
                desc: "ליווי הנדסי וביצועי מקצה לקצה לבתי מגורים בעיצוב אדריכלי מורכב.",
              },
              {
                num: "03",
                title: "השבחה ושיפוץ פרימיום",
                desc: "טרנספורמציה מוחלטת של נכסים קיימים. חיזוק מבני, שדרוג מערכות טכנולוגיות מתקדמות והתאמת המבנה לסטנדרט מגורים עכשווי ויוקרתי, תוך עמידה בתקני בטיחות מחמירים.",
              },
              {
                num: "04",
                title: "ניהול ופיקוח הנדסי",
                desc: "ניהול פרויקט מקצה לקצה ופיקוח הנדסי בשטח. כל שלב נבדק ומאושר לפי הסטנדרטים הגבוהים ביותר של איכות, בטיחות ודיוק טכני.",
              },
            ].map((service) => (
              <div
                key={service.num}
                className="group flex flex-col bg-charcoal p-8 transition-colors duration-500 hover:bg-charcoal-light md:p-12 text-start"
              >
                <h3 className="font-heading text-xl font-bold text-bone md:text-2xl">
                  {service.title}
                </h3>
                <p className="mt-4 font-body text-sm leading-relaxed font-light text-bone/50">
                  {service.desc}
                </p>
                <div className="mt-auto pt-8 h-px w-12 bg-accent/30 transition-all duration-500 group-hover:w-20 group-hover:bg-accent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <PortfolioGallery />
      <EngineeringExcellence />

      <ContactForm />
      <Footer />
    </main>
  );
}
