"use client";

import { useEffect } from "react";
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

export default function HeHomeClient() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="relative bg-bone" dir="rtl">
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
              לפני ואחרי
            </p>
            <h2 className="font-heading text-3xl font-bold text-bone md:text-4xl">
              ירושלים — מאיר שחם
            </h2>
            <p className="mt-3 font-body text-sm text-bone/50">
              שיפוץ מקיף: חדר האמבטיה נפרק עד לגולמי ונבנה מחדש.
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
