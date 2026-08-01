import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSectors, getSectorBySlug } from "@/lib/queries/sectors";
import { getArticlesBySector, PAGE_SIZE } from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";

// Retired sector slugs, kept so old links and indexed URLs keep resolving.
const SECTOR_REDIRECTS: Record<string, string> = {
  "telekomunikasyon": "teknoloji-yazilim",
  "ilac-tibbi-cihaz": "saglik-saglik-turizmi",
  "fintech-dijital-odeme": "teknoloji-yazilim",
  "yenilenebilir-enerji": "enerji",
  "fuarcilik-etkinlik": "sektorler",
};

/**
 * Shared body for /sektorler/[slug] and /sektorler/[slug]/sayfa/[n].
 * Neither route reads searchParams, which is what lets them prerender.
 */
export async function sectorMetadata(slug: string, page: number): Promise<Metadata> {
  const sector = await getSectorBySlug(slug);
  if (!sector) return {};
  return {
    title: titleWithPage(`Afrika'da Son Dakika ${sector.name_tr} Haberleri`, page),
    description: `Afrika ${sector.name_tr.toLowerCase()} sektöründen güncel haberler. Piyasa, yatırım ve sektörel gelişmeler.`,
    ...canonicalMeta(paginatedPath(`/sektorler/${slug}`, page)),
    ...paginatedRobots(page),
  };
}

export async function sectorSlugs() {
  const sectors = await getSectors();
  return sectors.map((s) => ({ slug: s.slug }));
}

export async function sectorPageParams() {
  const sectors = await getSectors();
  const params: { slug: string; n: string }[] = [];
  for (const sector of sectors) {
    const { count } = await getArticlesBySector(sector.slug, 1);
    const totalPages = Math.ceil(count / PAGE_SIZE);
    for (let p = 2; p <= totalPages; p++) params.push({ slug: sector.slug, n: String(p) });
  }
  return params;
}

export default async function SectorListing({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const target = SECTOR_REDIRECTS[slug];
  if (target) redirect(target === "sektorler" ? "/sektorler" : `/sektorler/${target}`);

  const [sector, sectors] = await Promise.all([getSectorBySlug(slug), getSectors()]);
  if (!sector) notFound();

  const { articles, count } = await getArticlesBySector(slug, page);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { name: "Sektörler", href: "/sektorler" },
          { name: sector.name_tr, href: `/sektorler/${slug}` },
        ]}
      />
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">
          Afrika&apos;da Son Dakika {sector.name_tr} Haberleri
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">{count} haber</p>
        )}
      </header>

      {/* Sector filter pills */}
      <nav aria-label="Sektör filtresi" className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/sektorler"
          className="shrink-0 px-4 py-1.5 rounded-full font-body text-sm font-medium bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          Tüm Sektörler
        </Link>
        {sectors.map((s) => (
          <Link
            key={s.slug}
            href={`/sektorler/${s.slug}`}
            className={`shrink-0 px-4 py-1.5 rounded-full font-body text-sm font-medium transition-colors ${
              s.slug === slug
                ? "bg-primary text-white"
                : "bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10"
            }`}
          >
            {s.name_tr}
          </Link>
        ))}
      </nav>

      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={`/sektorler/${slug}`} />
    </main>
  );
}
