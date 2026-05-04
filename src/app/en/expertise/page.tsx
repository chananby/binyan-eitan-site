import ExpertiseArticle from "../../components/ExpertiseArticle";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luxury Construction & Engineering in Israel",
  description:
    "Building in Israel from abroad? Binyan Eitan is a G1 registered contractor bringing elite engineering and transparent project management to international clients.",
  alternates: {
    canonical: "https://binyaneitan.com/en/expertise",
    languages: { he: "https://binyaneitan.com/he/expertise" },
  },
  openGraph: {
    title: "Binyan Eitan | Building Your Israeli Property",
    description:
      "Building in Israel from abroad? Binyan Eitan is a G1 registered contractor bringing elite engineering and transparent project management to international clients.",
    url: "https://binyaneitan.com/en/expertise",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [{ url: "/luxury-interior-finish-transformation.jpg", width: 1600, height: 900, alt: "Binyan Eitan — Luxury Construction & Engineering in Israel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Binyan Eitan | Luxury Construction & Engineering in Israel",
    description:
      "Building in Israel from abroad? Binyan Eitan is a G1 registered contractor with 20+ years of elite engineering experience.",
    images: ["/luxury-interior-finish-transformation.jpg"],
  },
};

const expertiseListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Professional Knowledge | Binyan Eitan",
  description: "Expert articles by Binyan Eitan on construction, renovation, and project management in Israel",
  url: "https://binyaneitan.com/en/expertise",
  inLanguage: "en-US",
  itemListElement: [
    { "@type": "ListItem", position: 1,  url: "https://binyaneitan.com/en/expertise/g1-contractor-certification",     name: "Registered Contractor: What the Certificate on the Wall Actually Means" },
    { "@type": "ListItem", position: 2,  url: "https://binyaneitan.com/en/expertise/building-from-abroad",            name: "Seamless Sovereignty: Building in Israel from Abroad" },
    { "@type": "ListItem", position: 3,  url: "https://binyaneitan.com/en/expertise/behind-the-walls",               name: "Behind the Walls: The Invisible Standard of Excellence" },
    { "@type": "ListItem", position: 4,  url: "https://binyaneitan.com/en/expertise/reading-a-professional-quote",   name: "Beyond the Price Tag: How to Evaluate a Professional Quote" },
    { "@type": "ListItem", position: 5,  url: "https://binyaneitan.com/en/expertise/after-handover",                 name: "The Handover: Your Roadmap to Long-Term Peace of Mind" },
    { "@type": "ListItem", position: 6,  url: "https://binyaneitan.com/en/expertise/floor-infrastructure",           name: "What Lies Beneath: The Floor Infrastructure Nobody Talks About" },
    { "@type": "ListItem", position: 7,  url: "https://binyaneitan.com/en/expertise/how-to-avoid-renovation-mistakes", name: "How to Avoid Critical Renovation Mistakes" },
    { "@type": "ListItem", position: 8,  url: "https://binyaneitan.com/en/expertise/building-private-home",          name: "Building a Private Home from Scratch — Everything You Need to Know" },
    { "@type": "ListItem", position: 9,  url: "https://binyaneitan.com/en/expertise/foundation-reinforcement",       name: "Foundation and Structural Reinforcement — When It's Necessary and How to Do It Right" },
    { "@type": "ListItem", position: 10, url: "https://binyaneitan.com/en/expertise/choosing-a-contractor",          name: "How to Choose a Contractor — The Guide That Will Save You Costly Mistakes" },
    { "@type": "ListItem", position: 11, url: "https://binyaneitan.com/en/expertise/renovating-while-living",        name: "Renovating While Living at Home — What You Need to Know Before You Start" },
  ],
};

export default function EnExpertisePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(expertiseListSchema) }}
      />
      <ExpertiseArticle />
    </>
  );
}
