"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────── */

const PROJECTS = [
  {
    title: "Ramat Eshkol",
    subtitle: "Complete Villa Transformation",
    image: "/ramat-eshkol.jpg",
    category: "Residential",
    year: "2024",
    area: "220 m²",
  },
  {
    title: "Bayit VeGan",
    subtitle: "Structural Extension & Luxury Interior",
    image: "/bayit-vegan.jpg",
    category: "Extension",
    year: "2024",
    area: "180 m²",
  },
  {
    title: "Amshinov",
    subtitle: "Heritage Building Renovation",
    image: "/amshinov.jpg",
    category: "Renovation",
    year: "2023",
    area: "310 m²",
  },
  {
    title: "Ohel Avshalom",
    subtitle: "Precision Engineering & Finishing",
    image: "/ohel-avshalom.jpg",
    category: "Engineering",
    year: "2023",
    area: "160 m²",
  },
];

const EXPERTISE = [
  {
    number: "01",
    title: "Luxury Construction",
    description:
      "Bespoke residential builds crafted with uncompromising attention to material quality, spatial harmony, and enduring elegance. Every surface, joint, and finish is executed to perfection.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="8" y="20" width="32" height="24" rx="1" />
        <path d="M4 20L24 4L44 20" />
        <rect x="18" y="30" width="12" height="14" rx="0.5" />
        <line x1="24" y1="30" x2="24" y2="44" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Complex Extensions & Engineering",
    description:
      "Structural additions that defy convention. We specialize in floor extensions, load-bearing modifications, and engineering solutions where precision is non-negotiable.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M6 42L6 12L18 6L18 42" />
        <path d="M18 14L30 8L30 42" />
        <path d="M30 10L42 6L42 42" />
        <line x1="4" y1="42" x2="46" y2="42" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Project Management",
    description:
      "End-to-end oversight with forensic attention to timelines, budgets, and quality benchmarks. A single point of accountability from foundation to final walkthrough.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="24" cy="24" r="18" />
        <path d="M24 12V24L32 32" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Consultation",
    description: "We listen. Understanding your vision, requirements, and the soul of your space before a single line is drawn.",
  },
  {
    step: "02",
    title: "Planning",
    description: "Detailed architectural plans, engineering calculations, and material specifications — every element mapped with surgical precision.",
  },
  {
    step: "03",
    title: "Execution",
    description: "Our master craftsmen bring plans to life with relentless quality control, transparent communication, and zero shortcuts.",
  },
  {
    step: "04",
    title: "Handover",
    description: "A flawless final inspection and walkthrough, ensuring every detail meets our standard of excellence before we hand you the keys.",
  },
];

