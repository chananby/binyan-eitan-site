import loadDynamic from "next/dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerArticleBySlug, isArticlePublic } from "@/src/lib/server-translations";
import { isAdminAuthed, isInternalAuthed } from "@/src/lib/admin-auth";

export const dynamic = "force-dynamic";

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage")
);

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const article = await getServerArticleBySlug(params.slug);

  if (!article) {
    return {
      title: "Article Not Found",
      robots: { index: false, follow: false },
    };
  }

  const description = (article.intro_en ?? "").slice(0, 160);
  const image = article.heroImage ?? "/luxury-interior-finish-transformation.jpg";
  const title = article.title_en ?? "";

  // Drafts are never indexed even when previewed by an authed editor.
  const noindex = !isArticlePublic(article);

  return {
    title,
    description,
    robots: noindex ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: `https://binyaneitan.com/en/expertise/${params.slug}`,
      languages: { he: `https://binyaneitan.com/he/expertise/${params.slug}` },
    },
    openGraph: {
      title,
      description,
      url: `https://binyaneitan.com/en/expertise/${params.slug}`,
      siteName: "Binyan Eitan",
      locale: "en_IL",
      type: "article",
      images: [{ url: image, width: 1600, height: 900, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function EnExpertiseSlugPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const article = await getServerArticleBySlug(params.slug);
  if (!article) notFound();

  // Drafts (published === false) and archived articles are only viewable by
  // authed admins/internal users for preview purposes. Everyone else gets 404.
  if (!isArticlePublic(article)) {
    const authed = (await isAdminAuthed()) || (await isInternalAuthed());
    if (!authed) notFound();
  }

  return <ArticleDetailPage slug={params.slug} />;
}
