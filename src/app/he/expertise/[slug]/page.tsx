import loadDynamic from "next/dynamic";
import type { Metadata } from "next";
import translations from "@/src/lib/translations.json";

export const dynamic = "force-dynamic";

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = (translations.articles as Array<{
    slug: string;
    title_he: string;
    intro_he?: string;
    heroImage?: string;
  }>).find((a) => a.slug === params.slug);

  if (!article) {
    return {
      title: "מאמר לא נמצא",
      robots: { index: false, follow: false },
    };
  }

  const description = article.intro_he?.slice(0, 160) ?? "";
  const image = article.heroImage ?? "/luxury-interior-finish-transformation.jpg";

  return {
    title: article.title_he,
    description,
    alternates: {
      canonical: `https://binyaneitan.com/he/expertise/${params.slug}`,
      languages: { en: `https://binyaneitan.com/en/expertise/${params.slug}` },
    },
    openGraph: {
      title: article.title_he,
      description,
      url: `https://binyaneitan.com/he/expertise/${params.slug}`,
      siteName: "בניין איתן",
      locale: "he_IL",
      type: "article",
      images: [{ url: image, width: 1600, height: 900, alt: article.title_he }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title_he,
      description,
      images: [image],
    },
  };
}

export default function HeExpertiseSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  return <ArticleDetailPage slug={params.slug} />;
}
