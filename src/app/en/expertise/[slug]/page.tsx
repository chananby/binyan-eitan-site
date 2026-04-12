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
    title_en: string;
    intro_en?: string;
    heroImage?: string;
  }>).find((a) => a.slug === params.slug);

  if (!article) {
    return {
      title: "Article Not Found",
      robots: { index: false, follow: false },
    };
  }

  const description = article.intro_en?.slice(0, 160) ?? "";
  const image = article.heroImage ?? "/luxury-interior-finish-transformation.jpg";

  return {
    title: article.title_en,
    description,
    alternates: {
      canonical: `https://binyaneitan.com/en/expertise/${params.slug}`,
      languages: { he: `https://binyaneitan.com/he/expertise/${params.slug}` },
    },
    openGraph: {
      title: article.title_en,
      description,
      url: `https://binyaneitan.com/en/expertise/${params.slug}`,
      siteName: "Binyan Eitan",
      locale: "en_IL",
      type: "article",
      images: [{ url: image, width: 1600, height: 900, alt: article.title_en }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title_en,
      description,
      images: [image],
    },
  };
}

export default function EnExpertiseSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  return <ArticleDetailPage slug={params.slug} />;
}
