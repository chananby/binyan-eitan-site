"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  const projects = [
    { id: 1, title: "Penthouse, Ramat Eskkol", image: "/פנטהאוז רמת אשכול ירושלים/ramat-eshkol.jpg.jpg" },
    { id: 2, title: "Floor Extension, Bayit Vegan", image: "/הרחבת קומה - בית וגן ירושלים/bayit-vegan.jpg.jpg" },
    { id: 3, title: "Amshinov Project", image: "/אמשינוב - ירושלים/amshinov.jpg.jpg" },
    { id: 4, title: "Concrete Sawing & Extension, Ohel Avshalom", image: "/אוהל אבשלום - ניסור והרחבה - ירושלים/ohel-avshalom.jpg.jpg" },
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  return (
    <main className="min-h-screen bg-white text-slate-800 font-sans" dir="ltr">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full px-6 py-4 flex justify-between items-center z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
        <div className="relative w-32 h-10 md:w-44 md:h-14">
          <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain" priority />
        </div>
        <div className="hidden md:flex gap-10 text-sm font-bold tracking-widest uppercase text-slate-600">
          <a href="#home" className="hover:text-amber-600 transition-colors">Home</a>
          <a href="#projects" className="hover:text-amber-600 transition-colors">Portfolio</a>
          <a href="#contact" className="hover:text-amber-600 transition-colors">Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-48 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight text-slate-900 tracking-tighter">
            BUILDING <span className="text-amber-600">EXCELLENCE</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
            Luxury construction and complex engineering in the heart of Jerusalem. 
            We turn architectural visions into solid reality.
          </p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <a href="#projects" className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold hover:bg-amber-600 transition-all shadow-xl">
              View Our Work
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Projects Grid */}
      <section id="projects" className="max-w-7xl mx-auto px-6 py-24">
        <motion.h2 
          {...fadeInUp}
          className="text-4xl font-black mb-16 text-center text-slate-900 uppercase tracking-widest"
        >
          Featured <span className="text-amber-600 underline decoration-4 underline-offset-8">Projects</span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {projects.map((project, index) => (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.8 }}
              className="group relative h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-slate-200"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500"></div>
              
              <div className="absolute bottom-0 left-0 p-10">
                <p className="text-amber-500 font-bold uppercase tracking-widest mb-2 text-sm">Jerusalem, IL</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{project.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats/Trust Section */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
           {[
             { title: "Uncompromising Quality", desc: "Premium materials and elite architectural finishes." },
             { title: "Precision Engineering", desc: "Complex extensions and sawing with laser accuracy." },
             { title: "Full Transparency", desc: "Peace of mind from initial planning to handover." }
           ].map((item, i) => (
             <motion.div 
               key={i}
               whileHover={{ y: -10 }}
               className="border-l-2 border-amber-600 pl-8"
             >
               <h4 className="text-2xl font-bold mb-4">{item.title}</h4>
               <p className="text-slate-400 leading-relaxed">{item.desc}</p>
             </motion.div>
           ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
             <div className="relative w-40 h-16 mb-6">
                <Image src="/logo.jpg" alt="Binyan Eitan" fill className="object-contain" />
             </div>
             <p className="text-slate-500 leading-relaxed">
               Building the future of Jerusalem with integrity, innovation, and unmatched craftsmanship.
             </p>
          </div>
          
          <div className="space-y-4">
             <h4 className="text-lg font-black uppercase tracking-widest text-slate-900">Contact Details</h4>
             <div className="text-slate-600 space-y-2">
                <p className="flex items-center gap-2">📍 Jerusalem, Israel</p>
                <p className="flex items-center gap-2">📱 <a href="tel:0585008447" className="hover:text-amber-600 font-bold">058-500-8447</a></p>
                <p className="flex items-center gap-2">📞 <a href="tel:025000447" className="hover:text-amber-600">02-500-0447</a></p>
                <p className="flex items-center gap-2">✉️ <a href="mailto:office@binyaneitan.com" className="hover:text-amber-600">office@binyaneitan.com</a></p>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-lg font-black uppercase tracking-widest text-slate-900">Follow Our Progress</h4>
             <div className="flex gap-4">
                <a href="https://wa.me/972585008447" className="bg-green-500 text-white px-6 py-2 rounded-full font-bold hover:bg-green-600 transition-all text-sm">WhatsApp Chat</a>
             </div>
          </div>
        </div>
        <div className="text-center mt-20 text-slate-400 text-xs tracking-widest uppercase">
          © {new Date().getFullYear()} Binyan Eitan | Luxury Construction Jerusalem
        </div>
      </footer>

      {/* Floating Action Button */}
      <motion.a
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        href="https://wa.me/972585008447" 
        className="fixed bottom-10 right-10 bg-green-500 text-white p-5 rounded-full shadow-2xl z-50 flex items-center justify-center hover:bg-green-600"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"></path></svg>
      </motion.a>
    </main>
  );
}
