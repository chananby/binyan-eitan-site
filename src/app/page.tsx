"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   CONSTANTS & DATA
   ───────────────────────────────────────────── */
const C = {
  bg: "#ffffff",
  bgWarm: "#f9f7f2",
  text: "#1a1a1a",
  textLight: "#666666",
  textMuted: "#888888",
  amber: "#c5a35d",
  border: "rgba(0,0,0,0.06)",
};

const PROJECTS = [
  { title: "Ramat Eshkol", subtitle: "Full Villa Renovation & Transformation", image: "/ramat-eshkol.jpg", images: ["/ramat-eshkol.jpg", ...Array.from({ length: 10 }, (_, i) => `/ramat-eshkol-penthouse-${i + 1}.jpg`)], category: "Renovations" },
  { title: "Bayit Vegan", subtitle: "Structural Extension & Luxury Remodeling", image: "/bayit-vegan.jpg", images: ["/bayit-vegan.jpg", ...Array.from({ length: 19 }, (_, i) => `/bayit-vegan-${i + 1}.jpg`)], category: "Engineering" },
  { title: "Amshinov", subtitle: "Historical Restoration & Institutional Build", image: "/amshinov.jpg", images: ["/amshinov.jpg", ...Array.from({ length: 23 }, (_, i) => `/amshinov-${i + 1}.jpg`)], category: "Restoration" },
];

/* ─────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <motion.header initial={{ y: -100 }} animate={{ y: 0 }} className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"}`}>
      <nav className="max-w-[1440px] mx-auto px-6 md:px-16 flex items-center justify-between h-20 md:h-24 font-sans">
        <a href="#" className="flex items-center gap-4">
          <Image src="/logo.jpg" alt="Binyan Eitan Logo" width={35} height={35} className="rounded-sm" />
          <div className="flex flex-col">
            <span className="font-playfair text-lg leading-tight">BINYAN EITAN</span>
            <span className="text-[9px] tracking-[0.2em] uppercase text-[#c5a35d]">Renovations & Engineering</span>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-10">
          <a href="#portfolio" className="text-[11px] uppercase tracking-widest hover:text-[#c5a35d]">Portfolio</a>
          <a href="#visionary" className="text-[11px] uppercase tracking-widest hover:text-[#c5a35d]">Our Team</a>
          <a href="#contact" className="text-[11px] uppercase tracking-widest hover:text-[#c5a35d]">Contact</a>
          <div className="flex items-center gap-4 ml-4 pl-6 border-l border-black/5">
            <a href="/he" className="text-[10px] font-bold">HE</a>
            <a href="#contact" className="px-6 py-2 border border-[#c5a35d] text-[#c5a35d] text-[10px] uppercase tracking-widest hover:bg-[#c5a35d] hover:text-white transition-all">Get in Touch</a>
          </div>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden z-[110] flex flex-col gap-1.5">
          <span className={`w-6 h-0.5 bg-black transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-6 h-0.5 bg-black ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`w-6 h-0.5 bg-black transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white z-[105] flex flex-col items-center justify-center gap-8 font-sans">
            <a href="#portfolio" onClick={()=>setMenuOpen(false)} className="text-3xl font-playfair">Portfolio</a>
            <a href="#visionary" onClick={()=>setMenuOpen(false)} className="text-3xl font-playfair">About</a>
            <a href="/he" className="text-sm border border-black px-8 py-2">HEBREW</a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 md:pt-20 bg-[#f9f7f2] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 w-full grid md:grid-cols-12 gap-10 items-center font-sans">
        <div className="col-span-12 md:col-span-7 z-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase block mb-6 text-[#c5a35d]">Jerusalem • Elite Renovations</span>
            <h1 className="font-playfair text-4xl sm:text-6xl md:text-8xl lg:text-9xl leading-[1.05] tracking-tighter mb-8 text-[#1a1a1a]">
              Luxury Renovations <br className="hidden md:block" /> <span className="italic font-light text-[#888888]">In Jerusalem</span>
            </h1>
            <p className="text-[16px] md:text-[19px] leading-relaxed max-w-xl font-light mb-10 text-[#666666]">
              High-end home remodeling and complex engineering for private estates and historical landmarks. Native-level communication for international clients.
            </p>
            <a href="#portfolio" className="text-[11px] md:text-[12px] tracking-[0.2em] uppercase border-b border-black pb-2 hover:border-[#c5a35d] transition-all font-bold">Explore Our Work</a>
          </motion.div>
        </div>
        <div className="col-span-12 md:col-span-5 relative aspect-[16/10] md:aspect-auto md:h-[70vh] overflow-hidden rounded-sm shadow-xl z-10">
          <Image src="/ramat-eshkol.jpg" alt="Luxury Home Renovation Jerusalem" fill className="object-cover" priority />
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <div className="py-20 bg-white border-y border-black/5 font-sans">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 grayscale opacity-60">
          <div className="text-center md:text-left">
            <span className="text-[10px] tracking-widest uppercase block mb-2 text-[#c5a35d]">Institutional Trust</span>
            <div className="font-playfair text-lg md:text-xl">Western Wall Heritage Foundation</div>
          </div>
          <div className="text-center">
            <span className="text-[10px] tracking-widest uppercase block mb-2 text-[#c5a35d]">Collaborations</span>
            <div className="font-playfair text-lg md:text-xl">Leading Architecture Firms</div>
          </div>
          <div className="text-center md:text-right">
            <span className="text-[10px] tracking-widest uppercase block mb-2 text-[#c5a35d]">Track Record</span>
            <div className="font-playfair text-lg md:text-xl">200+ Private Luxury Clients</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Visionary() {
  return (
    <section id="visionary" className="py-24 md:py-48 bg-[#fcfaf7]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 flex flex-col md:flex-row gap-16 items-center">
        <div className="w-full md:w-5/12 aspect-[3/4] relative overflow-hidden rounded-sm shadow-2xl">
          <Image src="/ramat-eshkol.jpg" alt="Moti Eitan - Jerusalem Renovation Expert" fill className="object-cover" />
        </div>
        <div className="w-full md:w-7/12 font-sans">
          <span className="text-[11px] tracking-[0.4em] uppercase block mb-5 text-[#c5a35d]">Our Leadership</span>
          <h2 className="font-playfair text-4xl md:text-6xl mb-6">Moti Eitan</h2>
          <div className="space-y-6 text-[17px] leading-relaxed font-light text-[#666]">
            <p>With over 25 years of experience in Jerusalem&apos;s luxury sector, Moti Eitan bridges the gap between complex Israeli engineering and international service standards.</p>
            <p>From modern penthouse renovations to historical preservation, we provide a seamless, transparent experience for homeowners abroad.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Portfolio() {
  const [activeProject, setActiveProject] = useState<any>(null);
  return (
    <section id="portfolio" className="py-24 md:py-32 bg-white font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        <div className="mb-20">
          <span className="text-[11px] tracking-[0.4em] uppercase block mb-4 text-[#c5a35d]">Renovation Showcase</span>
          <h2 className="font-playfair text-4xl md:text-6xl">Portfolio</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
