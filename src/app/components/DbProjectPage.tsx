/**
 * Slim project page, generated automatically from a gallery_projects row.
 *
 * Used for projects Chanan adds in the admin, which have no hand-written page
 * in src/data/projects. It shows only what the gallery form already captures —
 * title, category label, description and the project's images — so adding a
 * project never requires filling in anything extra.
 *
 * Deliberately mirrors the rich page's visual language (bone background, hero
 * with gradient + overlaid category/title, breadcrumb, dark gallery band) and
 * REUSES ProjectGalleryClient for the lightbox rather than inventing another.
 * Server component; the only client part is the shared lightbox.
 */

import Image from "next/image";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProjectGalleryClient from "./ProjectGalleryClient";
import type { DbProjectPageData } from "../../lib/gallery-project-page";

const COPY = {
  he: {
    home: "ראשי",
    projects: "פרויקטים",
    galleryLabel: (n: number) => `גלריית פרויקט — ${n} תמונות`,
    back: "← חזרה לכל הפרויקטים",
  },
  en: {
    home: "Home",
    projects: "Projects",
    galleryLabel: (n: number) => `Project gallery — ${n} images`,
    back: "← Back to all projects",
  },
} as const;

export default function DbProjectPage({
  project,
  lang,
}: {
  project: DbProjectPageData;
  lang: "he" | "en";
}) {
  const t = COPY[lang];
  const dir = lang === "he" ? "rtl" : "ltr";
  const homeHref = `/${lang}`;
  const projectsHref = `/${lang}/projects`;

  // Shape the DB urls into the lightbox's expected input. Alt text falls back
  // to "<title> — image N" inside the component, so no per-image alt is needed.
  const galleryImages = project.images.map((src) => ({ src }));

  return (
    <main className="bg-bone min-h-screen" dir={dir}>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative w-full aspect-[4/3] max-h-[80vh] overflow-hidden bg-charcoal">
        <Image
          src={project.cover}
          alt={`${project.title} — ${lang === "he" ? "בניין איתן" : "Binyan Eitan"}`}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
        <div className="absolute bottom-0 start-0 end-0 px-6 md:px-12 pb-10">
          {project.category && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent mb-2">
              {project.category}
            </p>
          )}
          <h1 className="text-4xl md:text-6xl font-light text-bone leading-tight">
            {project.title}
          </h1>
        </div>
      </section>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-4 border-b border-warm-gray-light">
        <nav className="max-w-5xl mx-auto flex items-center gap-2 text-[11px] uppercase tracking-widest text-charcoal/40">
          <Link href={homeHref} className="hover:text-accent transition-colors">{t.home}</Link>
          <span>/</span>
          <Link href={projectsHref} className="hover:text-accent transition-colors">{t.projects}</Link>
          <span>/</span>
          <span className="text-charcoal/70">{project.title}</span>
        </nav>
      </div>

      {/* ── Description ───────────────────────────────────────────────────── */}
      {project.description && (
        <section className="px-6 md:px-12 py-14">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg md:text-xl font-light text-charcoal leading-relaxed">
              {project.description}
            </p>
          </div>
        </section>
      )}

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-8 bg-charcoal">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-bone/40 mb-6">
            {t.galleryLabel(galleryImages.length)}
          </p>
          <ProjectGalleryClient
            images={galleryImages}
            projectTitle={project.title}
            lang={lang}
          />
        </div>
      </section>

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-14 text-center">
        <Link
          href={projectsHref}
          className="inline-block px-10 py-3.5 bg-charcoal text-bone text-xs font-light uppercase tracking-[0.2em] hover:bg-accent transition-colors duration-300"
        >
          {t.back}
        </Link>
      </section>

      <Footer />
    </main>
  );
}
