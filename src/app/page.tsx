"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  const projects = [
    { id: 1, title: "Ramat Eshkol", category: "Penthouse Residence", img: "/ramat-eshkol.jpg", size: "md:col-span-2 h-[80vh]" },
    { id: 2, title: "Bayit Vegan", category: "Floor Extension", img: "/bayit-vegan.jpg", size: "md:col-span-1 h-[60vh]" },
    { id: 3, title: "Amshinov", category: "Modern Landmark", img: "/amshinov.jpg", size: "md:col-span-1 h-[60vh] md:-mt-32" },
    { id: 4, title: "Ohel Avshalom", category: "Engineering Masterpiece", img: "/ohel-avshalom.jpg", size: "md:col-span-2 h-[75vh]" },
  ];

  return (
    <main className="bg-[#fdfdfd] text-[#1a1a1a] min-h-screen selection:bg-amber-100" dir="ltr">
      
      {/* Ultra-Slim Navigation */}
      <nav className="fixed top-0 w-full px-10 py-8 flex justify-between items-center z-50 mix-blend-difference text-white">
        <div className="relative w-44 h-12">
          <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain brightness-0 invert" priority />
        </div>
        <div className="hidden md:flex gap-16 text-[10px] font-bold tracking-[0.4em] uppercase">
          <a href="#projects" className="hover:opacity-50 transition-all">Portfolio</a>
          <a href="#contact" className="hover:opacity-50 transition-all">Inquiry</a>
        </div>
      </nav>

      {/* Hero: The Bold Statement */}
      <section className="relative h-screen flex flex-col justify-center px-10 overflow-hidden bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[1400px] mx-auto w-full"
        >
          <span className="text-amber-700 font-bold tracking-[0.5em] text-[10px] mb-6 block uppercase">Jerusalem / Luxury Construction</span>
          <h1 className="text-[15vw] md:text-[11vw] font-serif leading-[0.8] tracking-tighter mb-16">
            Binyan <br /> <span className="italic pl-[8vw] text-gray-200">Eitan</span>
          </h1>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-t border-black/5 pt-10 gap-8">
            <p className="max-w-md text-[13px] leading-relaxed text-gray-500 font-light lowercase first-letter:uppercase tracking-wide">
              We specialize in the execution of complex architectural visions. 
              From structural precision to the finest interior finishes, we build the icons of tomorrow.
            </p>
            <a href="#projects" className="group flex items-center gap-4 text-[10px] font-bold tracking-[0.3em] uppercase">
              Explore Works 
              <span className="w-12 h-[1px] bg-black group-hover:w-20 transition-all duration-500"></span>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Philosophy: The Black Canvas */}
      <section className="py-40 px-10 bg-black text-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <h2 className="text-4xl md:text-6xl font-serif italic mb-16 leading-tight">
              "Every stone laid is a <br /> commitment to excellence."
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
              <p className="text-gray-400 text-lg leading-relaxed font-light">
                Binyan Eitan operates at the intersection of engineering mastery and artistic execution. Our Jerusalem-based projects set a new benchmark for high-end residential construction.
              </p>
              <div className="border border-white/10 p-10 space-y-6">
                <div className="text-3xl font-serif italic text-amber-500">Precision.</div>
                <div className="text-3xl font-serif italic text-amber-500">Reliability.</div>
                <div className="text-3xl font-serif italic text-amber-500">Vision.</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Portfolio: Asymmetric Grid */}
      <section id="projects" className="py-40 px-6 md:px-16 bg-[#fafafa]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-32 max-w-[1600px] mx-auto">
          {projects.map((p, i) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`${p.size} relative group overflow-hidden cursor-pointer`}
            >
              <Image 
                src={p.img} 
                alt={p.title} 
                fill 
                className="object-cover transition-transform duration-[2.5s] group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-700"></div>
              <div className="absolute bottom-12 left-12 text-white transform group-hover:-translate-y-4 transition-transform duration-500">
                <span className="text-[9px] tracking-[0.4em] font-bold mb-3 block uppercase text-amber-400">{p.category}</span>
                <h3 className="text-5xl font-serif italic tracking-tighter">{p.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Inquiry: The High-End Form */}
      <section id="contact" className="py-40 px-10 bg-white">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32">
          <div className="flex flex-col justify-between">
            <h2 className="text-[9vw] lg:text-[7vw] font-serif leading-[0.85] tracking-tighter mb-12">
              Start Your <br /> <span className="italic text-gray-200">Legacy</span>
            </h2>
            <div className="space-y-12">
              <div>
                <span className="text-[10px] text-gray-400 tracking-[0.3em] uppercase block mb-4">Direct Communication</span>
                <a href="tel:0585008447" className="text-3xl font-light hover:text-amber-700 transition-colors tracking-tight">058.500.8447</a>
                <p className="text-gray-400 mt-2">Office: 02.500.0447</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 tracking-[0.3em] uppercase block mb-4">Digital Inquiry</span>
                <a href="mailto:office@binyaneitan.com" className="text-2xl font-light hover:text-amber-700 transition-colors underline decoration-1 underline-offset-8">office@binyaneitan.com</a>
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-[#111] p-16 text-white shadow-2xl"
          >
            <h4 className="text-xs font-bold tracking-[0.4em] mb-12 uppercase">Inquiry Form</h4>
            <form className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <input type="text" placeholder="NAME" className="bg-transparent border-b border-white/20 py-4 outline-none focus:border-amber-600 transition-colors text-[10px] tracking-widest uppercase w-full" />
                <input type="tel" placeholder="PHONE" className="bg-transparent border-b border-white/20 py-4 outline-none focus:border-amber-600 transition-colors text-[10px] tracking-widest uppercase w-full" />
              </div>
              <select className="w-full bg-transparent border-b border-white/20 py-4 outline-none focus:border-amber-600 text-[10px] font-bold tracking-widest uppercase cursor-pointer">
                <option className="text-black">New Luxury Construction</option>
                <option className="text-black">Complex Extension</option>
                <option className="text-black">Engineering Consult</option>
              </select>
              <textarea placeholder="MESSAGE" rows={4} className="w-full bg-transparent border-b border-white/20 py-4 outline-none focus:border-amber-600 transition-colors text-[10px] tracking-widest uppercase"></textarea>
              <button className="w-full bg-white text-black py-6 text-[11px] font-bold tracking-[0.5em] uppercase hover:bg-amber-600 hover:text-white transition-all duration-500">
                Submit Request
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="py-20 px-10 border-t border-black/5 bg-white">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">© 2026 Binyan Eitan / Precision in Jerusalem</p>
          <div className="relative w-40 h-10 grayscale opacity-20">
             <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain" />
          </div>
          <div className="flex gap-10">
            <a href="https://wa.me/972585008447" className="text-[10px] font-bold tracking-[0.3em] uppercase hover:text-amber-600">WhatsApp</a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp - Subtle Version */}
      <a
        href="https://wa.me/972585008447" 
        target="_blank"
        className="fixed bottom-10 right-10 bg-[#25D366] text-white p-5 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"></path></svg>
      </a>
    </main>
  );
}
