"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   DATA & IMAGES (With your full galleries)
   ───────────────────────────────────────────── */

const PROJECTS = [
  {
    title: "Ramat Eshkol",
    subtitle: "Complete Villa Transformation",
    image: "/ramat-eshkol.jpg",
    images: [
      "/ramat-eshkol.jpg",
      ...Array.from({ length: 10 }, (_, i) => `/ramat-eshkol-penthouse-${i + 1}.jpg`),
    ],
    category: "Residential",
    year: "2024",
    area: "220 m²",
  },
  {
    title: "Bayit VeGan",
    subtitle: "Structural Extension & Luxury Interior",
    image: "/bayit-vegan.jpg",
    images: [
      "/bayit-vegan.jpg",
      ...Array.from({ length: 19 }, (_, i) => `/bayit-vegan-${i + 1}.jpg`),
    ],
    category: "Extension",
    year: "2024",
    area: "180 m²",
  },
  {
    title: "Amshinov",
    subtitle: "Heritage Building Renovation",
    image: "/amshinov.jpg",
    images: [
      "/amshinov.jpg",
      ...Array.from({ length: 23 }, (_, i) => `/amshinov-${i + 1}.jpg`),
    ],
    category: "Renovation",
    year: "2023",
    area: "310 m²",
  },
  {
    title: "Ohel Avshalom",
    subtitle: "Precision Engineering & Finishing",
    image: "/ohel-avshalom.jpg",
    images: [
      "/ohel-avshalom.jpg",
      ...Array.from({ length: 15 }, (_, i) => `/ohel-avshalom-${i + 1}.jpg`),
    ],
    category: "Engineering",
    year: "2023",
    area: "160 m²",
  },
];

