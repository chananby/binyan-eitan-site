"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  const projects = [
    { id: 1, title: "Ramat Eshkol", category: "Penthouse Residence", img: "/p1.jpg", size: "col-span-2 h-[80vh]" },
    { id: 2, title: "Bayit Vegan", category: "Floor Extension", img: "/p2.jpg", size: "col-span-1 h-[60vh]" },
    { id: 3, title: "Amshinov", category: "Modern Landmark", img: "/p3.jpg", size: "col-span-1 h-[60vh] md:-mt-20" },
    { id: 4, title: "Ohel Avshalom", category: "Engineering Masterpiece", img: "/p4.jpg", size: "col-span-2 h-[70vh]" },
  ];

  return (
    <main ref={containerRef} className="bg-[#f8f7f4] text-[#1a1a1a] min-h-screen selection:bg-amber-100 uppercase tracking-tighter">
      
      {/* Cinematic Navigation */}
      <nav className="fixed top-0 w-full px-12 py-8 flex justify-between items-end z-50 mix-blend-difference text-white">
        <div className="relative w-40 h-10">
           <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain brightness-0 invert" />
        </div>
        <div className="hidden md:flex gap-16 text-[10px] font-bold tracking-[0.3em]">
          <a href="#projects" className="hover:opacity-50 transition-opacity">Portfolio</a>
          <a href="#about" className="hover:opacity-50 transition-opacity">Philosophy</a>
          <a href="#contact" className="hover:opacity-50 transition-opacity">Inquiry</a>
        </div>
      </nav>

      {/* Hero: The Statement */}
      <section className="relative h-screen flex flex-col justify-center px-12 overflow-hidden bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-amber-700 font-bold tracking-[0.5em] text-[10px] mb-8 block">Jerusalem / Construction / Art</span>
          <h1 className="text-[14vw] md:text-[11vw] font-serif leading-[0.8] mb-12">
            Binyan <br /> <span className="italic pl-[10vw]">Eitan</span>
          </h1>
          <div className="flex justify-between items-end border-t border-black/10 pt-8">
            <p className="max-w-md text-[12px] leading-relaxed tracking-normal lowercase first-letter:uppercase text-gray-500 font-light">
              Redefining the Jerusalem skyline through precision engineering and avant-garde architectural execution. 
              We don't build structures; we curate legacies.
            </p>
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold">Scroll to Explore</p>
              <div className="h-20 w-[1px] bg-black mt-4 ml-auto"></div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Philosophy Section */}
      <section id="about" className="py-40 px-12 bg-black text-white">
        <div className="max-w-4xl">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-4xl md:text-6xl font-serif italic mb-12"
          >
            "Precision is the only <br /> standard we recognize."
          </motion.h2>
          <p className="text-gray-400 text-lg leading-relaxed lowercase tracking-normal max-w-xl">
            From the core of Amshinov to the heights of Ramat Eshkol, our methodology integrates traditional craftsmanship with modern technology.
          </p>
        </div>
      </section>

      {/* Portfolio: Editorial Grid */}
      <section id="projects" className="py-40 px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
          {projects.map((p, i) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className={`${p.size} relative group overflow-hidden`}
            >
              <Image 
                src={p.img} 
                alt={p.title} 
                fill 
                className="object-cover transition-transform duration-[2s] group-hover:scale-110 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-700"></div>
              <div className="absolute bottom-10 left-10 text-white">
                <span className="text-[10px] tracking-[0.3em] font-bold mb-2 block">{p.category}</span>
                <h3 className="text-4xl font-serif italic tracking-tighter">{p.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Inquiry: High-End Contact */}
      <section id="contact" className="py-40 px-12 bg-[#111] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32">
          <div>
            <h2 className="text-[8vw] font-serif leading-none mb-12">Leave <br /> Your <br /> Mark</h2>
            <div className="space-y-12 border-t border-white/10 pt-12">
              <div>
                <span className="text-[10px] text-gray-500 tracking-widest block mb-4">Direct</span>
                <a href="tel:0585008447" className="text-2xl font-light hover:text-amber-500 transition-colors">058.500.8447</a>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 tracking-widest block mb-4">Digital</span>
                <a href="mailto:office@binyaneitan.com" className="text-2xl font-light hover:text-amber-500 transition-colors">office@binyaneitan.com</a>
              </div>
            </div>
          </div>

          <div className="bg-white p-16 text-black">
            <h4 className="text-sm font-bold tracking-[0.3em] mb-12 uppercase">Project Inquiry</h4>
            <form className="space-y-10">
              <input type="text" placeholder="Your Name" className="w-full border-b border-black/10 py-4 outline-none focus:border-amber-600 transition-colors text-sm uppercase tracking-widest" />
              <input type="tel" placeholder="Phone Number" className="w-full border-b border-black/10 py-4 outline-none focus:border-amber-600 transition-colors text-sm uppercase tracking-widest" />
              <select className="w-full border-b border-black/10 py-4 outline-none focus:border-amber-600 transition-colors text-[10px] uppercase font-bold tracking-widest bg-transparent">
                <option>New Construction</option>
                <option>Extension / Sawing</option>
                <option>Interior Renovation</option>
              </select>
              <textarea placeholder="Message" rows={4} className="w-full border-b border-black/10 py-4 outline-none focus:border-amber-600 transition-colors text-sm uppercase tracking-widest"></textarea>
              <button className="w-full bg-black text-white py-6 text-[10px] font-bold tracking-[0.4em] uppercase hover:bg-amber-700 transition-all">Submit Inquiry</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-12 flex flex-col md:flex-row justify-between items-center gap-12 border-t border-black/5 bg-white">
        <div className="text-[10px] font-bold tracking-[0.3em] text-gray-400">© 2026 Binyan Eitan / All Rights Reserved</div>
        <div className="relative w-32 h-8 grayscale opacity-30">
           <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain" />
        </div>
        <a href="https://wa.me/972585008447" className="text-[10px] font-bold tracking-[0.3em] hover:text-amber-600">WhatsApp / Messenger</a>
      </footer>
    </main>
  );
}
