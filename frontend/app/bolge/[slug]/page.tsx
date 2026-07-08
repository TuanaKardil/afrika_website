import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByRegion } from "@/lib/queries/articles";
import { getRegionBySlug, getRegions } from "@/lib/queries/regions";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";

interface BolgePageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  const regions = await getRegions();
  return regions.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params, searchParams }: BolgePageProps): Promise<Metadata> {
  const region = await getRegionBySlug(params.slug);
  if (!region) return {};
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage(`Son Dakika ${region.name_tr} Haberleri`, page),
    description: `${region.name_tr} bölgesinden güncel haberler. Ekonomi, ticaret ve yatırım gelişmelerini Türkçe takip edin.`,
    ...canonicalMeta(`/bolge/${params.slug}`, { sayfa: String(page) }),
  };
}

export default async function BolgePage({ params, searchParams }: BolgePageProps) {
  const region = await getRegionBySlug(params.slug);

  if (!region) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByRegion(params.slug, page);
  const basePath = `/bolge/${params.slug}`;

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: region.name_tr, href: `/bolge/${params.slug}` }]} />
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">
          Son Dakika {region.name_tr} Haberleri
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>

      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
