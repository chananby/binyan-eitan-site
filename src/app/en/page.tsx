import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming Soon | Binyan Eitan",
  description: "The site is under construction. Please check back soon.",
  robots: "noindex, nofollow",
};

export default function MaintenanceEnglish() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-charcoal p-4" dir="ltr">
      <h1 className="text-4xl font-bold mb-4">בנין איתן - הנדסה ובנייה</h1>
      <p className="text-lg mb-8">האתר החדש שלנו בבנייה. בקרוב נחשוף את הפרויקטים החדשים שלנו.</p>
      <a
        href="tel:+972525000447"
        className="inline-block px-6 py-3 bg-[#8D775F] text-white rounded-lg font-semibold"
      >
        Call Us: +972‑52‑500‑0447
      </a>
    </main>
  );
}

/*
Original page content preserved below for future restoration:

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
  title: "Binyan Eitan | Luxury Construction & Engineering Israel",
  description: "G1 Registered Contractor. 20+ years of luxury construction, structural engineering and premium renovations across Israel. Jerusalem & Lod.",
  keywords: [...],
  openGraph: { ... },
  twitter: { ... },
  alternates: { ... },
};

export default function EnglishHome() {
  return (
    <main className="relative" dir="ltr">
      <Navbar />
      <Hero />
      ...
      <Footer />
    </main>
  );
}
*/
