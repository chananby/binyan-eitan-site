import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TechnicalAnatomy from "../components/TechnicalAnatomy";
import Pillars from "../components/Pillars";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering",
  description: "Every project is a testament to engineering excellence and uncompromising craftsmanship.",
};
export default function EnglishHome() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>

      <section className="relative bg-bone py-28 md:py-36">
        <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-x-4 px-6 md:grid-cols-12 md:gap-x-6 lg:px-12">
          <div className="col-span-4 mb-10 md:col-span-3 md:col-start-1 md:mb-0">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              Our Philosophy
            </p>
          </div>
          <div className="col-span-4 md:col-span-6 md:col-start-4">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              Every project is a testament to engineering excellence and
              uncompromising craftsmanship.
            </h2>
            <p className="mt-6 font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-8 md:text-lg">
              At Binyan Eitan, we believe luxury construction begins with a deep
              understanding of the client&apos;s vision and ends with execution
              precise to the last detail. Every line, every material, every joint
              — reflects our commitment to perfection.
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

      <section className="relative bg-charcoal py-28 text-bone md:py-36">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="mb-16 md:mb-24">
            <p className="overline-label !text-warm-gray">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              Areas of Expertise
            </p>
            <h2 className="mt-5 max-w-2xl font-heading text-3xl leading-snug font-bold text-bone md:text-4xl lg:text-5xl">
              Engineering, Design & Execution — Under One Roof.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px bg-bone/[0.06] md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Structural Engineering",
                desc: "Advanced structural design with an emphasis on innovation, safety and long-term resilience.",
              },
              {
                num: "02",
                title: "Luxury Construction",
                desc: "Execution at the highest level with premium materials and unparalleled craftsmanship.",
              },
              {
                num: "03",
                title: "Renovations & Upgrades",
                desc: "Transforming existing structures while preserving original character and elevating the standard.",
              },
            ].map((service) => (
              <div
                key={service.num}
                className="group bg-charcoal p-8 transition-colors duration-500 hover:bg-charcoal-light md:p-12"
              >
                <span className="font-heading text-5xl font-bold text-accent/20 transition-colors duration-500 group-hover:text-accent/40">
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

      <section className="bg-bone py-20 md:py-28" id="contact">
        <div className="mx-auto max-w-[1400px] px-6 text-center lg:px-12">
          <p className="overline-label mx-auto">
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            Let&apos;s Build Together
            <span className="ms-3 inline-block h-px w-6 bg-accent align-middle" />
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
            Ready to start your next project?
          </h2>
          <a
            href="mailto:info@binyan-eitan.co.il"
            className="group mt-10 inline-flex items-center gap-3 border-b-2 border-charcoal/80 pb-2.5 font-body text-sm font-semibold tracking-wider uppercase text-charcoal transition-all duration-500 hover:gap-4 hover:border-accent hover:text-accent"
          >
            Get in Touch
            <ArrowDownRightIcon />
          </a>
        </div>
      </section>
    </main>
  );
}

function ArrowDownRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-500 group-hover:translate-y-0.5"
    >
      <path d="M7 7 17 17" />
      <path d="M7 17h10V7" />
    </svg>
  );
}