/* ─────────────────────────────────────────────
   ANIMATION VARIANTS
   ───────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 1, ease: "easeOut", delay: i * 0.1 },
  }),
};

const scaleReveal = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
};

const lineGrow = {
  hidden: { scaleY: 0, originY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ─────────────────────────────────────────────
   SECTION WRAPPER (Scroll-triggered)
   ───────────────────────────────────────────── */

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─────────────────────────────────────────────
   NAVBAR
   ───────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Expertise", href: "#expertise" },
    { label: "Process", href: "#process" },
    { label: "Portfolio", href: "#portfolio" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between h-20">
        {/* Logo */}
        <a href="#" className="relative z-50 flex items-center gap-3 group">
          <Image
            src="/logo.jpg"
            alt="Binyan Eitan"
            width={40}
            height={40}
            className="rounded-sm"
          />
          <div className="flex flex-col">
            <span className="font-playfair text-white text-lg tracking-wide leading-tight">
              Binyan Eitan
            </span>
            <span className="text-[10px] text-amber-400/80 tracking-[0.3em] uppercase font-light">
              Construction & Engineering
            </span>
          </div>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] tracking-[0.2em] uppercase text-white/60 hover:text-amber-400 transition-colors duration-300"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            className="ml-4 px-6 py-2.5 border border-amber-400/40 text-amber-400 text-[12px] tracking-[0.2em] uppercase hover:bg-amber-400 hover:text-black transition-all duration-300"
          >
            Get in Touch
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden relative z-50 w-8 h-8 flex flex-col justify-center items-center gap-1.5"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-px bg-white transition-all duration-300 ${
              menuOpen ? "rotate-45 translate-y-[3.5px]" : ""
            }`}
          />
          <span
            className={`block w-6 h-px bg-white transition-all duration-300 ${
              menuOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-40 flex flex-col justify-center items-center gap-8"
          >
            {links.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="font-playfair text-3xl text-white/80 hover:text-amber-400 transition-colors"
              >
                {l.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ─────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────── */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div ref={ref} className="relative h-screen min-h-[700px] overflow-hidden bg-black">
      {/* Background Image with Parallax */}
      <motion.div style={{ y }} className="absolute inset-0">
        <Image
          src="/ramat-eshkol.jpg"
          alt="Luxury construction by Binyan Eitan"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
      </motion.div>

      {/* Decorative Lines */}
      <motion.div
        variants={lineGrow}
        initial="hidden"
        animate="visible"
        className="absolute left-12 md:left-24 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-400/20 to-transparent"
      />

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-10 h-full flex flex-col justify-end pb-20 md:pb-28 px-6 md:px-24 max-w-[1400px] mx-auto"
      >
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={0}
          className="mb-6"
        >
          <span className="text-amber-400 text-[11px] md:text-[13px] tracking-[0.4em] uppercase font-light">
            Jerusalem&apos;s Premier Construction Studio
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="font-playfair text-white text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.95] tracking-tight max-w-4xl"
        >
          Where Vision
          <br />
          Meets{" "}
          <span className="italic text-amber-400">Precision</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6 md:mt-8 text-white/50 text-base md:text-lg max-w-xl leading-relaxed font-light"
        >
          High-end residential construction, complex structural engineering, and
          meticulous project management — setting a new standard of excellence in
          Jerusalem.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-10 flex flex-wrap gap-4"
        >
          <a
            href="#portfolio"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-amber-400 text-black text-[13px] tracking-[0.15em] uppercase font-medium hover:bg-amber-300 transition-colors duration-300"
          >
            View Our Work
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-3 px-8 py-4 border border-white/20 text-white text-[13px] tracking-[0.15em] uppercase font-light hover:border-amber-400/50 hover:text-amber-400 transition-all duration-300"
          >
            Start Your Project
          </a>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-12 md:gap-20"
        >
          {[
            { value: "15+", label: "Years Experience" },
            { value: "200+", label: "Projects Delivered" },
            { value: "G1", label: "Licensed Contractor" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-playfair text-2xl md:text-3xl text-white">
                {stat.value}
              </div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-white/40 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-white/30">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-amber-400/50 to-transparent"
        />
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXPERTISE
   ───────────────────────────────────────────── */

function Expertise() {
  return (
    <Section id="expertise" className="bg-neutral-950 py-28 md:py-40">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="max-w-2xl mb-20 md:mb-28">
          <motion.span
            variants={fadeIn}
            className="text-amber-400 text-[11px] tracking-[0.4em] uppercase block mb-4"
          >
            What We Do
          </motion.span>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="font-playfair text-white text-4xl md:text-6xl leading-[1.05] tracking-tight"
          >
            Expertise Built on
            <br />
            <span className="italic text-amber-400">Decades</span> of Craft
          </motion.h2>
          <motion.div
            variants={fadeUp}
            custom={2}
            className="mt-4 w-16 h-px bg-amber-400/40"
          />
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-px bg-white/5">
          {EXPERTISE.map((item, i) => (
            <motion.div
              key={item.number}
              variants={fadeUp}
              custom={i}
              className="group bg-neutral-950 p-8 md:p-12 hover:bg-neutral-900/50 transition-colors duration-500"
            >
              <div className="text-amber-400/30 mb-8">{item.icon}</div>
              <span className="font-playfair text-5xl text-white/5 block mb-4">
                {item.number}
              </span>
              <h3 className="font-playfair text-white text-xl md:text-2xl mb-4 group-hover:text-amber-400 transition-colors duration-500">
                {item.title}
              </h3>
              <p className="text-white/40 text-sm leading-relaxed font-light">
                {item.description}
              </p>
              <div className="mt-8 w-0 group-hover:w-12 h-px bg-amber-400 transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────
   PROCESS
   ───────────────────────────────────────────── */

function Process() {
  return (
    <Section id="process" className="bg-black py-28 md:py-40 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 md:mb-28">
          <motion.span
            variants={fadeIn}
            className="text-amber-400 text-[11px] tracking-[0.4em] uppercase block mb-4"
          >
            How We Work
          </motion.span>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="font-playfair text-white text-4xl md:text-6xl leading-[1.05] tracking-tight"
          >
            The Eitan <span className="italic text-amber-400">Process</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-6 text-white/40 text-sm md:text-base leading-relaxed font-light"
          >
            A proven methodology refined over hundreds of projects. Four phases.
            One unwavering commitment to excellence.
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line (Desktop) */}
          <motion.div
            variants={lineGrow}
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-400/30 via-amber-400/10 to-transparent"
          />

          <div className="space-y-16 md:space-y-0">
            {PROCESS_STEPS.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  custom={i}
                  className={`md:flex items-center ${
                    isLeft ? "" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Content */}
                  <div
                    className={`md:w-1/2 ${
                      isLeft ? "md:pr-20 md:text-right" : "md:pl-20"
                    }`}
                  >
                    <span className="font-playfair text-6xl md:text-7xl text-white/[0.03] block leading-none">
                      {step.step}
                    </span>
                    <h3 className="font-playfair text-white text-2xl md:text-3xl -mt-8 md:-mt-10 mb-4">
                      {step.title}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed font-light max-w-md inline-block">
                      {step.description}
                    </p>
                  </div>

                  {/* Node */}
                  <div className="hidden md:flex items-center justify-center w-0">
                    <div className="relative">
                      <div className="w-3 h-3 bg-amber-400 rotate-45" />
                      <div className="absolute inset-0 w-3 h-3 bg-amber-400/20 rotate-45 animate-ping" />
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="md:w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────
   PORTFOLIO
   ───────────────────────────────────────────── */

function PortfolioCard({
  project,
  index,
}: {
  project: (typeof PROJECTS)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.9,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.15,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden cursor-pointer ${
        index === 0
          ? "md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto"
          : "aspect-[4/3]"
      }`}
    >
      <motion.div
        animate={{ scale: hovered ? 1.05 : 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={project.image}
          alt={`${project.title} – ${project.subtitle}`}
          fill
          className="object-cover"
          sizes={index === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
        />
      </motion.div>

      {/* Overlay */}
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          hovered
            ? "bg-gradient-to-t from-black/80 via-black/20 to-transparent"
            : "bg-gradient-to-t from-black/50 via-transparent to-transparent"
        }`}
      />

      {/* Category Badge */}
      <div className="absolute top-6 left-6">
        <span className="text-[10px] tracking-[0.3em] uppercase text-amber-400 bg-black/50 backdrop-blur-sm px-3 py-1.5">
          {project.category}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <motion.div
          animate={{ y: hovered ? 0 : 8, opacity: hovered ? 1 : 0.8 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-playfair text-white text-xl md:text-2xl lg:text-3xl mb-1">
                {project.title}
              </h3>
              <p className="text-white/50 text-sm font-light">
                {project.subtitle}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-white/30 text-[11px] tracking-wider block">
                {project.year}
              </span>
              <span className="text-white/30 text-[11px] tracking-wider block">
                {project.area}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hover Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: hovered ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 h-px bg-amber-400 origin-left"
        />
      </div>
    </motion.div>
  );
}

function Portfolio() {
  return (
    <Section id="portfolio" className="bg-neutral-950 py-28 md:py-40">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
          <div>
            <motion.span
              variants={fadeIn}
              className="text-amber-400 text-[11px] tracking-[0.4em] uppercase block mb-4"
            >
              Selected Projects
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-playfair text-white text-4xl md:text-6xl leading-[1.05] tracking-tight"
            >
              Crafted with
              <br />
              <span className="italic text-amber-400">Intention</span>
            </motion.h2>
          </div>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-white/40 text-sm max-w-md leading-relaxed font-light md:text-right"
          >
            Each project reflects our commitment to transforming spaces with
            precision engineering and uncompromising quality.
          </motion.p>
        </div>

        {/* Asymmetric Grid */}
        <div className="grid md:grid-cols-3 gap-2 md:gap-3">
          {PROJECTS.map((project, i) => (
            <PortfolioCard key={project.title} project={project} index={i} />
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────
   CONTACT
   ───────────────────────────────────────────── */

function Contact() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build WhatsApp message
    const text = encodeURIComponent(
      `Hello Binyan Eitan,\n\nName: ${formState.name}\nEmail: ${formState.email}\nPhone: ${formState.phone}\nProject: ${formState.projectType}\n\n${formState.message}`
    );
    window.open(`https://wa.me/972585008447?text=${text}`, "_blank");
    setSubmitted(true);
  };

  const inputClasses =
    "w-full bg-transparent border-b border-white/10 py-3 text-white text-sm placeholder:text-white/20 focus:border-amber-400/50 focus:outline-none transition-colors duration-300 font-light";

  return (
    <Section id="contact" className="bg-black py-28 md:py-40 relative">
      {/* Subtle Gradient Accent */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-amber-400/[0.03] to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24">
          {/* Left: Info */}
          <div>
            <motion.span
              variants={fadeIn}
              className="text-amber-400 text-[11px] tracking-[0.4em] uppercase block mb-4"
            >
              Get in Touch
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-playfair text-white text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-8"
            >
              Let&apos;s Build
              <br />
              Something{" "}
              <span className="italic text-amber-400">Extraordinary</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-white/40 text-sm leading-relaxed font-light mb-12 max-w-md"
            >
              Ready to transform your space? Whether you&apos;re planning a luxury
              build, a complex extension, or a complete renovation — we&apos;d love
              to hear about your vision.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="space-y-6">
              {/* Phone */}
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 border border-white/10 flex items-center justify-center group-hover:border-amber-400/30 transition-colors">
                  <svg
                    className="w-4 h-4 text-amber-400/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <a
                    href="tel:058-500-8447"
                    className="text-white/70 text-sm hover:text-amber-400 transition-colors"
                  >
                    058-500-8447
                  </a>
                  <span className="text-white/20 mx-2">|</span>
                  <a
                    href="tel:02-500-0447"
                    className="text-white/70 text-sm hover:text-amber-400 transition-colors"
                  >
                    02-500-0447
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 border border-white/10 flex items-center justify-center group-hover:border-amber-400/30 transition-colors">
                  <svg
                    className="w-4 h-4 text-amber-400/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <a
                  href="mailto:office@binyaneitan.com"
                  className="text-white/70 text-sm hover:text-amber-400 transition-colors"
                >
                  office@binyaneitan.com
                </a>
              </div>

              {/* WhatsApp */}
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 border border-white/10 flex items-center justify-center group-hover:border-amber-400/30 transition-colors">
                  <svg
                    className="w-4 h-4 text-amber-400/60"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <a
                  href="https://wa.me/972585008447"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 text-sm hover:text-amber-400 transition-colors"
                >
                  WhatsApp Direct
                </a>
              </div>

              {/* Location */}
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 border border-white/10 flex items-center justify-center group-hover:border-amber-400/30 transition-colors">
                  <svg
                    className="w-4 h-4 text-amber-400/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <span className="text-white/70 text-sm">Jerusalem, Israel</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Form */}
          <motion.div variants={fadeUp} custom={2}>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="mb-8">
                  <span className="text-white/20 text-[11px] tracking-[0.3em] uppercase">
                    Project Inquiry
                  </span>
                </div>

                <div>
                  <label htmlFor="name" className="sr-only">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="email" className="sr-only">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Email"
                      required
                      value={formState.email}
                      onChange={(e) =>
                        setFormState({ ...formState, email: e.target.value })
                      }
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="sr-only">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="Phone"
                      value={formState.phone}
                      onChange={(e) =>
                        setFormState({ ...formState, phone: e.target.value })
                      }
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="projectType" className="sr-only">Project Type</label>
                  <select
                    id="projectType"
                    value={formState.projectType}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        projectType: e.target.value,
                      })
                    }
                    className={`${inputClasses} appearance-none cursor-pointer ${
                      !formState.projectType ? "text-white/20" : ""
                    }`}
                  >
                    <option value="" disabled>
                      Select Project Type
                    </option>
                    <option value="new-construction">New Construction</option>
                    <option value="renovation">Full Renovation</option>
                    <option value="extension">Floor Extension</option>
                    <option value="luxury-interior">Luxury Interior</option>
                    <option value="engineering">Engineering Consultation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="sr-only">Message</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Tell us about your vision..."
                    value={formState.message}
                    onChange={(e) =>
                      setFormState({ ...formState, message: e.target.value })
                    }
                    className={`${inputClasses} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-amber-400 text-black text-[13px] tracking-[0.2em] uppercase font-medium hover:bg-amber-300 transition-colors duration-300 flex items-center justify-center gap-3"
                >
                  Send via WhatsApp
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </button>

                <p className="text-white/20 text-[11px] text-center font-light">
                  Your inquiry will be sent securely via WhatsApp for fastest response.
                </p>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <div className="w-16 h-16 border border-amber-400/30 flex items-center justify-center mb-6 rotate-45">
                  <svg
                    className="w-6 h-6 text-amber-400 -rotate-45"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-playfair text-white text-2xl mb-2">
                  Message Sent
                </h3>
                <p className="text-white/40 text-sm font-light">
                  Thank you. We&apos;ll be in touch shortly.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 py-12">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Binyan Eitan"
              width={32}
              height={32}
              className="rounded-sm opacity-60"
            />
            <span className="font-playfair text-white/40 text-sm">
              Binyan Eitan
            </span>
          </div>

          <p className="text-white/20 text-[11px] tracking-[0.15em] uppercase text-center">
            &copy; {new Date().getFullYear()} Binyan Eitan Construction &amp;
            Engineering. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <a
              href="https://wa.me/972585008447"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="text-white/30 hover:text-amber-400 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <a
              href="mailto:office@binyaneitan.com"
              aria-label="Email"
              className="text-white/30 hover:text-amber-400 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   FLOATING WHATSAPP BUTTON
   ───────────────────────────────────────────── */

function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href="https://wa.me/972585008447"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.1 }}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25"
          aria-label="Contact us on WhatsApp"
        >
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </motion.a>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="bg-black text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <Expertise />
      <Process />
      <Portfolio />
      <Contact />
      <Footer />
      <WhatsAppFloat />
    </main>
  );
}
