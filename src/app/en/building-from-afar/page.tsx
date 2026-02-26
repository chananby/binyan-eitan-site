import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Building in Israel from Afar | Binyan Eitan",
  description: "Managing projects across a 7-hour difference with daily reports and international material integration.",
  robots: "noindex, nofollow",
};

export default function BuildingFromAfarEN() {
  return (
    <main className="relative bg-bone" dir="ltr">
      <Navbar />
      <section className="py-24 px-8 max-w-3xl mx-auto">
        <motion.h1
          className="font-heading text-4xl font-bold text-charcoal mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Building in Israel from Afar
        </motion.h1>
        <motion.p
          className="text-lg text-charcoal/80 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Working across a seven-hour time difference doesn’t have to be a barrier.
          We provide daily progress reports, clear communication, and full transparency to clients in Europe and the Americas.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              Daily Reports &amp; Communication
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Expect a detailed update every 24 hours, with photos, status, and any decisions required. We adapt our schedule to align with your daytime, ensuring you're never out of the loop.
            </motion.p>
          </div>
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              International Material Integration
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              We specialize in importing and integrating premium materials from abroad — stone, glass, fixtures, and systems — coordinating logistics and handling local compliance so your vision is executed seamlessly.
            </motion.p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
