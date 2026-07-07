import type { Metadata } from "next";
import Link from "next/link";
import { getSectors } from "@/lib/queries/sectors";
import { getArticlesByNavTab } from "@/lib/queries/articles";
import { canonicalMeta, parsePageParam, titleWithPage } from "@/lib/seo";
import ArticleGrid from "@/components/sections/ArticleGrid";
import Pagination from "@/components/sections/Pagination";

interface SektorlerPageProps {
  searchParams: { sayfa?: string; sektor?: string };
}

export async function generateMetadata({ searchParams }: SektorlerPageProps): Promise<Metadata> {
  const page = parsePageParam(searchParams.sayfa);
  return {
    title: titleWithPage("Sektörler", page),
    description: "Afrika'dan sektörel haberler.",
    ...canonicalMeta("/sektorler", { sayfa: String(page) }),
  };
}

export default async function SektorlerPage({ searchParams }: SektorlerPageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const sectors = await getSectors();
  const { articles, count } = await getArticlesByNavTab("sektorler", page);

  return (
    <main className="container mx-auto px-4 py-8">
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