const EXPERTISE = [
  {
    number: "01",
    title: "Luxury Construction",
    description: "Bespoke residential builds crafted with uncompromising attention to material quality, spatial harmony, and enduring elegance. Every surface, joint, and finish is executed to perfection.",
    icon: (
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2">
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
    description: "Structural additions that defy convention. We specialize in floor extensions, load-bearing modifications, and engineering solutions where precision is non-negotiable.",
    icon: (
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2">
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
    description: "End-to-end oversight with forensic attention to timelines, budgets, and quality benchmarks. A single point of accountability from foundation to final walkthrough.",
    icon: (
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="24" cy="24" r="18" />
        <path d="M24 12V24L32 32" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

const PROCESS_STEPS = [
  { step: "01", title: "Consultation", description: "We listen. Understanding your vision, requirements, and the soul of your space before a single line is drawn." },
  { step: "02", title: "Planning", description: "Detailed architectural plans, engineering calculations, and material specifications — every element mapped with surgical precision." },
  { step: "03", title: "Execution", description: "Our master craftsmen bring plans to life with relentless quality control, transparent communication, and zero shortcuts." },
  { step: "04", title: "Handover", description: "A flawless final inspection and walkthrough, ensuring every detail meets our standard of excellence before we hand you the keys." },
];

/* ─────────────────────────────────────────────
   PALETTE TOKENS (LIGHT MODE)
   ───────────────────────────────────────────── */

const C = {
  bg: "#fdfdfd",
  bgAlt: "#f6f5f2",
  bgWarm: "#f9f8f5",
  text: "#1a1a1a",
  textMuted: "#6b6b6b",
  textLight: "#9a9a9a",
  textFaint: "#c5c5c5",
  amber: "#d4a017",
  amberLight: "#e8c44a",
  amberFaint: "rgba(212,160,23,0.06)",
  border: "rgba(0,0,0,0.06)",
  borderHover: "rgba(0,0,0,0.12)",
};

/* ─────────────────────────────────────────────
   ANIMATION VARIANTS
   ───────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: i * 0.14 },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1, transition: { duration: 1, ease: "easeOut", delay: i * 0.1 },
  }),
};

const lineGrow = {
  hidden: { scaleY: 0, originY: 0 },
  visible: { scaleY: 1, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } },
};

/* ─────────────────────────────────────────────
   SECTION WRAPPER
   ───────────────────────────────────────────── */

function Section({ children, className = "", id, style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties; }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} id={id} initial="hidden" animate={inView ? "visible" : "hidden"} className={className} style={style}>
      {children}
    </motion.section>
  );
}

/* ─────────────────────────────────────────────
   LIGHTBOX
   ───────────────────────────────────────────── */

function Lightbox({ project, onClose }: { project: (typeof PROJECTS)[0]; onClose: () => void; }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const total = project.images.length;

  const go = useCallback((dir: 1 | -1) => {
    setDirection(dir);
    setCurrent((prev) => (prev + dir + total) % total);
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose, go]);

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0, scale: 0.94 }),
    center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
    exit: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0, scale: 0.94, transition: { duration: 0.4 } }),
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: "rgba(250,250,248,0.95)", backdropFilter: "blur(20px)" }}>
      <div className="flex items-center justify-between px-6 md:px-12 h-20 flex-shrink-0 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-playfair text-lg md:text-xl" style={{ color: C.text }}>{project.title}</h3>
          <p className="text-[11px] tracking-[0.15em] uppercase font-light" style={{ color: C.textLight }}>{project.subtitle}</p>
        </motion.div>
        <div className="flex items-center gap-6">
          <span className="text-[13px] tabular-nums tracking-wide font-light" style={{ color: C.textMuted }}>
            <span style={{ color: C.text }} className="font-medium">{current + 1}</span> / {total}
          </span>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full border transition-colors" style={{ borderColor: C.border }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.text)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.text} strokeWidth="1.5"><path d="M2 2L14 14M14 2L2 14" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4 md:px-24 pb-6">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div key={current} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-4 md:inset-x-24 md:inset-y-4 flex items-center justify-center">
            <div className="relative w-full h-full max-w-6xl max-h-[80vh] mx-auto">
              <Image src={project.images[current]} alt="" fill className="object-contain drop-shadow-2xl" sizes="(max-width: 768px) 95vw, 80vw" priority={current < 2} />
            </div>
          </motion.div>
        </AnimatePresence>
        <button onClick={() => go(-1)} className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full border bg-white/80 transition-all z-10 hover:bg-black hover:text-white" style={{ borderColor: C.border }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 3L5 9L11 15" /></svg>
        </button>
        <button onClick={() => go(1)} className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full border bg-white/80 transition-all z-10 hover:bg-black hover:text-white" style={{ borderColor: C.border }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 3L13 9L7 15" /></svg>
        </button>
      </div>

      <div className="flex-shrink-0 px-4 md:px-12 pb-6">
        <div className="max-w-4xl mx-auto flex gap-1.5 overflow-x-auto py-2 scrollbar-hide">
          {project.images.map((img, i) => (
            <button key={img} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }} className={`relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 transition-all duration-300 ${i === current ? 'opacity-100 ring-2 ring-[#d4a017] ring-offset-2' : 'opacity-40 hover:opacity-100'}`}>
              <Image src={img} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
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
    <motion.header initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)]" : "bg-transparent"}`}>
      <nav className="max-w-[1440px] mx-auto px-8 md:px-16 flex items-center justify-between h-20 md:h-24">
        <a href="#" className="relative z-50 flex items-center gap-4 group">
          <Image src="/logo.jpg" alt="Binyan Eitan Logo" width={40} height={40} className="rounded-sm object-contain" />
          <div className="flex flex-col">
            <span className="font-playfair text-lg tracking-wide leading-tight" style={{ color: C.text }}>Binyan Eitan</span>
            <span className="text-[10px] tracking-[0.2em] uppercase font-light" style={{ color: C.amber }}>Construction &amp; Engineering</span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-12">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[12px] tracking-[0.2em] uppercase transition-colors duration-300" style={{ color: C.textMuted }} onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)} onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}>{l.label}</a>
          ))}
          <a href="#contact" className="ml-4 px-7 py-2.5 text-[11px] tracking-[0.2em] uppercase transition-all duration-300" style={{ border: `1px solid ${C.amber}`, color: C.amber }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.amber; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.amber; }}>Get in Touch</a>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden relative z-50 w-8 h-8 flex flex-col justify-center items-center gap-1.5" aria-label="Toggle menu">
          <span className="block w-6 h-px transition-all duration-300" style={{ backgroundColor: menuOpen ? "#fff" : C.text, transform: menuOpen ? "rotate(45deg) translateY(3.5px)" : "none" }} />
          <span className="block w-6 h-px transition-all duration-300" style={{ backgroundColor: menuOpen ? "#fff" : C.text, transform: menuOpen ? "rotate(-45deg) translateY(-3.5px)" : "none" }} />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ backgroundColor: C.text }} className="fixed inset-0 z-40 flex flex-col justify-center items-center gap-8">
            {links.map((l, i) => (
              <motion.a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="font-playfair text-3xl text-white/80 hover:text-amber-300 transition-colors">
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div ref={ref} className="relative min-h-screen overflow-hidden" style={{ backgroundColor: C.bgWarm }}>
      <motion.div style={{ y }} className="absolute top-0 right-0 bottom-0 w-full md:w-[55%]">
        <Image src="/ramat-eshkol.jpg" alt="Luxury construction by Binyan Eitan" fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 55vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f9f8f5] via-[#f9f8f5]/80 to-transparent md:from-[#f9f8f5] md:via-[#f9f8f5]/60 md:to-transparent" />
      </motion.div>

      <motion.div style={{ opacity }} className="relative z-10 min-h-screen flex flex-col justify-end pb-24 md:pb-32 px-8 md:px-16 max-w-[1440px] mx-auto">
        <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0} className="mb-8">
          <span className="text-[11px] md:text-[12px] tracking-[0.45em] uppercase font-light" style={{ color: C.amber }}>Jerusalem&apos;s Premier Construction Studio</span>
        </motion.div>

        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} className="font-playfair text-[clamp(2.8rem,7vw,7rem)] leading-[0.92] tracking-tight max-w-3xl" style={{ color: C.text }}>
          Where Vision<br />Meets <span className="italic" style={{ color: C.amber }}>Precision</span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} className="mt-8 md:mt-10 text-base md:text-[17px] max-w-lg leading-[1.75] font-light" style={{ color: C.textMuted }}>
          High-end residential construction, complex structural engineering, and meticulous project management — setting a new standard of excellence in Jerusalem.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="mt-12 flex flex-wrap gap-5">
          <a href="#portfolio" className="group inline-flex items-center gap-3 px-9 py-4 text-white text-[12px] tracking-[0.18em] uppercase font-medium transition-all duration-300" style={{ backgroundColor: C.text }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.amber)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.text)}>
            View Our Work
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
          <a href="#contact" className="inline-flex items-center gap-3 px-9 py-4 text-[12px] tracking-[0.18em] uppercase font-light transition-all duration-300" style={{ border: `1px solid ${C.border}`, color: C.textMuted }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
            Start Your Project
          </a>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="mt-20 pt-10 flex flex-wrap gap-14 md:gap-24" style={{ borderTop: `1px solid ${C.border}` }}>
          {[
            { value: "15+", label: "Years Experience" },
            { value: "200+", label: "Projects Delivered" },
            { value: "G1", label: "Licensed Contractor" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-playfair text-3xl md:text-4xl" style={{ color: C.text }}>{stat.value}</div>
              <div className="text-[10px] tracking-[0.22em] uppercase mt-1.5" style={{ color: C.textLight }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: C.textFaint }}>Scroll</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="w-px h-8" style={{ background: `linear-gradient(to bottom, ${C.amber}, transparent)` }} />
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXPERTISE
   ───────────────────────────────────────────── */

function Expertise() {
  return (
    <Section id="expertise" className="py-32 md:py-48" style={{ backgroundColor: C.bg }}>
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="max-w-2xl mb-24 md:mb-32">
          <motion.span variants={fadeIn} className="text-[11px] tracking-[0.45em] uppercase block mb-5" style={{ color: C.amber }}>What We Do</motion.span>
          <motion.h2 variants={fadeUp} custom={1} className="font-playfair text-4xl md:text-[3.5rem] lg:text-6xl leading-[1.05] tracking-tight" style={{ color: C.text }}>
            Expertise Built on<br /><span className="italic" style={{ color: C.amber }}>Decades</span> of Craft
          </motion.h2>
          <motion.div variants={fadeUp} custom={2} className="mt-5 w-16 h-px" style={{ backgroundColor: C.amber }} />
        </div>

        <div className="grid md:grid-cols-3 gap-0">
          {EXPERTISE.map((item, i) => (
            <motion.div key={item.number} variants={fadeUp} custom={i} className="group relative p-10 md:p-14 transition-colors duration-500" style={{ borderRight: i < 2 ? `1px solid ${C.border}` : "none" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: C.amberFaint }} />
              <div className="relative">
                <div style={{ color: C.textFaint }} className="mb-10">{item.icon}</div>
                <span className="font-playfair text-[4.5rem] leading-none block mb-4" style={{ color: "rgba(0,0,0,0.03)" }}>{item.number}</span>
                <h3 className="font-playfair text-xl md:text-2xl mb-5 transition-colors duration-500 group-hover:text-amber-600" style={{ color: C.text }}>{item.title}</h3>
                <p className="text-[14px] leading-[1.8] font-light" style={{ color: C.textMuted }}>{item.description}</p>
                <div className="mt-10 h-px w-0 group-hover:w-14 transition-all duration-500" style={{ backgroundColor: C.amber }} />
              </div>
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
    <Section id="process" className="py-32 md:py-48 relative overflow-hidden" style={{ backgroundColor: C.bgAlt }}>
      <div className="max-w-[1440px] mx-auto px-8 md:px-16 relative">
        <div className="text-center max-w-2xl mx-auto mb-24 md:mb-32">
          <motion.span variants={fadeIn} className="text-[11px] tracking-[0.45em] uppercase block mb-5" style={{ color: C.amber }}>How We Work</motion.span>
          <motion.h2 variants={fadeUp} custom={1} className="font-playfair text-4xl md:text-[3.5rem] lg:text-6xl leading-[1.05] tracking-tight" style={{ color: C.text }}>
            The Eitan <span className="italic" style={{ color: C.amber }}>Process</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mt-8 text-[15px] leading-[1.8] font-light max-w-lg mx-auto" style={{ color: C.textMuted }}>
            A proven methodology refined over hundreds of projects. Four phases. One unwavering commitment to excellence.
          </motion.p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <motion.div variants={lineGrow} className="hidden md:block absolute left-1/2 -translate-x-px top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, ${C.border}, ${C.amber}40, ${C.border})` }} />
          <div className="space-y-20 md:space-y-0">
            {PROCESS_STEPS.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div key={step.step} variants={fadeUp} custom={i} className={`md:flex items-start ${isLeft ? "" : "md:flex-row-reverse"} md:pb-24`}>
                  <div className={`md:w-[calc(50%-2rem)] ${isLeft ? "md:pr-0 md:text-right" : "md:pl-0"}`}>
                    <span className="font-playfair text-[5rem] md:text-[6rem] leading-none block" style={{ color: "rgba(0,0,0,0.025)" }}>{step.step}</span>
                    <h3 className="font-playfair text-2xl md:text-[1.75rem] -mt-10 md:-mt-12 mb-5" style={{ color: C.text }}>{step.title}</h3>
                    <p className="text-[14px] leading-[1.8] font-light max-w-sm inline-block" style={{ color: C.textMuted }}>{step.description}</p>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-16 flex-shrink-0 pt-14">
                    <div className="relative"><div className="w-2.5 h-2.5 rotate-45" style={{ backgroundColor: C.amber }} /></div>
                  </div>
                  <div className="md:w-[calc(50%-2rem)]" />
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

function PortfolioCard({ project, index, onOpen }: { project: (typeof PROJECTS)[0]; index: number; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      className={`relative overflow-hidden cursor-pointer group ${index === 0 ? "md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"}`}
    >
      <motion.div animate={{ scale: hovered ? 1.04 : 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0">
        <Image src={project.image} alt={project.title} fill className="object-cover" sizes={index === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"} />
      </motion.div>

      <div className="absolute inset-0 transition-all duration-500" style={{ background: hovered ? "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" : "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)" }} />

      <div className="absolute top-7 left-7 flex items-center gap-2">
        <span className="text-[10px] tracking-[0.3em] uppercase px-3.5 py-1.5 backdrop-blur-sm" style={{ color: C.amber, backgroundColor: "rgba(255,255,255,0.9)" }}>{project.category}</span>
      </div>
      <div className="absolute top-7 right-7">
        <span className="text-[10px] tracking-[0.15em] px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5" style={{ color: C.textMuted, backgroundColor: "rgba(255,255,255,0.9)" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="10" height="10" rx="1" /><path d="M5 3V1h10v10h-2" /></svg>
          {project.images.length}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-7 md:p-10">
        <motion.div animate={{ y: hovered ? 0 : 6, opacity: hovered ? 1 : 0.85 }} transition={{ duration: 0.4 }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-playfair text-white text-xl md:text-2xl lg:text-3xl mb-1.5">{project.title}</h3>
              <p className="text-white/60 text-sm font-light">{project.subtitle}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-white/40 text-[11px] tracking-wider block">{project.year}</span>
              <span className="text-white/40 text-[11px] tracking-wider block">{project.area}</span>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: hovered ? 1 : 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mt-5 h-px origin-left" style={{ backgroundColor: C.amber }} />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }} transition={{ duration: 0.3, delay: hovered ? 0.1 : 0 }} className="mt-4 flex items-center gap-2">
          <span className="text-[11px] tracking-[0.2em] uppercase text-white/70">View Gallery</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" className="opacity-70"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Portfolio() {
  const [activeProject, setActiveProject] = useState<(typeof PROJECTS)[0] | null>(null);

  return (
    <>
      <Section id="portfolio" className="py-32 md:py-48" style={{ backgroundColor: C.bg }}>
        <div className="max-w-[1440px] mx-auto px-8 md:px-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20 md:mb-24">
            <div>
              <motion.span variants={fadeIn} className="text-[11px] tracking-[0.45em] uppercase block mb-5" style={{ color: C.amber }}>Selected Projects</motion.span>
              <motion.h2 variants={fadeUp} custom={1} className="font-playfair text-4xl md:text-[3.5rem] lg:text-6xl leading-[1.05] tracking-tight" style={{ color: C.text }}>
                Crafted with<br /><span className="italic" style={{ color: C.amber }}>Intention</span>
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} custom={2} className="text-[14px] max-w-md leading-[1.8] font-light md:text-right" style={{ color: C.textMuted }}>
              Each project reflects our commitment to transforming spaces with precision engineering and uncompromising quality.
            </motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 md:gap-4">
            {PROJECTS.map((project, i) => (
              <PortfolioCard key={project.title} project={project} index={i} onOpen={() => setActiveProject(project)} />
            ))}
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {activeProject && <Lightbox project={activeProject} onClose={() => setActiveProject(null)} />}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────────────────────────
   CONTACT
   ───────────────────────────────────────────── */

function Contact() {
  const [formState, setFormState] = useState({ name: "", email: "", phone: "", projectType: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(`Hello Binyan Eitan,\n\nName: ${formState.name}\nEmail: ${formState.email}\nPhone: ${formState.phone}\nProject: ${formState.projectType}\n\n${formState.message}`);
    window.open(`https://wa.me/972585008447?text=${text}`, "_blank");
    setSubmitted(true);
  };

  const inputBase = "w-full bg-transparent py-4 text-[14px] placeholder:font-light focus:outline-none transition-colors duration-300 font-light";

  return (
    <Section id="contact" className="py-32 md:py-48 relative" style={{ backgroundColor: C.bgWarm }}>
      <div className="max-w-[1440px] mx-auto px-8 md:px-16 relative">
        <div className="grid md:grid-cols-2 gap-20 md:gap-32">
          <div>
            <motion.span variants={fadeIn} className="text-[11px] tracking-[0.45em] uppercase block mb-5" style={{ color: C.amber }}>Get in Touch</motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="font-playfair text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-10" style={{ color: C.text }}>
              Let&apos;s Build<br />Something <span className="italic" style={{ color: C.amber }}>Extraordinary</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-[15px] leading-[1.8] font-light mb-16 max-w-md" style={{ color: C.textMuted }}>
              Ready to transform your space? Whether you&apos;re planning a luxury build, a complex extension, or a complete renovation — we&apos;d love to hear about your vision.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="space-y-7">
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 flex items-center justify-center" style={{ border: `1px solid ${C.border}` }}>
                  <svg className="w-[18px] h-[18px]" style={{ color: C.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                </div>
                <div>
                  <a href="tel:058-500-8447" className="text-[14px] transition-colors duration-300 hover:text-amber-600" style={{ color: C.text }}>058-500-8447</a>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="w-11 h-11 flex items-center justify-center" style={{ border: `1px solid ${C.border}` }}>
                  <svg className="w-[18px] h-[18px]" style={{ color: C.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                </div>
                <a href="mailto:office@binyaneitan.com" className="text-[14px] transition-colors duration-300 hover:text-amber-600" style={{ color: C.text }}>office@binyaneitan.com</a>
              </div>

              <div className="flex items-center gap-5">
                <div className="w-11 h-11 flex items-center justify-center" style={{ border: `1px solid ${C.border}` }}>
                  <svg className="w-[18px] h-[18px]" style={{ color: C.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                </div>
                <span className="text-[14px]" style={{ color: C.text }}>Jerusalem, Israel</span>
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} custom={2}>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-0">
                <div className="mb-10"><span className="text-[11px] tracking-[0.3em] uppercase" style={{ color: C.textLight }}>Project Inquiry</span></div>
                <div style={{ borderBottom: `1px solid ${C.border}` }}>
                  <input id="name" type="text" placeholder="Full Name" required value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} className={inputBase} style={{ color: C.text }} />
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div style={{ borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
                    <input id="email" type="email" placeholder="Email" required value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} className={inputBase} style={{ color: C.text }} />
                  </div>
                  <div style={{ borderBottom: `1px solid ${C.border}` }}>
                    <input id="phone" type="tel" placeholder="Phone" value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} className={`${inputBase} pl-4`} style={{ color: C.text }} />
                  </div>
                </div>
                <div style={{ borderBottom: `1px solid ${C.border}` }}>
                  <select id="projectType" value={formState.projectType} onChange={(e) => setFormState({ ...formState, projectType: e.target.value })} className={`${inputBase} appearance-none cursor-pointer`} style={{ color: formState.projectType ? C.text : C.textFaint }}>
                    <option value="" disabled>Select Project Type</option>
                    <option value="new-construction">New Construction</option>
                    <option value="renovation">Full Renovation</option>
                    <option value="extension">Floor Extension</option>
                    <option value="luxury-interior">Luxury Interior</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ borderBottom: `1px solid ${C.border}` }}>
                  <textarea id="message" rows={4} placeholder="Tell us about your vision..." value={formState.message} onChange={(e) => setFormState({ ...formState, message: e.target.value })} className={`${inputBase} resize-none`} style={{ color: C.text }} />
                </div>
                <div className="pt-10">
                  <button type="submit" className="w-full py-5 text-white text-[12px] tracking-[0.2em] uppercase font-medium transition-all duration-300 flex items-center justify-center gap-3" style={{ backgroundColor: C.text }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.amber)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.text)}>
                    Send via WhatsApp
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  </button>
                </div>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full text-center py-24">
                <div className="w-16 h-16 flex items-center justify-center mb-8 rotate-45" style={{ border: `1px solid ${C.amber}` }}>
                  <svg className="w-6 h-6 -rotate-45" style={{ color: C.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-playfair text-2xl mb-3" style={{ color: C.text }}>Message Sent</h3>
                <p className="text-[14px] font-light" style={{ color: C.textMuted }}>Thank you. We&apos;ll be in touch shortly.</p>
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
    <footer className="py-14" style={{ backgroundColor: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="Binyan Eitan" width={30} height={30} className="rounded-sm opacity-70" />
            <span className="font-playfair text-sm" style={{ color: C.textLight }}>Binyan Eitan</span>
          </div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-center" style={{ color: C.textFaint }}>&copy; {new Date().getFullYear()} Binyan Eitan Construction &amp; Engineering. All rights reserved.</p>
          <div className="flex items-center gap-7">
            <a href="https://wa.me/972585008447" target="_blank" rel="noopener noreferrer" className="transition-colors duration-300 hover:text-amber-600" style={{ color: C.textFaint }}>WhatsApp</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   FLOATING WHATSAPP
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
        <motion.a href="https://wa.me/972585008447" target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} whileHover={{ scale: 1.1 }} className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
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
    <main style={{ backgroundColor: C.bg, color: C.text }} className="overflow-x-hidden">
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
