import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
  { ssr: false }
);

export default function EnExpertiseSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  return <ArticleDetailPage slug={params.slug} />;
}
