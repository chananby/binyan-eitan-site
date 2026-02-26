import { motion } from "framer-motion";
import { Whatsapp } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Binyan Eitan - Engineering & Construction | Led by Moti Eitan",
  description:
    "Our new site is under construction, showcasing our complex engineering and luxury projects. In the meantime, we are available for any inquiries.",
  robots: "noindex, nofollow",
};

export default function MaintenanceEnglish() {
  return (
    <motion.main
      className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-charcoal p-4"
      dir="ltr"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.h1
        className="text-4xl font-heading font-bold mb-4 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Binyan Eitan - Engineering &amp; Construction | Led by Moti Eitan
      </motion.h1>

      <motion.p
        className="text-lg mb-10 text-center max-w-xl"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Our new site is under construction, showcasing our complex engineering and luxury projects. In the meantime, we are available for any inquiries.
      </motion.p>

      <div className="flex flex-col sm:flex-row gap-4">
        <motion.a
          href="tel:+972525000447"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#8D775F] text-white rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Call Us: <span dir="ltr" className="inline-block">+972‑52‑500‑0447</span>
        </motion.a>

        <motion.a
          href="https://wa.me/972585008447"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#8D775F] text-white rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Whatsapp className="mr-2" /> WhatsApp
        </motion.a>
      </div>
    </motion.main>
  );
}

/*
Original page content preserved below for future restoration:

(/*
import ContactForm from "../components/ContactForm";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TechnicalAnatomy from "../components/TechnicalAnatomy";
import Pillars from "../components/Pillars";
import PortfolioGallery from "../components/PortfolioGallery";
import EngineeringExcellence from "../components/EngineeringExcellence";
import SectionReveal from "../components/SectionReveal";
import ProcessSection from "../components/ProcessSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering Israel",
  description: "G1 Registered Contractor. 20+ years of luxury construction, structural engineering and premium renovations across Israel. Jerusalem & Lod.",
  keywords: ["Construction Engineering Israel", ...],
  openGraph: { /* full og data */ },
  twitter: { /* twitter data */ },
  alternates: { canonical: "https://binyaneitan.com/en", languages: { he: "https://binyaneitan.com/he" } },
};

export default function EnglishHome() {
  return (
    <main className="relative" dir="ltr">
      <Navbar />
      <Hero />

      {/* process section added */}
      <ProcessSection />

      <div className="border-b border-warm-gray-light" />
      <TechnicalAnatomy />
      <div className="border-b border-warm-gray-light" />
      <Pillars />

      {/* expertise article and other deep links */}
      <EngineeringExcellence />
      <PortfolioGallery />
      <SectionReveal />

      <ContactForm />
      <Footer />
    </main>
  );
}
*/
