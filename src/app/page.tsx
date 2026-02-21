"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  const projects = [
    { id: 1, title: "Penthouse, Ramat Eshkol", tag: "Luxury Living", image: "/פנטהאוז רמת אשכול ירושלים/ramat-eshkol.jpg.jpg" },
    { id: 2, title: "Floor Extension, Bayit Vegan", tag: "Premium Engineering", image: "/הרחבת קומה - בית וגן ירושלים/bayit-vegan.jpg.jpg" },
    { id: 3, title: "Amshinov Project", tag: "Modern Design", image: "/אמשינוב - ירושלים/amshinov.jpg.jpg" },
    { id: 4, title: "Ohel Avshalom", tag: "Complex Extension", image: "/אוהל אבשלום - ניסור והרחבה - ירושלים/ohel-avshalom.jpg.jpg" },
  ];

  return (
    <main className="min-h-screen bg-white text-[#1a1a1a] selection:bg-amber-200" dir="ltr">
      
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full px-8 py-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="relative w-40 h-12">
          <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain" priority />
        </div>
        <div className="hidden lg:flex gap-12 text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500">
          <a href="#home" className="hover:text-amber-600 transition-all">Home</a>
          <a href="#projects" className="hover:text-amber-600 transition-all">Portfolio</a>
          <a href="#contact" className="hover:text-amber-600 transition-all">Inquiry</a>
        </div>
        <a href="tel:0585008447" className="hidden md:block border border-black px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
          Call Now
        </a>
      </nav>

      {/* Hero Section - High End */}
      <section id="home" className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <span className="text-amber-600 font-bold tracking-[0.4em] uppercase text-[12px] mb-6 block">Est. Jerusalem</span>
            <h1 className="text-[12vw] lg:text-[100px] font-black leading-[0.9] tracking-tighter mb-10">
              BINYAN <span className="text-gray-300 italic font-light">EITAN</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto font-light leading-relaxed mb-12">
              Crafting architectural landmarks with precision and uncompromising standards. 
              The pinnacle of luxury construction in Israel.
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <a href="#projects" className="bg-black text-white px-12 py-5 text-xs font-bold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-2xl">
                Explore Portfolio
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Portfolio - Large Scale */}
      <section id="projects" className="py-32 bg-[#fcfcfc]">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <h2 className="text-5xl font-black tracking-tighter italic">Featured<br/><span className="text-amber-600 not-italic">Works</span></h2>
            <p className="max-w-xs text-gray-400 text-sm font-light">Each project is a testament to our commitment to excellence and engineering precision.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {projects.map((project, index) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className="group relative h-[70vh] cursor-none"
              >
                <div className="absolute inset-0 overflow-hidden rounded-sm">
                  <Image
                    src={encodeURI(project.image)}
                    alt={project.title}
                    fill
                    className="object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500"></div>
                </div>
                
                <div className="absolute top-10 right-10">
                  <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {project.tag}
                  </span>
                </div>

                <div className="absolute bottom-12 left-12">
                  <h3 className="text-4xl font-bold text-white mb-4 tracking-tighter">{project.title}</h3>
                  <div className="w-0 group-hover:w-24 h-[2px] bg-amber-500 transition-all duration-700"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section - "The Inquiry" */}
      <section id="contact" className="py-32 px-6 bg-black text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            <div>
              <h2 className="text-6xl font-black tracking-tighter mb-8">START YOUR<br/><span className="text-amber-600">JOURNEY</span></h2>
              <p className="text-gray-400 font-light mb-12">Discuss your upcoming project with our expert team.</p>
              
              <div className="space-y-8">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 block mb-2">Office</span>
                  <p className="text-xl">Jerusalem, Israel</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 block mb-2">Direct Line</span>
                  <a href="tel:0585008447" className="text-xl hover:text-amber-500">058.500.8447</a>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 block mb-2">Email</span>
                  <a href="mailto:office@binyaneitan.com" className="text-xl hover:text-amber-500">office@binyaneitan.com</a>
                </div>
              </div>
            </div>

            {/* The Professional Form */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-[#111] p-12 border border-white/5"
            >
              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <input type="text" placeholder="FULL NAME" className="bg-transparent border-b border-white/20 py-4 focus:border-amber-600 outline-none text-xs tracking-widest w-full" />
                  <input type="tel" placeholder="PHONE NUMBER" className="bg-transparent border-b border-white/20 py-4 focus:border-amber-600 outline-none text-xs tracking-widest w-full" />
                </div>
                <input type="email" placeholder="EMAIL ADDRESS" className="bg-transparent border-b border-white/20 py-4 focus:border-amber-600 outline-none text-xs tracking-widest w-full" />
                <textarea placeholder="PROJECT DETAILS" rows={4} className="bg-transparent border-b border-white/20 py-4 focus:border-amber-600 outline-none text-xs tracking-widest w-full"></textarea>
                <button className="w-full bg-white text-black py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-amber-600 hover:text-white transition-all">
                  Send Inquiry
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer - Final Polish */}
      <footer className="py-12 px-6 border-t border-gray-100 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="relative w-32 h-10 grayscale opacity-50">
            <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
            © {new Date().getFullYear()} Binyan Eitan. Jerusalem Luxury Construction.
          </p>
          <div className="flex gap-6">
            <a href="https://wa.me/972585008447" className="text-[10px] font-bold uppercase tracking-widest hover:text-amber-600 transition-all">WhatsApp</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
