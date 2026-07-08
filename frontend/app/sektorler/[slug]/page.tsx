import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSectors, getSectorBySlug } from "@/lib/queries/sectors";

const SECTOR_REDIRECTS: Record<string, string> = {
  "telekomunikasyon":    "teknoloji-yazilim",
  "ilac-tibbi-cihaz":   "saglik-saglik-turizmi",
  "fintech-dijital-odeme": "teknoloji-yazilim",
  "yenilenebilir-enerji": "enerji",
  "fuarcilik-etkinlik": "sektorler",
};
import { getArticlesBySector } from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";
import Breadcrumb from "@/components/ui/Breadcrumb";

interface SektorSlugPageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  const sectors = await getSectors();
  return sectors.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params, searchParams }: SektorSlugPageProps): Promise<Metadata> {
  const sector = await getSectorBySlug(params.slug);
  if (!sector) return {};
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage(`Afrika'da Son Dakika ${sector.name_tr} Haberleri`, page),
    description: `Afrika ${sector.name_tr.toLowerCase()} sektöründen güncel haberler. Piyasa, yatırım ve sektörel gelişmeler.`,
    ...canonicalMeta(`/sektorler/${params.slug}`, { sayfa: String(page) }),
  };
}

export default async function SektorSlugPage({ params, searchParams }: SektorSlugPageProps) {
  const target = SECTOR_REDIRECTS[params.slug];
  if (target) redirect(target === "sektorler" ? "/sektorler" : `/sektorler/${target}`);

  const [sector, sectors] = await Promise.all([
    getSectorBySlug(params.slug),
    getSectors(),
  ]);

  if (!sector) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesBySector(params.slug, page);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { name: "Sektörler", href: "/sektorler" },
          { name: sector.name_tr, href: `/sektorler/${params.slug}` },
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
              s.slug === params.slug
                ? "bg-primary text-white"
                : "bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10"
            }`}
          >
            {s.name_tr}
          </Link>
        ))}
      </nav>

      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={`/sektorler/${params.slug}`} />
    </main>
  );
}
