import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import ProjectGalleryClient from "../../../components/ProjectGalleryClient";
import { ALL_PROJECTS, getProjectBySlug, PROJECT_SLUGS } from "../../../../data/projects";

// ── Static generation ──────────────────────────────────────────────────────────

export function generateStaticParams() {
  return PROJECT_SLUGS.map((slug) => ({ slug }));
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const project = getProjectBySlug(params.slug);
  if (!project) return {};

  const { metadata, heroImage, he } = project;
  const canonicalHe = `https://binyaneitan.com/he/projects/${params.slug}`;
  const canonicalEn = `https://binyaneitan.com/en/projects/${params.slug}`;

  return {
    title: metadata.titleHE,
    description: metadata.descriptionHE,
    alternates: {
      canonical: canonicalHe,
      languages: {
        he: canonicalHe,
        en: canonicalEn,
        "x-default": canonicalEn,
      },
    },
    openGraph: {
      title: `${metadata.titleHE} | בניין איתן`,
      description: metadata.descriptionHE,
      url: canonicalHe,
      siteName: "בניין איתן",
      locale: "he_IL",
      type: "article",
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 800,
          alt: `${he.title} — בניין איתן`,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────────────────

function buildJsonLd(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) return null;

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `https://binyaneitan.com/he/projects/${slug}`,
    name: project.he.title,
    description: project.metadata.descriptionHE,
    url: `https://binyaneitan.com/he/projects/${slug}`,
    image: project.heroImage,
    inLanguage: "he",
    creator: {
      "@type": "LocalBusiness",
      name: "בניין איתן בע\"מ",
      url: "https://binyaneitan.com",
    },
    locationCreated: {
      "@type": "Place",
      name: project.he.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: "ירושלים",
        addressCountry: "IL",
      },
    },
    dateCreated: project.dateCompleted,
    keywords: project.he.keyFeatures.join(", "),
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function HeProjectDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const { he, heroImage, galleryImages, num, aspect } = project;
  const jsonLd = buildJsonLd(params.slug);

  const aspectClass =
    aspect === "3/4"
      ? "aspect-[3/4] max-h-[70vh]"
      : aspect === "16/9"
      ? "aspect-[16/9]"
      : "aspect-[4/3]";

  return (
    <main className="bg-bone min-h-screen" dir="rtl">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className={`relative w-full ${aspectClass} max-h-[80vh] overflow-hidden bg-charcoal`}>
        <Image
          src={heroImage}
          alt={`${he.title} — בניין איתן`}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />

        {/* Project number watermark */}
        <span className="absolute bottom-6 end-8 text-[120px] font-light leading-none text-bone/[0.06] select-none">
          {num}
        </span>

        {/* Hero text */}
        <div className="absolute bottom-0 start-0 end-0 px-6 md:px-12 pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent mb-2">
            {he.category}
          </p>
          <h1 className="text-4xl md:text-6xl font-light text-bone leading-tight mb-2">
            {he.title}
          </h1>
          <p className="text-bone/60 font-light text-sm">{he.location}</p>
        </div>
      </section>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 py-4 border-b border-warm-gray-light">
        <nav className="max-w-5xl mx-auto flex items-center gap-2 text-[11px] uppercase tracking-widest text-charcoal/40">
          <Link href="/he" className="hover:text-accent transition-colors">ראשי</Link>
          <span>/</span>
          <Link href="/he/projects" className="hover:text-accent transition-colors">פרויקטים</Link>
          <span>/</span>
          <span className="text-charcoal/70">{he.title}</span>
        </nav>
      </div>

      {/* ── Project meta strip ────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-10 border-b border-warm-gray-light">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">מיקום</p>
            <p className="text-sm font-light text-charcoal">{he.location}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">סוג פרויקט</p>
            <p className="text-sm font-light text-charcoal">{he.projectType}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">היקף</p>
            <p className="text-sm font-light text-charcoal">{he.scope}</p>
          </div>
          {project.dateCompleted && !project.dateCompleted.startsWith("[") && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">הושלם</p>
              <p className="text-sm font-light text-charcoal">{project.dateCompleted}</p>
            </div>
          )}
          {project.projectSize && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">שטח</p>
              <p className="text-sm font-light text-charcoal">{project.projectSize} מ"ר</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Intro paragraph ───────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-14">
        <div className="max-w-3xl mx-auto">
          <p className="text-lg md:text-xl font-light text-charcoal leading-relaxed">
            {he.introParagraph}
          </p>
        </div>
      </section>

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-8 bg-charcoal">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-bone/40 mb-6">
            גלריית פרויקט — {galleryImages.length} תמונות
          </p>
          <ProjectGalleryClient
            images={galleryImages}
            projectTitle={he.title}
            lang="he"
          />
        </div>
      </section>

      {/* ── Challenge & Solution ──────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-16 border-b border-warm-gray-light">
        <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-3">
              אתגר ופתרון
            </p>
            <h2 className="text-3xl font-light text-charcoal leading-snug">
              הסיפור ההנדסי
            </h2>
          </div>
          <div className="md:col-span-8">
            <p className="text-base font-light text-charcoal/75 leading-relaxed">
              {he.challengeAndSolution}
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Features ──────────────────────────────────────────────────── */}
      {he.keyFeatures.some((f) => !f.startsWith("[")) && (
        <section className="px-6 md:px-12 py-12 bg-bone-dark">
          <div className="max-w-5xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-8">מאפיינים מרכזיים</p>
            <ul className="grid sm:grid-cols-2 gap-4">
              {he.keyFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-accent" />
                  <span className="text-sm font-light text-charcoal/80 leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Result ────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-16 border-t border-warm-gray-light">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-4">תוצאה</p>
          <p className="text-xl font-light text-charcoal leading-relaxed">
            {he.resultParagraph}
          </p>
        </div>
      </section>

      {/* ── Navigation between projects ───────────────────────────────────── */}
      <section className="px-6 md:px-12 py-10 border-t border-warm-gray-light bg-bone-dark">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Prev project (RTL: right side = visual start) */}
          {(() => {
            const idx = ALL_PROJECTS.findIndex((p) => p.slug === params.slug);
            const prev = idx > 0 ? ALL_PROJECTS[idx - 1] : null;
            return prev ? (
              <Link
                href={`/he/projects/${prev.slug}`}
                className="flex items-center gap-3 text-sm font-light text-charcoal/60 hover:text-charcoal transition-colors"
              >
                <span className="text-accent">→</span>
                <span>{prev.he.title}</span>
              </Link>
            ) : <span />;
          })()}

          <Link
            href="/he/projects"
            className="text-[10px] uppercase tracking-[0.25em] text-charcoal/40 hover:text-charcoal transition-colors"
          >
            כל הפרויקטים
          </Link>

          {/* Next project */}
          {(() => {
            const idx = ALL_PROJECTS.findIndex((p) => p.slug === params.slug);
            const next = idx < ALL_PROJECTS.length - 1 ? ALL_PROJECTS[idx + 1] : null;
            return next ? (
              <Link
                href={`/he/projects/${next.slug}`}
                className="flex items-center gap-3 text-sm font-light text-charcoal/60 hover:text-charcoal transition-colors"
              >
                <span>{next.he.title}</span>
                <span className="text-accent">←</span>
              </Link>
            ) : <span />;
          })()}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center border-t border-warm-gray-light">
        <p className="text-[11px] uppercase tracking-[0.3em] text-accent mb-4">
          מוכנים להתחיל?
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-charcoal mb-4">
          הפרויקט שלכם הוא הבא
        </h2>
        <p className="text-charcoal/65 font-light mb-8 max-w-md mx-auto leading-relaxed">
          צרו קשר ונבנה יחד משהו שעומד בזמן.
        </p>
        <Link
          href="/he#contact"
          className="inline-block px-10 py-3.5 bg-charcoal text-bone text-xs font-light uppercase tracking-[0.2em] hover:bg-accent transition-colors duration-300"
        >
          צרו קשר
        </Link>
      </section>

      <Footer />
    </main>
  );
}
