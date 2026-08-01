import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByRegion, PAGE_SIZE } from "@/lib/queries/articles";
import { getRegionBySlug, getRegions } from "@/lib/queries/regions";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";

/**
 * Shared body for /bolge/[slug] and /bolge/[slug]/sayfa/[n].
 *
 * Split so neither route file needs searchParams: reading it (even only in
 * generateMetadata) marks the segment dynamic in Next 14, which is why this
 * route declared generateStaticParams and still prerendered zero pages.
 */
export async function regionMetadata(slug: string, page: number): Promise<Metadata> {
  const region = await getRegionBySlug(slug);
  if (!region) return {};
  return {
    title: titleWithPage(`Son Dakika ${region.name_tr} Haberleri`, page),
    description: `${region.name_tr} bölgesinden güncel haberler. Ekonomi, ticaret ve yatırım gelişmelerini Türkçe takip edin.`,
    ...canonicalMeta(paginatedPath(`/bolge/${slug}`, page)),
    ...paginatedRobots(page),
  };
}

export async function regionSlugs() {
  const regions = await getRegions();
  return regions.map((r) => ({ slug: r.slug }));
}

/** Every (slug, page >= 2) pair, for the paginated twin's generateStaticParams. */
export async function regionPageParams() {
  const regions = await getRegions();
  const params: { slug: string; n: string }[] = [];
  for (const region of regions) {
    const { count } = await getArticlesByRegion(region.slug, 1);
    const totalPages = Math.ceil(count / PAGE_SIZE);
    for (let p = 2; p <= totalPages; p++) params.push({ slug: region.slug, n: String(p) });
  }
  return params;
}

export default async function RegionListing({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const region = await getRegionBySlug(slug);
  if (!region) notFound();

  const { articles, count } = await getArticlesByRegion(slug, page);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: region.name_tr, href: `/bolge/${slug}` }]} />
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">
          Son Dakika {region.name_tr} Haberleri
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>

      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={`/bolge/${slug}`} />
    </main>
  );
}
