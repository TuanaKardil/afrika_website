import type { Metadata } from "next";
import { getFeaturedArticle, getLatestArticles } from "@/lib/queries/articles";
import { getNavTabs } from "@/lib/queries/nav_tabs";
import HeroSection from "@/components/sections/HeroSection";
import ArticleGrid from "@/components/sections/ArticleGrid";
import CategoryFilter from "@/components/sections/CategoryFilter";
import Pagination from "@/components/sections/Pagination";

export const metadata: Metadata = {
  title: "Afrika Haberleri",
  description: "Afrika'dan son dakika haberleri Türkçe olarak.",
};

interface HomePageProps {
  searchParams: { sayfa?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = Math.max(1, Number(searchParams.sayfa ?? 1) || 1);

  const featured = await getFeaturedArticle();
  const [{ articles, count }, navTabs] = await Promise.all([
    getLatestArticles(page, featured?.id ?? undefined),
    getNavTabs(),
  ]);

  return (
    <>
      {featured && <HeroSection article={featured} />}
      <main className="container mx-auto px-4 py-8">
        <CategoryFilter navTabs={navTabs} activeSlug={null} />
        <ArticleGrid articles={articles} />
        <Pagination page={page} total={count} basePath="/" />
      </main>
    </>
  );
}
