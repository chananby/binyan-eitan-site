import type { Metadata } from "next";
import LPTemplate, { type LPData } from "../LPTemplate";

export const metadata: Metadata = {
  title: "Overseas Property Management & Construction in Israel | Binyan Eitan",
  description:
    "Building your dream home in Israel from afar with total transparency, fixed budgets, and international standards.",
  alternates: {
    canonical: "https://binyaneitan.com/lp/overseas",
  },
  openGraph: {
    title: "Build Your Dream Home in Israel | Binyan Eitan",
    description:
      "Building your dream home in Israel from afar with total transparency, fixed budgets, and international standards.",
    url: "https://binyaneitan.com/lp/overseas",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "website",
    images: [{ url: "/amshinov-1.jpg", width: 1200, height: 800, alt: "Luxury construction in Israel" }],
  },
  twitter: { card: "summary_large_image" },
};

const WHATSAPP =
  "https://wa.me/972585008447?text=Hi%20Moti%2C%20I%20found%20your%20Overseas%20page%20and%20would%20like%20to%20discuss%20building%20in%20Israel...";

const data: LPData = {
  dir: "ltr",
  heroImage: "/luxury-interior.jpg",
  heroImageAlt: "Luxury interior construction in Israel by Binyan Eitan",
  breakImage: "/amshinov-1.jpg",
  badge: "Binyan Eitan — G1 Licensed Contractor",
  headingLine1: "Building Your Dream in Israel,",
  headingAccent: "with Integrity You Can Trace.",
  heroSub:
    "Building or renovating a home in Israel from thousands of miles away requires more than just a contractor — it requires a trusted partner on the ground.",
  heroCta: "Let's Build Your Dream",
  trustBar: [
    { value: "20+", label: "Years Experience" },
    { value: "150+", label: "Projects Completed" },
    { value: "G1", label: "Licensed Contractor" },
    { value: "5.0★", label: "Google Rating" },
  ],
  introLabel: "Our Approach",
  introText:
    "Building or renovating a home in Israel from thousands of miles away requires more than just a contractor — it requires a partner who is your eyes and ears on the ground. At Binyan Eitan, we specialize in bridging the gap between your international expectations and local Israeli execution, ensuring every detail is handled with transparency and care.",
  pillarsTitle: "What Sets Us Apart",
  pillars: [
    {
      num: "01",
      title: "Full Transparency",
      desc: "Constant reports, photos, and video updates that keep you in the loop as if you were standing on-site every day.",
    },
    {
      num: "02",
      title: "Fixed & Honest Budgeting",
      desc: "We provide a detailed, clear quote with zero hidden surprises. The price we agree on is the price you pay.",
    },
    {
      num: "03",
      title: "Complete Logistics Management",
      desc: "From architects to local suppliers, we manage the entire ecosystem so you don't have to deal with the bureaucracy.",
    },
  ],
  breakQuote: "Engineering beyond the surface. Precision you can measure, transparency you can trust.",
  ctaLabel: "Start Today",
  ctaTitle: "Let's Build Your Dream.",
  ctaDesc:
    "Get a free personal consultation with Moti Eitan. We bridge the distance and keep you in control every step of the way.",
  ctaBtn: "WhatsApp Us Now",
  ctaNote: "Or call:",
  phoneTel: "+97225000447",
  footerLegal: `© ${new Date().getFullYear()} Binyan Eitan Ltd. G1 Registered Contractor — License #41805 | Jerusalem, Israel`,
  mainSiteHref: "/en",
  mainSiteLabel: "Visit Main Site →",
  whatsappUrl: WHATSAPP,
};

export default function OverseasPage() {
  return <LPTemplate d={data} />;
}
