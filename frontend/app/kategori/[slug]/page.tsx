import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByCategory } from "@/lib/queries/articles";
import { getCategoryBySlug, getCategories } from "@/lib/queries/categories";
import ArticleGrid from "@/components/sections/ArticleGrid";
import CategoryFilter from "@/components/sections/CategoryFilter";
import Pagination from "@/components/sections/Pagination";

interface KategoriPageProps {
  params: { slug: string };
  searchParams: { sayfa?: string };
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: KategoriPageProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};
  return {
    title: `${category.name_tr} Haberleri`,
    description: `Afrika'dan ${category.name_tr.toLowerCase()} haberleri Turkce olarak.`,
  };
}

export default async function KategoriPage({ params, searchParams }: KategoriPageProps) {
  const [category, categories] = await Promise.all([
    getCategoryBySlug(params.slug),
    getCategories(),
  ]);

  if (!category) notFound();

  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);
  const { articles, count } = await getArticlesByCategory(params.slug, page);
  const basePath = `/kategori/${params.slug}`;

  return (
    <main className="container mx-auto px-4 py-8">
      <CategoryFilter categories={categories} activeSlug={params.slug} />

      <header className="mb-6">
        <h1 className="font-headline text-3xl text-on-surface">
          {category.name_tr} Haberleri
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
