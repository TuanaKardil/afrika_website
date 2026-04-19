import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByRegion } from "@/lib/queries/articles";
import { getRegionBySlug, getRegions } from "@/lib/queries/regions";
import { getCategories } from "@/lib/queries/categories";
import ArticleGrid from "@/components/sections/ArticleGrid";
import CategoryFilter from "@/components/sections/CategoryFilter";
import Pagination from "@/components/sections/Pagination";

interface BolgePageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  const regions = await getRegions();
  return regions.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: BolgePageProps): Promise<Metadata> {
  const region = await getRegionBySlug(params.slug);
  if (!region) return {};
  return {
    title: `${region.name_tr} Haberleri`,
    description: `${region.name_tr} bölgesinden haberler Türkçe olarak.`,
  };
}

export default async function BolgePage({ params, searchParams }: BolgePageProps) {
  const [region, categories] = await Promise.all([
    getRegionBySlug(params.slug),
    getCategories(),
  ]);

  if (!region) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByRegion(params.slug, page);
  const basePath = `/bolge/${params.slug}`;

  return (
    <main className="container mx-auto px-4 py-8">
      <CategoryFilter categories={categories} activeSlug={null} />

      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">
          {region.name_tr} Haberleri
        </h1>
        {count > 0 && (
          <p className="font-body text-sm text-on-surface/50 mt-1">
            {count} haber bulundu
          </p>
        )}
      </header>

      <ArticleGrid articles={articles} />
      <Pagination page={page} total={count} basePath={basePath} />
    </main>
  );
}
