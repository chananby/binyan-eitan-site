"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "../TranslationsProvider";
import Navbar from "../Navbar";
import Hero from "../Hero";
import Pillars from "../Pillars";
import ProcessSection from "../ProcessSection";
import TechnicalAnatomy from "../TechnicalAnatomy";
import PortfolioGallery from "../PortfolioGallery";
import BeforeAfterSlider from "../BeforeAfterSlider";
import EngineeringExcellence from "../EngineeringExcellence";
import Testimonials from "../Testimonials";
import FounderQuote from "../FounderQuote";
import ContactForm from "../ContactForm";
import Footer from "../Footer";

export default function EnHomeClient() {
  const t = useTranslations("home", "en");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Lazy initializer: read sessionStorage synchronously on first render
  // (safe because this component is loaded with ssr:false)
  const [showPreview] = useState<boolean>(
    () => typeof window !== "undefined" && sessionStorage.getItem("preview_mode") === "true"
  );

  if (showPreview) {
    return (
      <main className="relative bg-bone" dir="ltr">
        <Navbar />
        <Hero />
        <Pillars />
        <ProcessSection />
        <TechnicalAnatomy />
        <PortfolioGallery />
        <section className="bg-charcoal py-16 md:py-24">
          <div className="mx-auto max-w-[800px] px-8">
            <div className="mb-8 text-start">
              <p className="overline-label mb-4 text-bone/40">
                <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
                Before &amp; After
              </p>
              <h2 className="font-heading text-3xl font-bold text-bone md:text-4xl">
                Jerusalem — Maier Sham
              </h2>
              <p className="mt-3 font-body text-sm text-bone/50">
                Complete gut renovation: bathroom stripped to substrate and rebuilt.
              </p>
            </div>
            <BeforeAfterSlider
              beforeSrc="/jerusalem-bathroom-before.jpg"
              afterSrc="/jerusalem-bathroom-stripped.jpg"
              aspectRatio="4/5"
            />
          </div>
        </section>
        <EngineeringExcellence />
        <Testimonials />
        <FounderQuote />
        <ContactForm />
        <Footer />
      </main>
    );
  }

  // ── Maintenance screen ─────────────────────────────────────────────────────
  return (
    <motion.main
      className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-charcoal p-4 pt-20 sm:pt-4"
      dir="ltr"
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
          href="tel:+972585008447"
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
          <MessageCircle className="mr-2" /> {t.whatsapp}
        </motion.a>
      </div>
    </motion.main>
  );
}
