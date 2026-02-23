"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   נתונים - סיפור הפרויקט
   ───────────────────────────────────────────── */
const PROJECTS = [
  { 
    id: "beit-shemesh",
    title: "אחוזת נחל לכיש", 
    location: "בית שמש",
    category: "High-End Engineering",
    mainImage: "/luxury-interior-finish-transformation.jpg", 
    description: "בנייה מאפס ושיפוץ פרימיום המשלב הנדסת תשתיות מתקדמת עם סטנדרט גמר בינלאומי. הפרויקט דרש פתרונות איטום מורכבים וביצוע מערכות חימום וחשמל בסינרגיה מלאה.",
    gallery: [
      { url: "/luxury-electrical-infrastructure-precision.jpg", label: "תכנון וביצוע תשתיות חשמל" },
      { url: "/advanced-underfloor-heating-israel.jpg", label: "מערכת חימום תת-רצפתי" },
      { url: "/professional-airless-painting-standards.jpg", label: "גמר צבע בטכנולוגיית Airless" },
      { url: "/premium-marble-bathroom-detailing.jpg", label: "עבודות שיש וחיבורי גידים" },
      { url: "/expert-jerusalem-stone-facade-work.jpg", label: "חיפוי אבן ירושלמית" }
    ]
  }
];

export default function HebrewPage() {
  const [activeProject, setActiveProject] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-[#FAF9F6] min-h-screen font-sans text-[#1a1a1a] selection:bg-[#c5a35d] selection:text-white" dir="rtl">
      
      {/* --- ניווט יוקרתי --- */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${scrolled ? "bg-white/90 backdrop-blur-md py-4 shadow-sm" : "bg-transparent py-8"}`}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black flex items-center justify-center rounded-sm">
              <span className="text-white font-playfair text-xl">B</span>
            </div>
            <div className="flex flex-col">
              <span className="font-playfair text-xl tracking-tighter leading-none">BINYAN EITAN</span>
              <span className="text-[8px] tracking-[0.3em] uppercase text-[#c5a35d] font-bold mt-1">Engineering Excellence</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[10px] font-bold tracking-[0.2em] uppercase">
            <a href="#projects" className="hover:text-[#c5a35d] transition-colors">פרויקטים</a>
            <a href="#about" className="hover:text-[#c5a35d] transition-colors">הסטנדרט</a>
            <a href="#contact" className="hover:text-[#c5a35d] transition-colors">צור קשר</a>
            <a href="/" className="border border-black/10 px-4 py-1.5 rounded-full hover:bg-black hover:text-white transition-all">EN</a>
          </div>
        </div>
      </nav>

      {/* --- Hero Section: הוכחת סמכות --- */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 grid md:grid-cols-12 gap-4 items-center">
          <div className="col-span-12 md:col-span-7 z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
              <span className="text-[#c5a35d] text-xs font-bold tracking-[0.4em] uppercase mb-8 block">Since 1999</span>
              <h1 className="font-playfair text-6xl md:text-[120px] leading-[0.9] tracking-tighter mb-10">
                בונים <br /> <span className="italic font-light">מורשת.</span>
              </h1>
              <div className="h-[1px] w-24 bg-[#c5a35d] mb-10"></div>
              <p className="text-xl md:text-2xl font-light text-gray-500 max-w-xl leading-relaxed">
                סטנדרט הנדסי בינלאומי בביצוע פרויקטים מורכבים, שיפוצי יוקרה ועבודות לשימור מורשת.
              </p>
            </motion.div>
          </div>
          <div className="col-span-12 md:col-span-5 relative">
             <motion.div 
               initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.5 }}
               className="relative aspect-[4/5] md:h-[80vh] w-full"
             >
                <Image src="/luxury-interior-finish-transformation.jpg" alt="Binyan Eitan" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-1000" />
                <div className="absolute -bottom-10 -right-10 hidden md:block w-64 h-64 border-[20px] border-[#FAF9F6] z-20"></div>
             </motion.div>
          </div>
        </div>
      </section>

      {/* --- סקשן הנדסה: מה שמפריד אותך מהשאר --- */}
      <section id="about" className="py-40 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="grid md:grid-cols-3 gap-24">
            <div className="space-y-6">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#c5a35d] uppercase">01. Precision</span>
              <h3 className="font-playfair text-3xl italic">דיוק הנדסי נסתר</h3>
              <p className="text-gray-500 leading-relaxed font-light">האיכות שלנו מתחילה במקום בו העין אינה רואה – בתשתיות, באיטום ובדיוק המבני.</p>
            </div>
            <div className="space-y-6">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#c5a35d] uppercase">02. Technology</span>
              <h3 className="font-playfair text-3xl italic">טכנולוגיית ביצוע</h3>
              <p className="text-gray-500 leading-relaxed font-light">שימוש במכשור לייזר מתקדם וצביעת Airless להשגת רמת גימור של מוזיאון.</p>
            </div>
            <div className="space-y-6">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#c5a35d] uppercase">03. Heritage</span>
              <h3 className="font-playfair text-3xl italic">שימור ומורשת</h3>
              <p className="text-gray-500 leading-relaxed font-light">ניסיון עשיר מול הקרן למורשת הכותל בביצוע פרויקטים רגישים ובעלי חשיבות לאומית.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- פורטפוליו: גריד אדריכלי --- */}
      <section id="projects" className="py-40">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16">
          <div className="flex flex-col md:flex-row justify-between items-end mb-32 gap-8">
            <div className="max-w-2xl">
              <span className="text-[#c5a35d] text-[10px] tracking-[0.5em] font-bold uppercase mb-6 block">Featured Work</span>
              <h2 className="font-playfair text-5xl md:text-8xl leading-none">פרויקטים <br /> נבחרים.</h2>
            </div>
            <p className="text-gray-400 font-light italic text-xl">Building excellence since 1999</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-20">
            {PROJECTS.map((project) => (
              <div key={project.id} className="col-span-12 md:col-span-8 group cursor-pointer" onClick={() => setActiveProject(project)}>
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-200">
                  <Image src={project.mainImage} alt={project.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all"></div>
                </div>
                <div className="mt-8 flex justify-between items-start">
                  <div>
                    <h4 className="font-playfair text-4xl mb-2">{project.title}</h4>
                    <span className="text-gray-400 text-sm tracking-widest uppercase">{project.location} • {project.category}</span>
                  </div>
                  <div className="w-12 h-12 border border-black/10 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                    <span className="text-xl">←</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- צור קשר: סיומת סולידית --- */}
      <section id="contact" className="py-40 bg-[#1a1a1a] text-white">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 grid md:grid-cols-2 gap-32">
          <div>
            <h2 className="font-playfair text-6xl md:text-9xl mb-12 leading-none tracking-tighter">בואו נבנה <br /> <span className="italic text-[#c5a35d]">עתיד.</span></h2>
            <div className="space-y-4 opacity-60 text-xl font-light">
              <p>058-500-8447</p>
              <p>OFFICE@BINYANEITAN.COM</p>
            </div>
          </div>
          <div className="bg-[#242424] p-12 md:p-20 shadow-2xl">
            <form className="space-y-12">
              <div className="relative">
                <input type="text" placeholder="שם מלא" className="w-full bg-transparent border-b border-white/10 py-4 focus:border-[#c5a35d] outline-none transition-all text-right" />
              </div>
              <div className="relative">
                <input type="tel" placeholder="טלפון" className="w-full bg-transparent border-b border-white/10 py-4 focus:border-[#c5a35d] outline-none transition-all text-right" />
              </div>
              <textarea placeholder="ספרו לנו על הפרויקט שלכם" rows={4} className="w-full bg-transparent border-b border-white/10 py-4 focus:border-[#c5a35d] outline-none transition-all text-right resize-none"></textarea>
              <button className="w-full bg-white text-black py-6 font-bold tracking-[0.3em] uppercase hover:bg-[#c5a35d] hover:text-white transition-all">שלח פנייה הנדסית</button>
            </form>
          </div>
        </div>
      </section>

      {/* --- Modal הפרויקט: חוויית פרימיום --- */}
      <AnimatePresence>
        {activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md p-8 flex justify-between items-center z-50 border-b border-black/5">
               <button onClick={() => setActiveProject(null)} className="text-[10px] font-bold tracking-widest uppercase border-b border-black pb-1">חזרה [X]</button>
               <span className="font-playfair text-xl">{activeProject.title}</span>
            </div>
            <div className="max-w-[1200px] mx-auto px-6 py-24 text-right">
              <h2 className="font-playfair text-6xl md:text-[120px] mb-20 leading-[0.9]">{activeProject.title}</h2>
              <div className="grid md:grid-cols-2 gap-20 mb-32 items-center">
                <p className="text-2xl font-light text-gray-500 leading-relaxed italic border-r-4 border-[#c5a35d] pr-10">{activeProject.description}</p>
                <div className="relative aspect-square bg-gray-100">
                  <Image src={activeProject.mainImage} alt="Main" fill className="object-cover" />
                </div>
              </div>
              <div className="space-y-40">
                {activeProject.gallery.map((img: any, i: number) => (
                  <div key={i} className={`relative flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-10 items-center`}>
                    <div className="relative w-full md:w-2/3 aspect-[16/9] shadow-2xl overflow-hidden">
                      <Image src={img.url} alt={img.label} fill className="object-cover" />
                    </div>
                    <div className="w-full md:w-1/3">
                      <span className="text-[#c5a35d] font-bold text-[10px] tracking-widest uppercase mb-4 block">Detail {i+1}</span>
                      <h4 className="font-playfair text-3xl mb-4 italic">{img.label}</h4>
                      <p className="text-gray-400 font-light">ביצוע הנדסי מוקפד המבטיח עמידות לשנים קדימה.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
