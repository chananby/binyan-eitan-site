"use client";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Behind the Walls | Binyan Eitan",
  description: "An in-depth look at our engineering standards, infrastructure planning, and precision execution.",
  robots: "noindex, nofollow",
};

export default function BehindTheWallsEN() {
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
          Behind the Walls
        </motion.h1>
        <motion.p
          className="text-lg text-charcoal/80 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Our commitment goes beyond what you see on the surface. Every beam, conduit,
          and pipe is part of a system designed with efficiency, durability, and
          flexibility in mind.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              Infrastructure &amp; Redundancy
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80 mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              We plan all electrical, water, and HVAC infrastructure from day one. We offer
              infrastructure planning with the option for redundancy so that critical
              systems never go down, giving you peace of mind in any scenario.
            </motion.p>

            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              Absolute Engineering Precision
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Our teams work with dimensions accurate to the millimeter and tolerances
              you can rely on. This level of precision is what turns complex designs into
              flawless reality.
            </motion.p>
          </div>
          <div>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Whether you're building a luxury villa or a commercial structure, we start
              with the unseen and build outward. That's what "behind the walls" really
              means to us.
            </motion.p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
