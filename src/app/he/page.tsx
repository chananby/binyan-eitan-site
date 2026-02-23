"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   נתוני הפרויקטים - "אחוזת נחל לכיש" עם 15 התמונות
   ───────────────────────────────────────────── */
const PROJECTS = [
  { 
    title: "אחוזת נחל לכיש - בית שמש", 
    subtitle: "תכנון הנדסי מורכב וגמר עילי", 
    status: "בביצוע",
    mainImage: "/luxury-interior-finish-transformation.jpg", 
    category: "בנייה ושיפוצי יוקרה",
    description: "פרויקט מגורים רחב היקף הכולל הטמעת מערכות תשתית מתקדמות, חימום תת-רצפתי, ועבודות גמר בסטנדרט הגבוה ביותר.",
    gallery: [
      { url: "/luxury-electrical-infrastructure-precision.jpg", label: "דיוק במערכות חשמל ותקשורת" },
      { url: "/advanced-underfloor-heating-israel.jpg", label: "פריסת חימום תת-רצפתי מורכבת" },
      { url: "/complex-roof-mechanical-systems.jpg", label: "תשתיות גג וניקוז מתקדמות" },
      { url: "/professional-airless-painting-standards.jpg", label: "צביעת פנים בטכנולוגיית Airless" },
      { url: "/premium-marble-bathroom-detailing.jpg", label: "עבודות שיש וחיבורי גידים (Bookmatch)" },
      { url: "/expert-jerusalem-stone-facade-work.jpg", label: "חיפוי אבן ירושלמית ועבודה בגובה" },
      { url: "/structural-foundation-reinforcement.jpg", label: "חיזוק מבני ויציקות בטון" },
      { url: "/precision-tiling-with-laser-alignment.jpg", label: "ריצוף יוקרה ביישור לייזר" },
      { url: "/structural-remodeling-safety-standards.jpg", label: "הריסה ושינוי מבני עם שמירה על בטיחות" },
      { url: "/luxury-interior-finish-transformation.jpg", label: "גמר צבע ועיצוב חלל הפנים" },
      { url: "/interior-wall-framing-systems.jpg", label: "בידוד ותשתית קירות גבס" },
      { url: "/jerusalem-stone-restoration-scaffolding.jpg", label: "שיקום וניקוי חזיתות אבן" },
      { url: "/advanced-bathroom-waterproofing-detail.jpg", label: "איטום יסודי למניעת כשלים עתידיים" },
      { url: "/traditional-terracotta-roofing-israel.jpg", label: "עבודות גגות ורעפים" },
      { url: "/luxury-apartment-renovation-view.jpg", label: "מבט פנורמי על הפרויקט המוגמר" }
    ]
  }
];

/* ─────────────────────────────────────────────
   ביקורות גוגל - הנוסח המקורי שלך
   ───────────────────────────────────────────── */
const REVIEWS = [
  {
    name: "M. Karouby (אדריכלות)",
    text: "אני אדריכלית במקצועי ועבדתי עם מוטי עבור פרויקטים מורכבים. מוטי נותן את הלב והנשמה לצד מקצועיות והבנה בכל התחומים. מוצא פתרון לבעיות טכניות מורכבות.",
    stars: 5
  },
  {
    name: "אברהם לבל",
    text: "דגש על הפרטים הקטנים, פינישים ברמה גבוהההההה. לא מתרגשים מבלטמים, אנשים שבאים לעבוד ולא עוזבים עד שהלקוח מרוצה.",
    stars: 5
  },
  {
    name: "משפחת מרמרוש",
    text: "מאוד התפעלנו מהמקצועיות, האיכות והעמידה בלוחות הזמנים. ממליץ בחום, שווה כל שקל. אדם שלוקח אחריות.",
    stars: 5
  }
];

/* ─────────────────────────────────────────────
   רכיב הניווט - RTL Fix
   ───────────────────────────────────────────── */
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md border-b border-black/5" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 h-24 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logo.jpg" alt="Binyan Eitan" width={45} height={45} className="rounded-sm" />
          <div className="flex flex-col text-right">
            <span className="font-playfair text-xl md:text-2xl tracking-tight leading-none">בנין איתן</span>
            <span className="text-[10px] tracking-[0.2em] uppercase mt-1 text-[#c5a35d] font-bold">הנדסה ושיפוצי יוקרה</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-12">
          <a href="#projects" className="text-[11px] uppercase tracking-widest font-bold hover:text-[#c5a35d] transition-colors">פרויקטים</a>
          <a href="#reviews" className="text-[11px] uppercase tracking-widest font-bold hover:text-[#c5a35d] transition-colors">ביקורות</a>
          <a href="#contact" className="text-[11px] uppercase tracking-widest font-bold hover:text-[#c5a35d] transition-colors">צור קשר</a>
          <a href="/" className="text-[10px] font-bold border border-black/10 px-3 py-1 rounded hover:bg-black hover:text-white transition-all">EN</a>
        </div>
        <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
          <div className={`w-6 h-0.5 bg-black mb-1.5 transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-6 h-0.5 bg-black transition-all ${isOpen ? '-rotate-45 -translate-y-0.5' : ''}`} />
        </button>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   רכיב הפורטפוליו - הלב של האתר
   ───────────────────────────────────────────── */
