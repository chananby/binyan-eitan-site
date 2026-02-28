"use client";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";

export default function EnBehindTheWallsClient() {
  return (
    <main className="relative bg-bone" dir="ltr">
      <Navbar />
      <section className="py-14 md:py-24 px-8 max-w-3xl mx-auto">
        <motion.h1
          className="font-heading text-3xl sm:text-4xl font-bold text-charcoal mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Behind the Walls
        </motion.h1>
        <motion.p className="text-lg text-charcoal/80 mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          Our commitment goes beyond what you see on the surface. Every beam, conduit,
          and pipe is part of a system designed with efficiency, durability, and
          flexibility in mind.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">Infrastructure &amp; Redundancy</motion.h2>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
