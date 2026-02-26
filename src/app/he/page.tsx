import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "בסדר! בקרוב | בניין איתן",
  description: "האתר נמצא בבנייה. חזרו בקרוב.",
  robots: "noindex, nofollow",
};

export default function MaintenanceHebrew() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-charcoal p-4" dir="rtl">
      <h1 className="text-4xl font-bold mb-4">בנין איתן - הנדסה ובנייה</h1>
      <p className="text-lg mb-8">האתר החדש שלנו בבנייה. בקרוב נחשוף את הפרויקטים החדשים שלנו.</p>
      <a
        href="tel:+972525000447"
        className="inline-block px-6 py-3 bg-[#8D775F] text-white rounded-lg font-semibold"
      >
        התקשרו אלינו: +972‑52‑500‑0447
      </a>
    </main>
  );
}

/*
Original Hebrew home page preserved for later:
(import ContactForm from "../components/ContactForm";
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
  description: "...",
  ...
};

export default function HebrewHome() {
  return (
    <main className="relative" dir="rtl">
      <Navbar />
      <Hero />
      ...
      <Footer />
    </main>
  );
}
*/
