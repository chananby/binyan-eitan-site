"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "../TranslationsProvider";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
  hover: {
    y: -8,
    transition: {
      duration: 0.3,
    },
  },
};

const projectImages = [
  "gradient-from-[#8D775F] to-[#A89B87]",
  "gradient-from-[#B8A390] to-[#8D775F]",
];

export default function HeProjectsClient() {
  const t = useTranslations("projects", "he");
  const tt = t as Record<string, string>;

  const projects = [0, 1].map((i) => ({
    id: i + 1,
    title: tt[`proj_${i}_title`] ?? "",
    category: tt[`proj_${i}_category`] ?? "",
    description: tt[`proj_${i}_description`] ?? "",
    features: [0, 1, 2].map((f) => tt[`proj_${i}_feature_${f}`] ?? "").filter(Boolean),
    image: projectImages[i],
  }));

  return (
    <main className="relative" dir="rtl">
      <Navbar />

      {/* Hero Section */}
      <section
        className="min-h-[40vh] flex items-center justify-center pt-24"
        style={{ backgroundColor: "#F3F2EE" }}
      >
        <motion.div
          className="text-center px-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1
            className="text-5xl md:text-6xl font-light mb-4"
            style={{ color: "#2D2926" }}
          >
            {t.pageTitle}
          </h1>
          <p
            className="text-lg md:text-xl font-light mb-8"
            style={{ color: "#2D2926" }}
          >
            {t.subtitle}
          </p>
          <Link
            href="/he"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-sm transition-all duration-300 hover:gap-3"
            style={{
              backgroundColor: "#8D775F",
              color: "#F3F2EE",
            }}
          >
            {t.backToHome}
            <ChevronLeft size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Projects Grid */}
      <section
        className="py-20 px-4 md:px-8"
        style={{ backgroundColor: "#F3F2EE" }}
      >
        <motion.div
          className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {projects.map((project) => (
            <motion.div
              key={project.id}
              className="rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300"
              style={{ backgroundColor: "#FFFFFF" }}
              variants={cardVariants}
              whileHover="hover"
            >
              {/* Image/Gradient Section */}
              <motion.div
                className={`h-64 bg-gradient-to-br ${project.image}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              />

              {/* Content Section */}
              <div className="p-8">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p
                    className="text-sm font-semibold lowercase tracking-widest mb-2"
                    style={{ color: "#8D775F" }}
                  >
                    {project.category}
                  </p>
                  <h2
                    className="text-3xl font-light mb-3"
                    style={{ color: "#2D2926" }}
                  >
                    {project.title}
                  </h2>
                  <p
                    className="text-base font-light mb-6 leading-relaxed"
                    style={{ color: "#2D2926" }}
                  >
                    {project.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    <p
                      className="text-sm font-semibold uppercase tracking-widest"
                      style={{ color: "#8D775F" }}
                    >
                      {t.featuresLabel}
                    </p>
                    <ul className="space-y-2">
                      {project.features.map((feature, idx) => (
                        <motion.li
                          key={idx}
                          className="flex items-start gap-3"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.1 }}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: "#8D775F" }}
                          />
                          <span
                            className="text-sm font-light"
                            style={{ color: "#2D2926" }}
                          >
                            {feature}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    className="w-full py-3 rounded-sm font-light tracking-widest transition-all duration-300 hover:opacity-90"
                    style={{
                      backgroundColor: "#8D775F",
                      color: "#F3F2EE",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t.learnMore}
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <motion.section
        className="py-20 px-4 md:px-8"
        style={{ backgroundColor: "#F3F2EE" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2
            className="text-4xl font-light mb-6"
            style={{ color: "#2D2926" }}
          >
            {t.ctaHeading}
          </h2>
          <p
            className="text-lg font-light mb-8"
            style={{ color: "#2D2926" }}
          >
            {t.ctaSub}
          </p>
          <Link
            href="/he#contact"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-sm transition-all duration-300 hover:gap-3"
            style={{
              backgroundColor: "#8D775F",
              color: "#F3F2EE",
            }}
          >
            {t.ctaButton}
            <ChevronLeft size={18} />
          </Link>
        </motion.div>
      </motion.section>

      <Footer />
    </main>
  );
}
