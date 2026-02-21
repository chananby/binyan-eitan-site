"use client";

import React from 'react';

export default function Home() {
  const projects = [
    {
      title: "Ramat Eshkol Luxury Penthouse",
      description: "Complete structural renovation and luxury interior finish.",
      image: "/ramat-eshkol.jpg"
    },
    {
      title: "Bayit VeGan Residential Expansion",
      description: "Adding luxury living spaces to an existing residential landmark.",
      image: "/bayit-vegan.jpg"
    },
    {
      title: "Amshinov Jerusalem Landmark",
      description: "Preservation and structural revitalization of iconic architecture.",
      image: "/amshinov.jpg"
    },
    {
      title: "Ohel Avshalom Structural Revitalization",
      description: "Reinforcement and modernization of historic foundations.",
      image: "/ohel-avshalom.jpg"
    }
  ];

  return (
    <main style={{ backgroundColor: "#ffffff", color: "#0f1f3d", fontFamily: 'serif' }} className="min-h-screen relative">
      
      {/* Floating WhatsApp Button (Main Work Mobile) */}
      <a 
        href="https://wa.me/972585008447?text=Hello, I'm interested in a project with Binyan Eitan."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
        title="Chat on WhatsApp"
      >
        <svg width="30" height="30" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412s-1.239 6.164-3.485 8.412c-2.246 2.248-5.23 3.488-8.414 3.488-2.015 0-3.993-.511-5.741-1.482l-6.75 1.77zM6.54 17.527l.393.232c1.438.853 3.1 1.304 4.807 1.305 5.077 0 9.208-4.131 9.21-9.21.001-2.462-.958-4.776-2.702-6.521-1.743-1.745-4.059-2.706-6.521-2.706-5.078 0-9.21 4.132-9.212 9.211 0 1.761.503 3.481 1.455 4.977l.254.398-1.07 3.906 4.028-1.057z"/>
        </svg>
      </a>

      {/* Header / Navbar */}
      <nav className="p-6 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-white z-50">
        <div className="text-2xl font-bold tracking-tighter">BINYAN <span style={{ color: "#b8955a" }}>EITAN</span></div>
        <div className="hidden md:flex gap-8 text-sm uppercase tracking-widest font-sans">
          <a href="#about" className="hover:text-[#b8955a] transition-colors">About</a>
          <a href="#projects" className="hover:text-[#b8955a] transition-colors">Projects</a>
          <a href="#contact" className="hover:text-[#b8955a] transition-colors">Contact</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-6 text-center bg-[#0f1f3d] text-white">
        <h1 className="text-5xl md:text-7xl font-light mb-6 tracking-tight">
          Solid Foundations.<br />
          <span style={{ color: "#b8955a" }}>Uncompromised Integrity.</span>
        </h1>
        <p className="text-xl max-w-2xl mx-auto opacity-80 font-sans italic">
          Crafting Jerusalems finest residences with a 100% conflict-free record for over 25 years.
        </p>
      </section>

      {/* Projects Gallery */}
      <section id="projects" className="py-20 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl text-center mb-16 italic font-light tracking-widest uppercase">Featured Projects</h2>
          <div className="grid md:grid-cols-2 gap-10">
            {projects.map((project, index) => (
              <div key={index} className="group bg-white overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all">
                <div className="aspect-video relative overflow-hidden bg-gray-200">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/800x450?text=Project+Photo"; }}
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold mb-2 tracking-tight">{project.title}</h3>
                  <p className="opacity-70 font-sans text-sm">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-4xl mb-4 font-light italic">Connect With Us</h2>
        <p className="mb-12 opacity-70 uppercase tracking-widest text-sm">Choose your preferred point of contact</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Office */}
          <div className="border border-gray-200 p-8 hover:border-[#b8955a] transition-colors">
            <h3 className="text-[#b8955a] uppercase text-xs tracking-widest mb-4">The Office</h3>
            <p className="mb-6 font-bold">02-500-0447</p>
            <a href="tel:025000447" className="text-xs uppercase border-b border-black pb-1 hover:opacity-50">Call Now</a>
          </div>

          {/* Work Mobile */}
          <div className="border border-[#0f1f3d] bg-[#0f1f3d] text-white p-8 scale-105 shadow-xl">
            <h3 className="text-[#b8955a] uppercase text-xs tracking-widest mb-4">Direct Inquiries</h3>
            <p className="mb-6 font-bold text-xl">058-500-8447</p>
            <a href="https://wa.me/972585008447" className="inline-block bg-[#b8955a] text-white px-6 py-2 text-[10px] uppercase tracking-tighter">WhatsApp Us</a>
          </div>

          {/* Moti */}
          <div className="border border-gray-200 p-8 hover:border-[#b8955a] transition-colors">
            <h3 className="text-[#b8955a] uppercase text-xs tracking-widest mb-4">Moti (Owner)</h3>
            <p className="mb-6 font-bold">054-200-0456</p>
            <a href="https://wa.me/972542000456" className="text-xs uppercase border-b border-black pb-1 hover:opacity-50">Private Chat</a>
          </div>
        </div>
      </section>

      <footer className="py-10 border-t border-gray-100 text-center opacity-50 text-xs tracking-widest uppercase">
        © 2026 Binyan Eitan. Jerusalem, Israel.
      </footer>
    </main>
  );
}