function Portfolio() {
  const [activeProject, setActiveProject] = useState<any>(null);

  useEffect(() => {
    if (activeProject) {
      window.history.pushState({ modal: true }, "");
      const handlePopState = () => setActiveProject(null);
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [activeProject]);

  return (
    <section id="projects" className="py-32 bg-[#fcfaf7]" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        <div className="mb-20 text-right">
          <span className="text-[#c5a35d] text-xs tracking-[0.4em] font-bold uppercase mb-4 block">PORTFOLIO</span>
          <h2 className="font-playfair text-4xl md:text-6xl text-[#1a1a1a]">פרויקטים נבחרים</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {PROJECTS.map((project, idx) => (
            <motion.div 
              key={idx} 
              whileHover={{ y: -10 }} 
              className="group cursor-pointer"
              onClick={() => setActiveProject(project)}
            >
              <div className="relative aspect-[16/10] overflow-hidden mb-8 shadow-lg">
                <Image src={project.mainImage} alt={project.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-1 text-[10px] tracking-widest uppercase font-bold text-black">{project.status}</div>
              </div>
              <div className="text-right">
                <span className="text-[#c5a35d] text-[10px] tracking-widest font-bold uppercase mb-2 block">{project.category}</span>
                <h3 className="font-playfair text-3xl mb-4">{project.title}</h3>
                <p className="text-gray-500 font-light leading-relaxed">{project.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeProject && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-white overflow-y-auto"
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-[510] border-b border-black/5 p-6 flex justify-between items-center">
              <button onClick={() => { setActiveProject(null); if(window.history.state?.modal) window.history.back(); }} className="text-[10px] font-bold tracking-widest uppercase border-b border-black pb-1">סגור [X]</button>
              <h3 className="font-playfair text-xl">{activeProject.title}</h3>
            </div>
            <div className="max-w-[1200px] mx-auto px-6 py-20 text-right">
              <h2 className="font-playfair text-5xl md:text-8xl mb-12">{activeProject.title}</h2>
              <p className="text-xl text-gray-500 font-light max-w-3xl mb-24 leading-relaxed">{activeProject.description}</p>
              <div className="space-y-32">
                {activeProject.gallery.map((item: any, i: number) => (
                  <div key={i} className="group">
                    <div className="relative aspect-[16/9] md:aspect-[21/9] bg-gray-100 overflow-hidden mb-8">
                      <Image src={item.url} alt={item.label} fill className="object-cover" />
                    </div>
                    <div className="border-r-4 border-[#c5a35d] pr-6">
                      <p className="text-xl font-medium text-gray-800">{item.label}</p>
                    </div>
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

/* ─────────────────────────────────────────────
   רכיב ביקורות - אותנטיות מהשטח
   ───────────────────────────────────────────── */
function Reviews() {
  return (
    <section id="reviews" className="py-32 bg-white" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        <div className="text-center mb-24">
          <span className="text-[#c5a35d] text-xs tracking-[0.4em] font-bold uppercase mb-4 block">TESTIMONIALS</span>
          <h2 className="font-playfair text-4xl md:text-6xl">מה הלקוחות אומרים</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {REVIEWS.map((review, i) => (
            <div key={i} className="bg-[#fcfaf7] p-10 relative shadow-sm border border-black/5">
              <div className="text-[#c5a35d] mb-6 flex gap-1">{"★".repeat(review.stars)}</div>
              <p className="text-lg font-light leading-relaxed mb-8 italic text-gray-700 text-right">"{review.text}"</p>
              <p className="font-bold tracking-widest text-[11px] uppercase text-right border-t border-black/10 pt-6">— {review.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   טופס יצירת קשר - תיקון RTL והנדסת אנוש
   ───────────────────────────────────────────── */
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
    <section id="contact" className="py-32 bg-[#1a1a1a] text-white" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 grid md:grid-cols-2 gap-24 items-center">
        <div className="text-right">
          <span className="text-[#c5a35d] text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block">CONTACT</span>
          <h2 className="font-playfair text-5xl md:text-8xl mb-12 tracking-tighter leading-none">בואו נבנה <br /> <span className="italic text-[#c5a35d]">ביחד.</span></h2>
          <div className="space-y-4 text-xl font-light opacity-80">
            <p>058-500-8447</p>
            <p className="uppercase tracking-widest text-sm">office@binyaneitan.com</p>
          </div>
        </div>
        <div className="bg-white p-10 md:p-16 text-black shadow-2xl">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-10">
              <input type="text" name="name" placeholder="שם מלא" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] text-right font-sans" />
              <input type="tel" name="phone" placeholder="טלפון" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] text-right font-sans" />
              <textarea name="message" placeholder="ספרו לנו על הפרויקט..." rows={4} className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] text-right font-sans resize-none"></textarea>
              <button type="submit" className="w-full bg-[#1a1a1a] text-white py-6 text-[11px] tracking-[0.4em] uppercase font-bold hover:bg-[#c5a35d] transition-all">שלח פנייה</button>
            </form>
          ) : (
            <div className="text-center py-20">
              <h3 className="font-playfair text-4xl text-[#c5a35d] mb-4">תודה רבה</h3>
              <p className="text-gray-500">ההודעה התקבלה, נחזור אליכם בהקדם.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function HebrewPage() {
  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <section className="pt-40 pb-20 px-6 md:px-16 max-w-[1440px] mx-auto text-right" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-[#c5a35d] text-xs tracking-[0.3em] font-bold uppercase mb-6 block">Legacy & Precision</span>
          <h1 className="font-playfair text-5xl md:text-9xl leading-[1.1] mb-8">אנחנו בונים עבור <br /> <span className="italic text-[#c5a35d]">הדור הבא.</span></h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light max-w-2xl leading-relaxed">משלד ועד גמר - סטנדרט הנדסי ללא פשרות עבור הקרן למורשת הכותל ולקוחות פרטיים בישראל ובחו"ל.</p>
        </motion.div>
      </section>
      <Portfolio />
      <Reviews />
      <Contact />
      <footer className="py-12 text-center text-[9px] tracking-[0.4em] uppercase text-gray-400 border-t border-black/5">
        © 2026 BINYAN EITAN • ENGINEERING & LUXURY CONSTRUCTION
      </footer>
    </main>
  );
}
