import Image from "next/image";

export default function Home() {
  const projects = [
    { id: 1, title: "Penthouse, Ramat Eshkol", image: "/פנטהאוז רמת אשכול ירושלים/ramat-eshkol.jpg.jpg" },
    { id: 2, title: "Floor Extension, Bayit Vegan", image: "/הרחבת קומה - בית וגן ירושלים/bayit-vegan.jpg.jpg" },
    { id: 3, title: "Amshinov Project", image: "/אמשינוב - ירושלים/amshinov.jpg.jpg" },
    { id: 4, title: "Concrete Sawing & Extension, Ohel Avshalom", image: "/אוהל אבשלום - ניסור והרחבה - ירושלים/ohel-avshalom.jpg.jpg" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans" dir="ltr">
      
      {/* אזור עליון - תפריט ולוגו */}
      <header className="absolute top-0 w-full p-6 flex justify-center md:justify-start items-center z-10 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="relative w-40 h-16 md:w-56 md:h-20">
          <Image 
            src="/logo.jpg" 
            alt="Binyan Eitan Logo" 
            fill 
            className="object-contain"
            priority
          />
        </div>
      </header>

      {/* מסך הפתיחה - Hero Section */}
      <section className="relative pt-36 pb-20 px-6 text-center bg-white shadow-sm mt-16 md:mt-0">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight text-slate-900 mt-8">
          A New Standard of <span className="text-amber-600">Construction in Jerusalem</span>
        </h1>
        <p className="text-xl md:text-2xl max-w-2xl mx-auto text-slate-600 mb-10 leading-relaxed">
          Binyan Eitan specializes in luxury construction, complex extensions, and unique projects, ensuring uncompromising quality, full transparency, and peace of mind for our clients.
        </p>
      </section>

      {/* גלריית הפרויקטים */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center text-slate-900 border-b-2 border-amber-500 inline-block pb-2">
          Our Featured Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {projects.map((project) => (
            <div key={project.id} className="group relative h-80 md:h-[400px] rounded-2xl overflow-hidden shadow-lg bg-white border border-slate-100">
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-2 transition-transform duration-300 group-hover:translate-y-0 text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{project.title}</h3>
                <div className="h-1 w-12 bg-amber-500 rounded mt-3"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* אזור האמון - למה אנחנו */}
      <section className="bg-white py-16 mt-8 border-t border-slate-200 shadow-inner">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <div className="p-6">
            <h4 className="text-2xl font-bold text-slate-900 mb-3 text-amber-600">Uncompromising Quality</h4>
            <p className="text-slate-600 text-lg">Using the finest materials and delivering premium-grade architectural finishes.</p>
          </div>
          <div className="p-6">
            <h4 className="text-2xl font-bold text-slate-900 mb-3 text-amber-600">On-Time Delivery</h4>
            <p className="text-slate-600 text-lg">Meticulous project management ensuring timely handover, with zero excuses.</p>
          </div>
          <div className="p-6">
            <h4 className="text-2xl font-bold text-slate-900 mb-3 text-amber-600">Peace of Mind</h4>
            <p className="text-slate-600 text-lg">Close guidance and personal attention from day one until you receive the keys.</p>
          </div>
        </div>
      </section>

      {/* כפתור ווטסאפ צף */}
      <a
        href="https://wa.me/972500000000" 
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-colors z-50 flex items-center justify-center animate-bounce"
        aria-label="Send WhatsApp message"
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"></path>
        </svg>
      </a>
    </main>
  );
}
