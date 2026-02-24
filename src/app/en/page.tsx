import ContactForm from "../components/ContactForm";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TechnicalAnatomy from "../components/TechnicalAnatomy";
import Pillars from "../components/Pillars";
import PortfolioGallery from "../components/PortfolioGallery";
import EngineeringExcellence from "../components/EngineeringExcellence";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Binyan Eitan | Engineering is the Foundation. Peace of Mind is the Result.",
  description: "We believe a luxury home is defined by what lies beneath the surface. Engineering, design, and execution under one roof.",
};

export default function EnglishHome() {
  return (
    <main className="relative" dir="ltr">
      <Navbar />
      <Hero />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>

      {/* The Foundation Section */}
      <section id="about" className="relative bg-bone py-36 md:py-48">
        <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-x-4 px-6 md:grid-cols-12 md:gap-x-6 lg:px-12">
          <div className="col-span-4 mb-10 md:col-span-3 md:col-start-1 md:mb-0">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              The Foundation
            </p>
          </div>
          <div className="col-span-4 md:col-span-6 md:col-start-4 text-start">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              Quality as a Standard. Your Peace of Mind is the Goal.
            </h2>
            <p className="mt-6 font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-8 md:text-lg">
              At Binyan Eitan, we believe a luxury home is defined by what lies beneath the surface—infrastructure, structural integrity, and uncompromising engineering. We turn architectural vision into a solid, secure reality through meticulous management and professional excellence.
            </p>
          </div>
          <div className="col-span-4 mt-10 flex items-end justify-end md:col-span-2 md:col-start-11 md:mt-0">
            <span className="font-heading text-8xl font-bold text-warm-gray/20 md:text-9xl" aria-hidden="true">
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

      {/* Expertise Section */}
      <section id="expertise" className="relative bg-charcoal py-36 text-bone md:py-48">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 text-start">
          <div className="mb-16 md:mb-24">
            <p className="overline-label !text-warm-gray">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              Areas of Expertise
            </p>
            <h2 className="mt-5 max-w-2xl font-heading text-3xl leading-snug font-bold text-bone md:text-4xl lg:text-5xl">
              Engineering, Design & Execution — Under One Roof.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px bg-bone/[0.06] md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: "01",
                title: "Structural Engineering",
                desc: "Advanced structural design and execution for complex projects. Precise casting, solid foundations, and smart engineering solutions that enable bold, uncompromising architecture.",
              },
              {
                num: "02",
                title: "Luxury Construction",
                desc: "Turnkey management and execution of premium projects. Working with world-class finishing materials, fanatical attention to detail, and close supervision at every moment.",
              },
              {
                num: "03",
                title: "Premium Renovations",
                desc: "Complete transformation of existing properties. Structural reinforcement, upgrading advanced technological systems, and adapting the structure to contemporary luxury living standards.",
              },
              {
                num: "04",
                title: "Project Management & Engineering Supervision",
                desc: "End-to-end project management and on-site engineering supervision. Ensuring every phase meets the highest standards of quality, safety, and technical precision.",
              },
            ].map((service) => (
              <div
                key={service.num}
                className="group bg-charcoal p-8 transition-colors duration-500 hover:bg-charcoal-light md:p-12 text-start"
              >
                <span className="font-heading text-5xl font-bold text-accent/20 transition-colors duration-500 group-hover:text-accent/40 block" aria-hidden="true">
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

      <PortfolioGallery />
      <EngineeringExcellence />

      <ContactForm />
      <Footer />
    </main>
  );
}
