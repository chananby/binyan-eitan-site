"use client";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export default function MaintenanceEnglish() {
  return (
    <motion.main
      className="min-h-screen flex flex-col items-center justify-center bg-stone-100 text-charcoal p-4"
      dir="ltr"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.h1
        className="text-4xl font-heading font-bold mb-4 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Binyan Eitan - Engineering &amp; Construction | Led by Moti Eitan
      </motion.h1>

      <motion.p
        className="text-lg mb-10 text-center max-w-xl"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Our new site is under construction, showcasing our complex engineering and luxury projects. In the meantime, we are available for any inquiries.
      </motion.p>

      <div className="flex flex-col sm:flex-row gap-4">
        <motion.a
          href="tel:+972525000447"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#8D775F] text-white rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Call Us: <span dir="ltr" className="inline-block">+972‑52‑500‑0447</span>
        </motion.a>

        <motion.a
          href="https://wa.me/972585008447"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#8D775F] text-white rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle className="mr-2" /> WhatsApp
        </motion.a>
      </div>
    </motion.main>
  );
}


