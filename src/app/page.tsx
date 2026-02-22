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
          <Image src="/logo.jpg" alt="Logo" width={35} height={35} className="rounded-sm" />
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
              Premier home remodeling for international homeowners. We combine high-end Israeli craftsmanship with global service standards.
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

function GlobalService() {
  const services = [
    {
      title: "Remote Management",
      desc: "Stay updated from anywhere in the world with daily reports and video walkthroughs via WhatsApp & Zoom.",
      icon: (
        <svg className="w-8 h-8 mb-4 text-[#c5a35d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "International Standards",
      desc: "Engineering and finishes that meet global luxury expectations, ensuring your Jerusalem home feels world-class.",
      icon: (
        <svg className="w-8 h-8 mb-4 text-[#c5a35d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    {
      title: "Engineering Peace of Mind",
      desc: "We handle all local permits, bureaucracy, and structural engineering, providing a stress-free experience from afar.",
      icon: (
        <svg className="w-8 h-8 mb-4 text-[#c5a35d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <section className="py-24 bg-white border-b border-black/5 font-sans">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="grid md:grid-cols-3 gap-16">
          {services.map((s, i) => (
            <div key={i}>
              {s.icon}
              <h3 className="font-playfair text-xl mb-3 text-[#1a1a1a]">{s.title}</h3>
              <p className="text-sm font-light text-[#666] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <div className="py-20 bg-[#f9f7f2] font-sans">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 grayscale opacity-60 text-center md:text-left">
          <div>
            <span className="text-[10px] tracking-widest uppercase block mb-2 text-[#c5a35d]">Institutional Trust</span>
            <div className="font-playfair text-lg md:text-xl">Western Wall Heritage Foundation</div>
          </div>
          <div>
            <span className="text-[10px] tracking-widest uppercase block mb-2 text-[#c5a35d]">Collaborations</span>
            <div className="font-playfair text-lg md:text-xl">Leading Architecture Firms</div>
          </div>
          <div>
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
    <section id="visionary" className="py-24 md:py-48 bg-white">
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
    <section id="portfolio" className="py-24 md:py-32 bg-[#f9f7f2] font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        <div className="mb-20">
          <span className="text-[11px] tracking-[0.4em] uppercase block mb-4 text-[#c5a35d]">Renovation Showcase</span>
          <h2 className="font-playfair text-4xl md:text-6xl">Portfolio</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {PROJECTS.map((p, i) => (
            <div key={i} className="group cursor-pointer" onClick={() => setActiveProject(p)}>
              <div className="aspect-[4/5] relative overflow-hidden mb-6 bg-white">
                <Image src={p.image} alt={p.title} fill className="object-cover md:grayscale group-hover:grayscale-0 transition-all duration-700" />
              </div>
              <h3 className="font-playfair text-2xl mb-1">{p.title}</h3>
              <p className="text-[13px] text-[#888888] font-light">{p.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white overflow-y-auto p-6 pt-24 font-sans">
            <button onClick={() => setActiveProject(null)} className="fixed top-8 left-8 z-[210] uppercase border-b border-black text-xs">Close [X]</button>
            <div className="max-w-[1200px] mx-auto text-center">
              <h2 className="font-playfair text-4xl md:text-7xl mb-8">{activeProject.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProject.images.map((img: string, i: number) => (
                  <div key={i} className={`relative bg-[#f9f7f2] ${i === 0 ? 'md:col-span-2 aspect-[16/9]' : 'aspect-square'}`}>
                    <Image src={img} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append("access_key", "4f934f99-bd06-4f7d-b552-7355cd127598");
    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
    if (res.ok) setSubmitted(true);
  };
  return (
    <section id="contact" className="py-24 md:py-32 bg-[#1a1a1a] text-white font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 grid md:grid-cols-2 gap-20 items-center">
        <div>
          <span className="text-[11px] tracking-[0.45em] uppercase block mb-6 text-[#c5a35d]">Inquiries</span>
          <h2 className="font-playfair text-4xl md:text-7xl mb-10 leading-tight">Start Your <br />Renovation</h2>
          <div className="space-y-4 text-base md:text-lg">
            <p>+972-58-500-8447</p>
            <p className="text-[#666] text-xs uppercase tracking-widest">office@binyaneitan.com</p>
          </div>
        </div>
        <div className="bg-white p-8 md:p-16 text-black">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="text" name="name" placeholder="Full Name" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all bg-transparent" />
              <input type="tel" name="phone" placeholder="Phone (Include Area Code)" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all bg-transparent" />
              <textarea name="message" placeholder="Describe your project..." rows={3} className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all resize-none bg-transparent"></textarea>
              <button type="submit" className="w-full bg-[#1a1a1a] text-white py-5 text-[11px] tracking-[0.2em] uppercase hover:bg-[#c5a35d] transition-all">Request Consultation</button>
            </form>
          ) : (
            <div className="text-center py-10"><h3 className="font-playfair text-2xl">Thank You. We will contact you shortly.</h3></div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="bg-white">
      <Navbar />
      <Hero />
      <GlobalService />
      <TrustSection />
      <Visionary />
      <Portfolio />
      <Contact />
      <footer className="py-12 bg-[#1a1a1a] text-center border-t border-white/5">
        <p className="text-[9px] tracking-[0.4em] uppercase text-[#555]">© 2026 BINYAN EITAN. ALL RIGHTS RESERVED.</p>
      </footer>
    </main>
  );
}
