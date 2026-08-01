import type { Metadata } from "next";
import Link from "next/link";
import { getSectors } from "@/lib/queries/sectors";
import { getArticlesByNavTab, PAGE_SIZE } from "@/lib/queries/articles";
import { canonicalMeta, titleWithPage, paginatedRobots, paginatedPath } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/sections/Pagination";

/**
 * Shared body for /sektorler and /sektorler/sayfa/[n].
 *
 * The old page declared a `sektor` search param that nothing ever read: the
 * sector pills already link to /sektorler/[slug]. Dropping it, together with
 * `sayfa`, is what lets this route prerender.
 */
export async function sectorsIndexMetadata(page: number): Promise<Metadata> {
  return {
    title: titleWithPage("Sektörler", page),
    description: "Afrika'dan sektörel haberler.",
    ...canonicalMeta(paginatedPath("/sektorler", page)),
    ...paginatedRobots(page),
  };
}

export async function sectorsIndexPageParams() {
  const { count } = await getArticlesByNavTab("sektorler", 1);
  const totalPages = Math.ceil(count / PAGE_SIZE);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    n: String(i + 2),
  }));
}

export default async function SectorsIndex({ page }: { page: number }) {
  const [sectors, { articles, count }] = await Promise.all([
    getSectors(),
    getArticlesByNavTab("sektorler", page),
  ]);

  return (
    <main className="container mx-auto px-4 py-8">
      <Breadcrumb items={[{ name: "Sektörler", href: "/sektorler" }]} />
      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">Sektörler</h1>
      </header>

      {/* Sector grid */}
      <section className="mb-10">
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <Link
              key={sector.slug}
              href={`/sektorler/${sector.slug}`}
              className="shrink-0 px-4 py-1.5 rounded-full font-body text-sm font-medium bg-surface-container text-on-surface/70 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              {sector.name_tr}
            </Link>
          ))}
        </div>
      </section>

      {count > 0 && (
        <p className="font-body text-sm text-on-surface/50 mb-4">{count} haber</p>
      )}
      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath="/sektorler" />
    </main>
  );
}
