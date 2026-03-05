"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "../TranslationsProvider";
import Navbar from "../Navbar";
import Hero from "../Hero";
import Pillars from "../Pillars";
import PortfolioGallery from "../PortfolioGallery";
import EngineeringExcellence from "../EngineeringExcellence";
import Testimonials from "../Testimonials";
import FounderQuote from "../FounderQuote";
import ContactForm from "../ContactForm";
import Footer from "../Footer";

export default function HeHomeClient() {
  const t = useTranslations("home", "he");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Lazy initializer: read sessionStorage synchronously on first render
  // (safe because this component is loaded with ssr:false)
  const [showPreview] = useState<boolean>(
    () => typeof window !== "undefined" && sessionStorage.getItem("preview_mode") === "true"
  );

  if (showPreview) {
    return (
      <main className="relative bg-bone" dir="rtl">
        <Navbar />
        <Hero />
        <Pillars />
        <PortfolioGallery />
        <EngineeringExcellence />
        <Testimonials />
        <ContactForm />
        <FounderQuote />
        <Footer />
      </main>
    );
  }

  // ── Maintenance screen ─────────────────────────────────────────────────────
  return (
    <motion.main
      className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-charcoal p-4 pt-20 sm:pt-4"
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.h1
        className="text-3xl sm:text-4xl font-heading font-bold mb-4 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {t.heading}
      </motion.h1>

      <motion.p
        className="text-lg mb-10 text-center max-w-xl"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {t.description}
      </motion.p>

      <div className="flex flex-col sm:flex-row gap-4">
        <motion.a
          href="tel:+972525000447"
          className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 bg-accent text-bone rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {t.callUs} <span dir="ltr" className="inline-block">{t.phone}</span>
        </motion.a>

        <motion.a
          href="https://wa.me/972585008447"
          className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 bg-accent text-bone rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle className="ml-2" /> {t.whatsapp}
        </motion.a>
      </div>
    </motion.main>
  );
}
