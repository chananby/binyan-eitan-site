"use client";

import { useEffect } from "react";
import Navbar from "../Navbar";
import Hero from "../Hero";
import Pillars from "../Pillars";
import ProcessSection from "../ProcessSection";
import TechnicalAnatomy from "../TechnicalAnatomy";
import PortfolioGallery from "../PortfolioGallery";
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
      <EngineeringExcellence />
      <Testimonials />
      <FounderQuote />
      <ContactForm />
      <Footer />
    </main>
  );
}
